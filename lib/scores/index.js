'use strict';

const gplay = require('google-play-scraper');
const getTraffic = require('./traffic');
const getDifficulty = require('./difficulty');

function getScores (keyword) {
  return gplay
    .search({term: keyword, num: 100, fullDetail: true})
    .then((apps) => Promise.all([
      getDifficulty(keyword, apps),
      getTraffic(keyword, apps)
    ]))
    .then((results) => ({
      difficulty: results[0],
      traffic: results[1]
    }));
}

module.exports = getScores;
