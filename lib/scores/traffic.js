'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const calc = require('../calc');
const getInstalls = require('./installs');

const MAX_KEYWORD_LENGTH = 25;

// weights to merge all stats into a single score
const SUGGEST_W = 8;
const RANKED_W = 3;
const INSTALLS_W = 2;
const LENGTH_W = 1;

function getSuggestLength (keyword, length) {
  length = length || 1;
  if (length > Math.min(keyword.length, MAX_KEYWORD_LENGTH)) {
    return Promise.resolve({
      length: undefined,
      index: undefined
    });
  }

  const prefix = keyword.slice(0, length);
  return gplay.suggest(prefix)
    .then(function (suggestions) {
      const index = suggestions.indexOf(keyword);
      if (index === -1) {
        return getSuggestLength(keyword, length + 1);
      }
      return { length, index };
    });
}

/*
* Score the amount of characters are needed for the keyword to come up as a
* suggestion in the google play search box.
*/
function getSuggest (keyword) {
  return getSuggestLength(keyword)
    .then(function (lengthStats) {
      let score;
      if (!lengthStats.length) {
        score = 0;
      } else {
        const lengthScore = calc.iScore(1, MAX_KEYWORD_LENGTH, lengthStats.length);
        const indexScore = calc.izScore(4, lengthStats.index);
        score = calc.aggregate([10, 1], [lengthScore, indexScore]);
      }
      return R.assoc('score', score, lengthStats);
    });
}

/*
* Score the length of the keyword (less traffic is assumed for longer keywords).
*/
function getKeywordLength (keyword) {
  const length = keyword.length;
  return {
    length,
    score: calc.iScore(1, MAX_KEYWORD_LENGTH, length)
  };
}

/*
* For each of the keyword's top apps, get the ranking for its category and check
* what rank (if any) it has in that list.
*/
function getRankedApps (apps) {
  const getCollection = (app) => app.free ? gplay.collection.TOP_FREE : gplay.collection.TOP_PAID;
  const toQuery = (app) => ({
    collection: getCollection(app),
    category: app.genreId,
    num: 120
  });

  function findRank (list, app) {
    return (list.indexOf(app.appId) + 1) || undefined;
  }

  const queries = R.uniq(apps.map(toQuery));
  const queryIndex = queries.map((q) => [q.collection, q.category]);
  return Promise.all(queries.map(gplay.list))
    .then(R.map(R.map(R.prop('appId'))))
    .then(R.zipObj(queryIndex))
    .then(function (listMap) {
      // for each app, get its collection/category list and find its rank in there
      const findList = (app) => listMap[[getCollection(app), app.genreId]];
      return apps.map((app) => findRank(findList(app), app));
    })
    .then(R.reject(R.isNil))
    .then(function (results) {
      if (!results.length) {
        return {count: 0, avgRank: undefined, score: 1};
      }

      const stats = {
        count: results.length,
        avgRank: R.sum(results) / results.length
      };

      const countScore = calc.zScore(apps.length, stats.count);
      const avgRankScore = calc.iScore(1, 100, stats.avgRank);
      const score = calc.aggregate([5, 1], [countScore, avgRankScore]);
      return R.assoc('score', score, stats);
    });
}

function getScore (stats) {
  return calc.aggregate([SUGGEST_W, LENGTH_W, INSTALLS_W, RANKED_W],
                        [stats.suggest.score, stats.length.score,
                         stats.installs.score, stats.ranked.score]);
}

function getTraffic (keyword, apps) {
  const topApps = apps.slice(0, 10);
  return Promise.all([
    getRankedApps(topApps),
    getSuggest(keyword)
  ])
  .then(function (results) {
    const ranked = results[0];
    const suggest = results[1];

    return {
      suggest,
      ranked,
      installs: getInstalls(keyword, topApps),
      length: getKeywordLength(keyword)
    };
  })
  .then((stats) => R.assoc('score', getScore(stats), stats));
}

module.exports = getTraffic;
