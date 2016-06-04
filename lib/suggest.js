'use strict';

const R = require('ramda');
const buildGetKeywords = require('./app');
const c = require('./constants');

function build (store) {
  /*
  * Give an list of keywords, return the top 10 apps for each one.
  */
  const getAppsFromKeywords = (keywords) =>
    Promise.resolve(keywords)
      .then(R.map((kw) => ({
        term: kw,
        num: 10,
        fullDetail: true
      })))
      .then(R.map(store.search))
      .then((promises) => Promise.all(promises))
      .then(R.unnest);

  /*
  * Given an appId, get the its top 10 keywords and return the top apps for each
  * of them.
  */
  const getCompetitors = (appId) =>
    buildGetKeywords(store)(appId)
      .then(R.slice(0, 10))
      .then(getAppsFromKeywords);

  /*
  * Return the proper app list promise based on the requested suggest strategy.
  */
  function resolveApps (appId, strategy) {
    if (strategy === c.SIMILAR) {
      return store.similar({appId, fullDetail: true});
    }

    if (strategy === c.CATEGORY) {
      return store.app({appId})
        .then(store.getCollectionQuery)
        .then(R.assoc('fullDetail', true)) // just for gplay
        .then(store.list);
    }

    if (strategy === c.ARBITRARY) {
      if (!R.is(Array, appId)) {
        return Promise.reject(Error('an appId array is required for arbitrary suggestions'));
      }
      return Promise.all(appId.map((appId) => store.app({appId})));
    }

    if (strategy === c.COMPETITION) {
      return getCompetitors(appId);
    }

    if (strategy === c.KEYWORDS) {
      if (!R.is(Array, appId)) {
        return Promise.reject(Error('an array of seed keywords is required for this strategy'));
      }
      return getAppsFromKeywords(appId);
    }

    throw Error('invalid suggestion strategy');
  }

  /*
  * Return the most common keywords among the given apps.
  */
  const getSuggestions = (apps) =>
    Promise.all(apps.map(buildGetKeywords(store)))
      .then(R.unnest)
      .then(R.countBy(R.identity))
      .then(R.toPairs)
      .then(R.slice(0, 30))
      .then(R.sortBy((pair) => -pair[1]))
      .then(R.map(R.prop(0)));

  /*
  * Suggest keywords based on other apps selected according to a given strategy.
  */
  function suggest (appId, strategy) {
    strategy = strategy || suggest.CATEGORY;
    return resolveApps(appId, strategy).then(getSuggestions);
  }

  return suggest;
}

module.exports = build;
