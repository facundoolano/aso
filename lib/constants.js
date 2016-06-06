'use strict';

// startegies to get the list of apps to compare
module.exports = {
  SIMILAR: 'similar', // listed as similar in google play
  COMPETITION: 'competition', // top apps of the targetted kws
  CATEGORY: 'category', // top apps of the category
  ARBITRARY: 'arbitrary', // based on an arbitrary list of app ids
  KEYWORDS: 'keywords', // based on a list of seed keywords
  SEARCH: 'search' // based on search suggestion keywords
};
