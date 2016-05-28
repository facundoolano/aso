'use strict';

// TODO add aggregated score

function round (val) {
  return +val.toFixed(2);
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

module.exports = {
  score,
  zScore,
  iScore,
  izScore
};
