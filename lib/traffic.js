'use strict';

const gplay = require('google-play-scraper');
const R = require('ramda');
const calc = require('./calc');

const MAX_KEYWORD_LENGTH = 25;

// FIXME consider relative position within result lists
function getSuggestLength (keyword, length) {
  length = length || 1;
  if (length > Math.min(keyword.length, MAX_KEYWORD_LENGTH)) {
    return Promise.resolve({
      length: undefined,
      index: undefined
    });
  }

  const prefix = keyword.slice(0, length);
  return gplay.suggest(prefix)
    .then(function (suggestions) {
      const index = suggestions.indexOf(keyword);
      if (index === -1) {
        return getSuggestLength(keyword, length + 1);
      }
      return { length, index };
    });
}

function getSuggestScore (keyword) {
  return getSuggestLength(keyword)
    .then(function (lengthStats) {
      let score;
      if (!lengthStats.length) {
        score = 0;
      } else {
        const lengthScore = calc.iScore(1, MAX_KEYWORD_LENGTH, lengthStats.length);
        const indexScore = calc.izScore(4, lengthStats.index);
        const sum = 10 * lengthScore + indexScore;
        score = calc.score(11, 110, sum);
      }
      return R.assoc('score', score, lengthStats);
    });
}

function getKeywordLength (keyword) {
  const length = keyword.length;
  return {
    length,
    score: calc.iScore(1, MAX_KEYWORD_LENGTH, length)
  };
}

function getScore (stats) {
  // TODO use constants for weights
  const sum = 10 * stats.suggest.score + stats.length.score;
  const max = 10 * (10 + 1);
  return calc.zScore(max, sum);
}

function getTraffic (keyword) {
  return getSuggestScore(keyword)
    .then((suggest) => ({
      suggest,
      length: getKeywordLength(keyword)
    }))
    .then((stats) => R.assoc('score', getScore(stats), stats));
}

module.exports = getTraffic;
