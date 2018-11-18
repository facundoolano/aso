'use strict';

const R = require('ramda');
const buildGetKeywords = require('../app');
const calc = require('../calc');

// weights to merge all stats into a single score
const TITLE_W = 4;
const COMPETITOR_W = 3;
const INSTALLS_W = 5;
const RATING_W = 2;
const AGE_W = 1;

function build (store) {
  function getMatchType (keyword, title) {
    keyword = keyword.toLowerCase();
    title = title.toLowerCase();

    if (title.includes(keyword)) {
      return 'exact';
    }
    const matches = keyword.split(' ').map((word) => title.includes(word));
    if (R.all(R.identity, matches)) {
      return 'broad';
    }
    if (R.any(R.identity, matches)) {
      return 'partial';
    }
    return 'none';
  }

  /*
  * Score the amount of exact, broad, partial and none matches for the keyword in
  * the given apps titles.
  */
  function getTitleMatches (keyword, apps) {
    const matches = R.pluck('title', apps).map((app) => getMatchType(keyword, app));
    const counts = {
      exact: R.filter(R.equals('exact'), matches).length,
      broad: R.filter(R.equals('broad'), matches).length,
      partial: R.filter(R.equals('partial'), matches).length,
      none: R.filter(R.equals('none'), matches).length
    };

    const score = (10 * counts.exact + 5 * counts.broad + 2.5 * counts.partial) / apps.length;
    return R.assoc('score', score, counts);
  }

  function isCompetitor (keyword, app) {
    return buildGetKeywords(store)(app).then((kws) => R.contains(keyword, kws.slice(0, 10)));
  }

  /*
  * Score the amount apps that have the keyword as one of their top keywords in
  * their description.
  */
  function getCompetitors (keyword, apps) {
    return Promise.all(apps.map((app) => isCompetitor(keyword, app)))
      .then(R.filter(R.identity))
      .then(R.length)
      .then((count) => ({count, score: calc.zScore(apps.length, count)}));
  }

  /*
  * Score the average rating among the top apps.
  */
  function getRating (keyword, apps) {
    const avg = R.sum(apps.map((app) => app.score || 0)) / apps.length;
    return {
      avg,
      score: avg * 2
    };
  }

  function getDaysSince (date) {
    if (typeof date === 'string') {
      date = Date.parse(date);
    } else {
      date = date / 1000;
    }
    return Math.floor((Date.now() - date) / 86400000);
  }

  /*
  * Score the average time since last update among the top apps.
  */
  function getAge (keyword, apps) {
    // FIXME this is a number in google play now
    const updated = R.pluck('updated', apps).map(getDaysSince);
    const avg = R.sum(updated) / apps.length;
    const max = 500;
    const score = calc.izScore(max, avg);

    return {
      avgDaysSinceUpdated: avg,
      score
    };
  }

  /*
  * Calculate an aggregate score according to each stat's weight.
  */
  function getScore (stats) {
    return calc.aggregate([TITLE_W, COMPETITOR_W, INSTALLS_W, RATING_W, AGE_W],
                          [stats.titleMatches.score, stats.competitors.score,
                           stats.installs.score, stats.rating.score, stats.age.score]);
  }

  /*
  * Return the promise of an object with stats and scores of the difficulty of
  * the given keyword.
  */
  return function (keyword, apps) {
    return getCompetitors(keyword, apps) // gimme freakin destructuring
      .then(function (competitors) {
        const topApps = apps.slice(0, 10);
        return {
          titleMatches: getTitleMatches(keyword, topApps),
          competitors,
          installs: store.getInstallsScore(topApps),
          rating: getRating(keyword, topApps),
          age: getAge(keyword, topApps)
        };
      })
    .then((stats) => R.assoc('score', getScore(stats), stats));
  };
}

module.exports = build;
