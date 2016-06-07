'use strict';

const retext = require('retext');
const nlcstToString = require('nlcst-to-string');
const retextKeywords = require('retext-keywords');
const R = require('ramda');

const processor = retext().use(retextKeywords, {maximum: 20});

/*
* Process the given text with retext and return the promise of an object with
* the keywords and keyphrases extracted.
*/
function processKeywords (text) {
  // for some reason retext is not filtering "it's" out
  const cleanText = text.replace(/'t/g, '')
                        .replace(/'s/g, '')
                        .replace(/'ll/g, '')
                        .replace(/'re/g, '')
                        .replace(/'ve/g, '');

  return new Promise(function (resolve, reject) {
    processor.process(cleanText, function (err, file) {
      if (err) {
        reject(err);
      }
      const space = file.namespace('retext');
      const words = space.keywords.map((w) => ({
        value: nlcstToString(w.matches[0].node),
        score: w.score
      }));
      const phrases = space.keyphrases.map((p) => ({
        value: p.matches[0].nodes.map(nlcstToString).join(''),
        score: p.score
      }));

      resolve({words, phrases});
    });
  });
}

const fixScore = (phrase) => R.assoc('score', phrase.score * 2.5, phrase);
const isShortPhrase = (phrase) => phrase.value.split(' ').length <= 3;
const notCharWord = (word) => word.value.length > 1; // removes 'i'
const toLower = (word) => R.assoc('value', word.value.toLowerCase(), word);

function getKeywords (text) {
  return processKeywords(text).then(function (results) {
    const phrases = results.phrases
      .filter(isShortPhrase)
      .map(toLower)
      .map(fixScore);

    const words = R.differenceWith(R.eqProps('value'), results.words.map(toLower), phrases)
      .concat(phrases)
      .filter(notCharWord);

    return R.sortBy((word) => -word.score, words)
           .map(R.prop('value'));
  });
}

module.exports = getKeywords;
