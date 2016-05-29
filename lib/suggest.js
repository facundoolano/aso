'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const getKeywords = require('./app').getKeywords;

// startegies to get the list of apps to compare
suggest.SIMILAR = 'similar'; // listed as similar in google play
suggest.COMPETITION = 'competition'; // top apps of the targetted kws
suggest.CATEGORY = 'category'; // top apps of the category
suggest.ARBITRARY = 'arbitrary'; // based on an arbitrary list of app ids

function getCompetitors (appId) {
  // get top 10 apps for each top 10 keyword of this app
  return gplay.app({appId})
    .then(R.prop('description'))
    .then(getKeywords)
    .then(R.slice(0, 10))
    .then(R.map((kw) => ({
      term: kw,
      num: 10,
      fullDetail: true
    })))
    .then(R.map(gplay.search))
    .then((promises) => Promise.all(promises))
    .then(R.unnest);
}

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
      throw Error('an appId array is required for arbitrary suggestions');
    }
    return Promise.all(appId.map((appId) => gplay.app({appId})));
  }

  if (strategy === suggest.COMPETITION) {
    return getCompetitors(appId);
  }

  throw Error('invalid suggestion strategy');
}

/*
* Return the most common keywords among the given apps.
*/
function getSuggestions (apps) {
  console.log(apps[0]);
  const promises = R.pluck('description', apps).map(getKeywords);
  return Promise.all(promises)
    .then(R.unnest)
    .then(R.countBy(R.identity))
    .then(R.toPairs)
    .then(R.slice(0, 30))
    .then(R.sortBy((pair) => -pair[1]))
    .then(R.map(R.prop(0)));
}

/*
* Suggest keywords based on other apps selected according to a given strategy.
*/
function suggest (appId, strategy) {
  strategy = strategy || suggest.similar;
  return resolveApps(appId, strategy).then(getSuggestions);
}

module.exports = suggest;
