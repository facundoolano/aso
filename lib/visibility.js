'use strict';

const R = require('ramda');
const buildGetKeywords = require('./app');
const buildGetTraffic = require('./scores/traffic');
const calc = require('./calc');

const findRank = (list, app) => (R.pluck('appId', list).indexOf(app.appId) + 1) || undefined;
const rankScore = (weight, listSize, rank) => rank ? calc.round(weight * calc.iScore(1, listSize, rank)) : 0;

const getScore = (stats) => calc.round(
  R.sum(R.pluck('score', R.values(stats.keywords))) +
  stats.collections.global.score +
  stats.collections.category.score
);

function build (store) {
  // FIXME refactor all this

  const buildKeywordScores = (ranks, trafficStats) => trafficStats.map((traffic, index) => ({
    traffic: traffic.score,
    rank: ranks[index],
    score: rankScore(traffic.score, store.MAX_SEARCH, ranks[index])
  }));

  const getTraffic = buildGetTraffic(store);

  const keywordToList = (kw) => store.search({
    term: kw,
    num: store.MAX_SEARCH,
    fullDetail: true
  });

  // get top 20 keywords
  // get app ranking for each keyword
  // filter out non ranked
  // get stats for remaining kws
  // score rank * kw traffic score
  const getKeywordScores = (app) =>
    buildGetKeywords(store)(app)
      .then(R.slice(0, 20))
      .then((kws) =>
        Promise.all(kws.map(keywordToList))
        .then((lists) => R.zipObj(kws, lists.map((list) => ({rank: findRank(list, app), list})))))
      .then(R.reject((kwObj) => R.isNil(kwObj.rank)))
      .then((kwObjs) => {
        const promises = R.values(R.mapObjIndexed((obj, kw) => getTraffic(kw, obj.list), kwObjs));
        return Promise.all(promises)
          .then((trafficStats) => buildKeywordScores(R.pluck('rank', R.values(kwObjs)), trafficStats))
          .then(R.zipObj(R.keys(kwObjs)));
      });

  function getCollectionScores (app) {
    const categoryQuery = store.getCollectionQuery(app);
    const globalQuery = R.dissoc('category', categoryQuery);

    return Promise.all([
      store.list(globalQuery),
      store.list(categoryQuery)
    ])
    .then(R.map((list) => findRank(list, app)))
    .then((ranks) => ({
      global: {
        rank: ranks[0],
        score: rankScore(100, store.MAX_LIST, ranks[0])
      },
      category: {
        rank: ranks[1],
        score: rankScore(10, store.MAX_LIST, ranks[1])
      }
    }));
  }

  return (appId) => store.app({appId})
    .then((app) => Promise.all([
      getKeywordScores(app),
      getCollectionScores(app)
    ]))
    .then((scores) => ({
      keywords: scores[0],
      collections: scores[1]
    }))
    .then((stats) => R.assoc('score', getScore(stats), stats));
}

module.exports = build;
