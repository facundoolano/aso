'use strict';

const itunes = require('app-store-scraper');
const R = require('ramda');
const calc = require('../calc');

/*
* An object that holds all store-specific parts of the algorithms exposed by
* the library. This is not the most elegant solution ever, but beats introducing
* hierarchies and inheritance. If these objects grow too big it's probably better
* to break them into more cohessive components, maybe with defaults for the
* common stuff.
*/

const getCollection = (app) => app.free ? itunes.list.collection.TOP_FREE_IOS : itunes.list.collection.TOP_PAID_IOS;
const getGenre = (app) => app.primaryGenreId;

function fixQueryId (query) {
  if (query.appId && !R.identical(NaN, parseInt(query.appId))) {
    query.id = query.appId;
    delete query.appId;
  }
  return query;
}

const store = {
  list: itunes.list,
  search: itunes.search,
  similar: (query) => itunes.similar(fixQueryId(query)),
  app: (query) => itunes.app(fixQueryId(query)),

  getInstallsScore: function (apps) {
    const avg = R.sum(R.pluck('reviews', apps)) / apps.length;
    const max = 100000;
    const score = calc.zScore(max, avg);
    return {avg, score};
  },

  getSuggestScore: (keyword) => itunes.suggest(keyword)
    .then(R.find(R.propEq('term', keyword)))
    .then((result) => ({
      score: calc.zScore(8000, result.priority) // max is actually 10k, but too few apps meet it
    })),

  getCollection,
  getGenre,
  getCollectionQuery: (app) => ({
    collection: getCollection(app),
    category: getGenre(app),
    num: 200
  })

};

module.exports = store;

