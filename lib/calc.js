'use strict';

const R = require('ramda');

function round (val) {
  return Math.round(val * 100) / 100;
}

// general score
function score (min, max, value) {
  value = Math.min(max, value);
  value = Math.max(min, value);
  return round(1 + 9 * (value - min) / (max - min));
}

// zero based score
function zScore (max, value) {
  return score(0, max, value);
}

// inverted score (min = 10, max = 1)
function iScore (min, max, value) {
  value = Math.min(max, value);
  value = Math.max(min, value);
  return round(1 + 9 * (max - value) / (max - min));
}

// inverted, zero based score
function izScore (max, value) {
  return iScore(0, max, value);
}

// weighted aggregate score
function aggregate (weights, values) {
  const max = 10 * R.sum(weights);
  const min = 1 * R.sum(weights);
  const sum = R.sum(R.zipWith(R.multiply, weights, values));
  return score(min, max, sum);
}

module.exports = {
  round,
  score,
  zScore,
  iScore,
  izScore,
  aggregate
};
