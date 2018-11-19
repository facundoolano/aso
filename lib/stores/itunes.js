'use strict';

// FIXME don't force memoization
const itunes = require('app-store-scraper').memoized();
const R = require('ramda');
const calc = require('../calc');
const debug = require('debug')('aso');

/*
* An object that holds all store-specific parts of the algorithms exposed by
* the library. This is not the most elegant solution ever, but beats introducing
* hierarchies and inheritance. If these objects grow too big it's probably better
* to break them into more cohessive components, maybe with defaults for the
* common stuff.
*/

const getCollection = (app) => app.free ? itunes.collection.TOP_FREE_IOS : itunes.collection.TOP_PAID_IOS;
const getGenre = (app) => app.primaryGenreId;

function buildStore (defaults) {
  const wrapped = (method) => (opts) => {
    if (opts.appId && !R.identical(NaN, parseInt(opts.appId))) {
      opts.id = opts.appId;
      delete opts.appId;
    }
    const mergedOpts = R.merge(defaults, opts);
    debug('Calling app-store-scraper', method, JSON.stringify(mergedOpts));
    return itunes[method](mergedOpts);
  };

  const store = {
    MAX_SEARCH: 200,
    MAX_LIST: 100,

    list: wrapped('list'),
    search: wrapped('search'),
    similar: wrapped('similar'),
    app: wrapped('app'),
    suggest: (opts) => wrapped('suggest')(opts).then(R.pluck('term')),

    getInstallsScore: function (apps) {
      const avg = R.sum(apps.map((app) => app.reviews || 0)) / apps.length;
      const max = 100000;
      const score = calc.zScore(max, avg);
      return {avg, score};
    },

    getSuggestScore: (keyword) => wrapped('suggest')({term: keyword})
      .then(R.find(R.propEq('term', keyword)))
      .then((result) => ({
        score: calc.zScore(8000, result ? result.priority : 0) // max is actually 10k, but too few apps meet it
      })),

    getCollection,
    getGenre,
    getCollectionQuery: (app) => ({
      collection: getCollection(app),
      category: getGenre(app),
      num: store.MAX_LIST
    })
  };

  return store;
}

module.exports = buildStore;
