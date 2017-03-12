'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const calc = require('../calc');

/*
* An object that holds all store-specific parts of the algorithms exposed by
* the library. This is not the most elegant solution ever, but beats introducing
* hierarchies and inheritance. If these objects grow too big it's probably better
* to break them into more cohessive components, maybe with defaults for the
* common stuff.
*/

const MAX_KEYWORD_LENGTH = 25;

const getCollection = (app) => app.free ? gplay.collection.TOP_FREE : gplay.collection.TOP_PAID;
const getGenre = (app) => app.genreId;

function buildStore (defaults) {
  const wrapped = (method) => (opts) => method(R.merge(defaults, opts));

  function getSuggestLength (keyword, length) {
    length = length || 1;
    if (length > Math.min(keyword.length, MAX_KEYWORD_LENGTH)) {
      return Promise.resolve({
        length: undefined,
        index: undefined
      });
    }

    const prefix = keyword.slice(0, length);
    return wrapped(gplay.suggest)({term: prefix})
      .then(function (suggestions) {
        const index = suggestions.indexOf(keyword);
        if (index === -1) {
          return getSuggestLength(keyword, length + 1);
        }
        return { length, index };
      });
  }

  const store = {
    MAX_SEARCH: 250,
    MAX_LIST: 120,

    list: wrapped(gplay.list),
    search: wrapped(gplay.search),
    app: wrapped(gplay.app),
    similar: wrapped(gplay.similar),
    suggest: wrapped(gplay.suggest),

    getInstallsScore: function (apps) {
      const avg = R.sum(R.pluck('minInstalls', apps)) / apps.length;
      const max = 1000000;
      const score = calc.zScore(max, avg);
      return {avg, score};
    },

    getSuggestScore: (keyword) => getSuggestLength(keyword)
      .then(function (lengthStats) {
        let score;
        if (!lengthStats.length) {
          score = 1;
        } else {
          const lengthScore = calc.iScore(1, MAX_KEYWORD_LENGTH, lengthStats.length);
          const indexScore = calc.izScore(4, lengthStats.index);
          score = calc.aggregate([10, 1], [lengthScore, indexScore]);
        }
        return R.assoc('score', score, lengthStats);
      }),

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
