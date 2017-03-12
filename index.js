'use strict';

require('promise-log')(Promise);

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
  opts = Object.assign({
    country: 'us',
    throtle: 20
  }, opts);

  if (!(store in STORES)) {
    throw Error(`the store name should be one of: ${Object.keys(STORES).join(', ')}`);
  }

  store = STORES[store](opts);
  return Object.assign({
    app: buildApp(store),
    scores: buildScores(store),
    suggest: buildSuggest(store),
    visibility: buildVisibility(store)
  }, constants);
}

module.exports = getClient;
