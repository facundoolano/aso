'use strict';

const R = require('ramda');
const getKeywords = require('../retext');
const buildGetAppKeywords = require('../app');
const c = require('../constants');

const withoutApp = (appId) => R.reject((app) => app.appId === appId || app.id === parseInt(appId));

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
  * Given a list of terms, get their search completion suggestions and extract
  * the keywords they contain.
  */
  const getSearchKeywords = (terms) =>
    Promise.all(terms.map(term => store.suggest({term})))
        .then(R.map(R.slice(0, 15))) // up to 15 suggestions per seed kw
        .then(R.unnest)
        .then((suggestions) => Promise.all(suggestions.map(getKeywords))) // break suggestions into kws
        .then(R.unnest)
        .then(R.uniq);

  /*
  * Given an appId, return a list of apps considered similar by the store.
  */
  const similar = (opts) => store.similar({appId: opts.appId, fullDetail: true});

  /*
  * Given an appId, return the list of top apps of its category/collection.
  */
  const category = (opts) =>
   store.app({appId: opts.appId})
    .then(store.getCollectionQuery)
    .then(R.assoc('fullDetail', true))
    .then(store.list)
    .then(withoutApp(opts.appId));

  /*
  * Given an appId, get the its top 10 keywords and return the top apps for each
  * of them.
  */
  const competition = (opts) =>
    buildGetAppKeywords(store)(opts.appId)
      .then(R.slice(0, 10))
      .then(getAppsFromKeywords)
      .then(withoutApp(opts.appId));

  /*
  * Given an array of appIds, return the list of apps matchinf those ids.
  */
  function arbitrary (opts) {
    if (!R.is(Array, opts.apps)) {
      return Promise.reject(Error('an appId array is required for arbitrary suggestions'));
    }
    return Promise.all(opts.apps.map((appId) => store.app({appId})));
  }

  /*
  * Given an array of keywords, return the list of top apps for those keywords.
  */
  function keywords (opts) {
    if (!R.is(Array, opts.keywords)) {
      return Promise.reject(Error('an array of seed keywords is required for this strategy'));
    }
    return getAppsFromKeywords(opts.keywords);
  }

  /*
  * Given an array of seed keywords, get related keywords based on search
  * suggestions, then return a list of top apps for them.
  */
  function search (opts) {
    if (!R.is(Array, opts.keywords)) {
      return Promise.reject(Error('an array of seed keywords is required for this strategy'));
    }
    return getSearchKeywords(opts.keywords).then(getAppsFromKeywords);
  }

  const strategies = {};
  strategies[c.SIMILAR] = similar;
  strategies[c.COMPETITION] = competition;
  strategies[c.CATEGORY] = category;
  strategies[c.ARBITRARY] = arbitrary;
  strategies[c.KEYWORDS] = keywords;
  strategies[c.SEARCH] = search;

  return strategies;
}

module.exports = build;
