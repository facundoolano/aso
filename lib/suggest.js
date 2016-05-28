'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const getKeywords = require('./app').getKeywords;

function suggest (appId) {
  return gplay.similar({appId, fullDetail: true})
    .then(R.pluck('description'))
    .then(R.map(getKeywords))
    .then((promises) => Promise.all(promises))
    .then(R.unnest)
    .then(R.countBy(R.identity))
    .then(R.toPairs)
    .then(R.reject((pair) => pair[1] <= 2))
    .then(R.sortBy((pair) => -pair[1]));
}

module.exports = suggest;
