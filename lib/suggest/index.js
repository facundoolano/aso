'use strict';

const R = require('ramda');
const buildGetAppKeywords = require('../app');
const getStrategies = require('./strategies');
const c = require('../constants');

function build (store) {
  const strategies = getStrategies(store);

  /*
  * Return the proper app list promise based on the requested suggest strategy.
  */
  function resolveApps (opts) {
    const handler = strategies[opts.strategy];
    if (!handler) {
      throw Error('invalid suggestion strategy');
    }
    return handler(opts);
  }

  /* Returns a rejector fn to exclude seed keywords from results. */
  const rejectKeywords = (seeds) => R.reject((kw) => R.contains(kw, seeds));

  /*
  * Return the most common keywords among the given apps.
  */
  const getSuggestions = (apps, seeds) =>
    Promise.all(apps.map(buildGetAppKeywords(store)))
      .then(R.unnest)
      .then(rejectKeywords(seeds))
      .then(R.countBy(R.identity))
      .then(R.toPairs)
      .then(R.sortBy((pair) => -pair[1]))
      .then(R.map(R.prop(0)));

  /*
  * Suggest keywords based on other apps selected according to a given strategy.
  */
  function suggest (opts) {
    opts.strategy = opts.strategy || c.CATEGORY;
    const num = opts.num || 30;
    return resolveApps(opts)
      .then((apps) => getSuggestions(apps, opts.keywords || []))
      .then(R.slice(0, num));
  }

  return suggest;
}

module.exports = build;
