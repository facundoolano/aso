'use strict';

const gplay = require('./lib/stores/gplay');
const itunes = require('./lib/stores/itunes');
const constants = require('./lib/constants');

const buildApp = require('./lib/app');
const buildScores = require('./lib/scores');
const buildSuggest = require('./lib/suggest');
const buildVisibility = require('./lib/visibility');

module.exports.gplay = Object.assign({
  app: buildApp(gplay),
  scores: buildScores(gplay),
  suggest: buildSuggest(gplay),
  visibility: buildVisibility(gplay)
}, constants);

module.exports.itunes = Object.assign({
  app: buildApp(itunes),
  scores: buildScores(itunes),
  suggest: buildSuggest(itunes),
  visibility: buildVisibility(itunes)
}, constants);
