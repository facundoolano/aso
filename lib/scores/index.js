'use strict';

const getTraffic = require('./traffic');
const getDifficulty = require('./difficulty');

function build (store) {
  return function (keyword) {
    keyword = keyword.toLowerCase();
    return store
      .search({term: keyword, num: 100, fullDetail: true})
      .then((apps) => Promise.all([
        getDifficulty(store)(keyword, apps),
        getTraffic(store)(keyword, apps)
      ]))
      .then((results) => ({
        difficulty: results[0],
        traffic: results[1]
      }));
  };
}

module.exports = build;
