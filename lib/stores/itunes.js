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

const store = {
  list: itunes.list,
  search: itunes.search,

  app: function (query) {
    if (query.appId && !R.identical(NaN, parseInt(query.appId))) {
      query.id = query.appId;
      delete query.appId;
    }
    return itunes.app(query);
  },

  similar: () => Promise.reject(new Error('Similar apps not implemented for itunes')),

  getInstallsScore: function (apps) {
    const avg = R.sum(R.pluck('reviews', apps)) / apps.length;
    const max = 500000;
    const score = calc.zScore(max, avg);
    return {avg, score};
  },

  getSuggestScore: (keyword) => itunes.suggest(keyword)
    .then(R.find(R.propEq('term', keyword)))
    .then((result) => ({
      score: calc.zScore(10000, result.priority)
    })),

  getCollection,
  getCollectionQuery: (app) => ({
    collection: getCollection(app),
    category: app.primaryGenreId,
    num: 200
  })

};

module.exports = store;

