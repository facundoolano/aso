'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const getKeywords = require('./app');

// startegies to get the list of apps to compare
suggest.SIMILAR = 'similar'; // listed as similar in google play
suggest.COMPETITION = 'competition'; // top apps of the targetted kws
suggest.CATEGORY = 'category'; // top apps of the category
suggest.ARBITRARY = 'arbitrary'; // based on an arbitrary list of app ids
suggest.KEYWORDS = 'keywords'; // based on a list of seed keywords

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
    .then(R.map(gplay.search))
    .then((promises) => Promise.all(promises))
    .then(R.unnest);

/*
* Given an appId, get the its top 10 keywords and return the top apps for each
* of them.
*/
const getCompetitors = (appId) =>
  getKeywords(appId)
    .then(R.slice(0, 10))
    .then(getAppsFromKeywords);

/*
* Return the proper app list promise based on the requested suggest strategy.
*/
function resolveApps (appId, strategy) {
  if (strategy === suggest.SIMILAR) {
    return gplay.similar({appId, fullDetail: true});
  }

  if (strategy === suggest.CATEGORY) {
    return gplay.app({appId})
      .then((app) => ({
        collection: app.free ? gplay.collection.TOP_FREE : gplay.collection.TOP_PAID,
        category: app.genreId,
        num: 120,
        fullDetail: true
      }))
      .then(gplay.list);
  }

  if (strategy === suggest.ARBITRARY) {
    if (!R.is(Array, appId)) {
      return Promise.reject(Error('an appId array is required for arbitrary suggestions'));
    }
    return Promise.all(appId.map((appId) => gplay.app({appId})));
  }

  if (strategy === suggest.COMPETITION) {
    return getCompetitors(appId);
  }

  if (strategy === suggest.KEYWORDS) {
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
  Promise.all(apps.map(getKeywords))
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
  strategy = strategy || suggest.SIMILAR;
  return resolveApps(appId, strategy).then(getSuggestions);
}

module.exports = suggest;
