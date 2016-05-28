'use strict';

const R = require('ramda');
const calc = require('./calc');

/*
* Score the average amount of installs among the top apps.
*/
function getInstalls (keyword, apps) {
  const avg = R.sum(R.pluck('minInstalls', apps)) / apps.length;
  const max = 1000000;
  const score = calc.zScore(max, avg);
  return {avg, score};
}

module.exports = getInstalls;
