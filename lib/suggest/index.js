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
  function resolveApps (appId, strategy) {
    const handler = strategies[strategy];
    if (!handler) {
      throw Error('invalid suggestion strategy');
    }
    return handler(appId);
  }

  /*
  * Return the most common keywords among the given apps.
  */
  const getSuggestions = (apps) =>
    Promise.all(apps.map(buildGetAppKeywords(store)))
      .then(R.unnest)
      .then(R.countBy(R.identity))
      .then(R.toPairs)
      .then(R.sortBy((pair) => -pair[1]))
      .then(R.slice(0, 50))
      .then(R.map(R.prop(0)));

  /*
  * Suggest keywords based on other apps selected according to a given strategy.
  */
  function suggest (appId, strategy) {
    strategy = strategy || c.CATEGORY;
    return resolveApps(appId, strategy).then(getSuggestions);
  }

  return suggest;
}

module.exports = build;
