'use strict';

const gplay = require('./lib/stores/gplay');
const itunes = require('./lib/stores/itunes');

const buildApp = require('./lib/app');
const buildScores = require('./lib/scores');
const buildSuggest = require('./lib/suggest');

module.exports.gplay = {
  app: buildApp(gplay),
  scores: buildScores(gplay),
  suggest: buildSuggest(gplay)
};

module.exports.itunes = {
  app: buildApp(itunes),
  scores: buildScores(itunes),
  suggest: buildSuggest(itunes)
};
