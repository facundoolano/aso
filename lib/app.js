'use strict';

const R = require('ramda');
const getKeywords = require('./retext');

function build (store) {
  return function (appId) {
    let p;
    if (R.is(Object, appId)) {
      p = Promise.resolve(appId);
    } else {
      p = store.app({appId});
    }

    return p.then((app) => Promise.all([
      getKeywords(app.title),
      getKeywords(`${app.summary || ''} ${app.description}`)
    ]))
    .then((keywords) => keywords[0].concat(R.difference(keywords[1], keywords[0])));
  };
}

module.exports = build;
