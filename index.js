'use strict';

require('promise-log')(Promise);
const R = require('ramda');

const STORES = {
  'gplay': require('./lib/stores/gplay'),
  'itunes': require('./lib/stores/itunes')
};

const constants = require('./lib/constants');

const buildApp = require('./lib/app');
const buildScores = require('./lib/scores');
const buildSuggest = require('./lib/suggest');
const buildVisibility = require('./lib/visibility');


function getClient (store, opts) {
  // not forcing store to be a string anymore, in case someone wanats to pass
  // a homebrew object, e.g. to disable memoization

  if (R.is(String, store)) {
    opts = Object.assign({
      country: 'us',
      throttle: 20
    }, opts);
    if (!(store in STORES)) {
      throw Error(`the store name should be one of: ${Object.keys(STORES).join(', ')}`);
    }

    store = STORES[store](opts);
  }

  return Object.assign({
    app: buildApp(store),
    scores: buildScores(store),
    suggest: buildSuggest(store),
    visibility: buildVisibility(store)
  }, constants);
}

module.exports = getClient;
