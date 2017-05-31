# App Store Optimization (aso)

This Node.js library provides a set of functions to aid [App Store Optimization](https://en.wikipedia.org/wiki/App_store_optimization) of applications in iTunes and Google Play.

The functions use either [google-play-scraper](https://github.com/facundoolano/google-play-scraper)
or [app-store-scraper](https://github.com/facundoolano/app-store-scraper) to
gather data, so bear in mind a lot of requests are performed under the hood
and you may hit throttling limits when making too many calls in a short period of time.

* [Installation](#installation)
* [API reference](#api-reference)
   * [Keyword Scores](#keyword-scores)
      * [Difficulty](#difficulty)
      * [Traffic](#traffic)
   * [Keyword suggestions](#keyword-suggestions)
      * [Suggestions by category](#suggestions-by-category)
      * [Suggestions by similarity](#suggestions-by-similarity)
      * [Suggestions by competition](#suggestions-by-competition)
      * [Suggestions by an arbitrary list of apps](#suggestions-by-an-arbitrary-list-of-apps)
      * [Suggestions based on seed keywords](#suggestions-based-on-seed-keywords)
      * [Suggestions based on search hints](#suggestions-based-on-search-hints)
   * [App visibility score](#app-visibility-score)
   * [App Keywords](#app-keywords)
      * [A note on keyword relevancy for iTunes](#a-note-on-keyword-relevancy-for-itunes)
   * [Store backend configuration](#store-backend-configuration)


## Installation

```
npm install aso
```

## API Reference

The module exports a function to build a client that will query either iTunes (`'itunes'`)
or Google Play (`'gplay'`):

```js
const gplay = require('aso')('gplay');
const itunes = require('aso')('itunes');

// do stuff with google play
gplay.scores('panda').then(console.log);

// do stuff with itunes
itunes.scores('panda').then(console.log);
```

The behaviour of the algorithms is the same for both stores, except where noted.

### Keyword scores

The `scores` function gathers several statistics about a keyword and builds
`difficulty` and `traffic` scores that can be used to evaluate the
convenience of targeting that keyword.

The only argument is the keyword itself:

```js
const aso = require('aso')('gplay');

aso.scores('panda').then(console.log)
```

Returns:

```js
{ difficulty:
   { titleMatches: { exact: 10, broad: 0, partial: 0, none: 0, score: 10 },
     competitors: { count: 33, score: 5.95 },
     installs: { avg: 2470000, score: 10 },
     rating: { avg: 4.04, score: 8.08 },
     age: { avgDaysSinceUpdated: 81.4, score: 8.53 },
     score: 8.84 },
  traffic:
   { suggest: { length: 3, index: 3, score: 8.7 },
     ranked: { count: 5, avgRank: 52.2, score: 5.48 },
     installs: { avg: 2470000, score: 10 },
     length: { length: 5, score: 8.5 },
     score: 8.18 } }
```

Scores are calculated as linear functions and aggregated with somewhat arbitrary
weights. All statistics are included in the response to allow custom scoring
functions to be used.

Any suggestions on how to tune or improve the score calculations are welcome :)

#### Difficulty

The difficulty of a keyword measures how hard it is to rank high on searches for
that kewyord. This is usually the most important aspect to consider when picking
a keyword (after relevance of the keyword for the given app). The lower this score,
the better the candidate keyword.

The properties considered for this score are:

* `titleMatches`: classifies the titles of the top 10 apps for the keyword according
to how well they match the words that make it: exact (contains all the words, in the same order),
broad (contains all the words in a different order), partial (contains some of the
words), none (does not contain any of the words).
* `competitors`: counts how many of the top 100 apps for the keyword actually
target that keyword in their title and description.
* `installs`: measures the average amount of installs of the top 10 apps. Since iTunes
does not expose the amount of installs, the reviews count is used instead.
* `rating`: measures the average rating of the top 10 apps.
* `age`: measures the average time since the apps in the top 10 have been updated.

#### Traffic

The traffic score estimates how much traffic that keyword gets. Note this factor
is better considered after picking keywords with high relevance and low difficulty.
A high score means high traffic and therefore a better keyword candidate.

The properties considered for this score are:

* `suggest`: For Google Play the amount of characters needed for the keyword to come up as a
suggestion in the search box, and the position in the suggestions list. iTunes already
scores their suggest results, so that number is used instead.
* `ranked`: the amount of apps in the top 10 of the keyword that appear in their
category rankings, and the average ranking of those that do.
* `installs`: same metric as in difficulty, but with a lower weight in the overall score.
* `length`: length of the keyword (less traffic is assumed for longer keywords).

### Keyword suggestions

The `suggest` function returns a list of suggestions consisting
of the most commonly used keywords among a given set of apps. There are several
strategies to select that set of apps.

This function takes an options object with the following properties:
* `strategy`: the strategy used to get suggestions. Defaults to `CATEGORY`.
* `num`: the amount of suggestions to get in the results. Defaults to 30.
* `appId`: store app ID (for iTunes both numerical and bundle IDs are supported).
Required for the `CATEGORY`, `SIMILAR` and `COMPETITION` strategies.
* `apps`: array of store app IDs. Required for the `ARBITRARY` strategy.
* `keywords`: array of seed keywords. Required for the `KEYWORDS` and `SEARCH` strategies.

A common flow of work would be to try all the strategies for a given app, hand pick the most interesting
keywords and then run the `scores` function on them to analize their quality.

#### Suggestions by category
Looks at apps in the same category as the one given.

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.CATEGORY,
  appId: 'com.dxco.pandavszombies',
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'game', 'world', 'features', 'weapons', 'action' ]
```

#### Suggestions by similarity
Looks at apps marked by Google Play as "similar". For iTunes the "customers also bought" apps are used instead (which may not necessarily be similar to the given app).

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.SIMILAR,
  appId: 'com.dxco.pandavszombies',
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'game', 'zombies', 'zombie', 'weapons', 'action' ]
```

#### Suggestions by competition
Looks at apps that target the same keywords as the one given.

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.COMPETITION,
  appId: 'com.dxco.pandavszombies',
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'game', 'zombies', 'features', 'app', 'zombie' ]
```

#### Suggestions by an arbitrary list of apps

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.ARBITRARY,
  apps: ['com.dxco.pandavszombies'],
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'game', 'zombies', 'features', 'app', 'zombie' ]
```

#### Suggestions based on seed keywords
Look at apps that target one of the given seed keywords.

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.KEYWORDS,
  keywords: ['panda', 'zombies', 'hordes'],
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'features', 'game', 'zombies', 'panda', 'zombie' ]
```

#### Suggestions based on search hints
Given a set of seed keywords, infer a new set from the search completion suggestions of each one. Then look at apps that target the resulting keywords. This is expected to work better for iTunes, where the search completion yields more
  results.

```js
const aso = require('aso')('gplay');

aso.suggest({
  strategy: aso.SEARCH,
  keywords: ['panda', 'zombies', 'hordes'],
  num: 5})
.then(console.log);
```

Returns:
```js
[ 'game', 'features', 'zombie', 'zombies', 'way' ]
```

### App visibility score

The `visibility` function gives an estimation of the app's discoverability within
the store. The scores are built aggregating how well the app ranks for its target
keywords, the traffic score for those keywords and how the app ranks in the
top global and category rankings.

The only argument to the function is the App ID (package id for Google Play and
either numerical or bundle ID for iTunes).

Google Play example:
```js
const aso = require('aso')('gplay');

aso.visibility('com.dxco.pandavszombies').then(console.log);
```

Returns:

```js
{ keywords:
   { 'panda vs zombies': { traffic: 2.94, rank: 1, score: 29.4 },
     rocky: { traffic: 7.81, rank: 74, score: 57.48 },
     'panda vs zombie': { traffic: 3.49, rank: 8, score: 34.03 },
     'panda warrior': { traffic: 1.47, rank: 5, score: 14.49 },
     'zombie elvis': { traffic: 3.3, rank: 1, score: 33 },
     meatloaf: { traffic: 5.79, rank: 16, score: 54.77 },
     ftw: { traffic: 2.88, rank: 58, score: 22.87 } },
  collections:
   { global: { rank: undefined, score: 0 },
     category: { rank: undefined, score: 0 } },
  score: 246.04 }
```

iTunes example:

```js
const aso = require('aso')('gplay');

aso.visibility(284882215) // ID for the facebook app
  .then(console.log);
```

Returns:
```js
{ keywords:
   { facebook: { traffic: 9.55, rank: 1, score: 95.5 },
     friends: { traffic: 7.21, rank: 2, score: 71.74 } },
  collections:
   { global: { rank: 3, score: 991 },
     category: { rank: 2, score: 99.5 } },
  score: 1257.74 }
```

### App keywords

The `app` function returns an array of keywords extracted from title and description
of the app. The only argument is the Google Play ID of the application (the `?id=` parameter on the url).

```js
const aso = require('aso')('gplay');

aso.app('com.dxco.pandavszombies').then(console.log)
```

Returns:

```js
[
  'panda',
  'rocky',
  'zombie',
  'panda vs zombie',
  'elvis',
  'undead',
  'time',
  'game',
  'vs',
  (...)
]
```

[retext-keywords](https://github.com/wooorm/retext-keywords) is used to extract the keywords
from the app title and description.

#### A note on keyword relevancy for iTunes

As said, the algorithm used by the `app` function extracts the keywords from title and
description. This algorithm is also used internally by the `scores` and
`suggest` functions.

While in all cases the most important place to look at for keywords is the title,
the app description is usually less relevant in the iTunes app store, since there's
a specific keywords list field when submitting the app. Unfortunately the contents
of that field are not (that I know of) reachable from any public page or API. So
keywords based on description may not have a big weight on iTunes searches.

Google Play, on the other hand, doesn't have a keywords field and so the description is
expected to contain most of the app's targeted keywords.

### Store backend configuration

An object can be passed as a second argument to the client builder function, with
options to override the behavior of [google-play-scraper](https://github.com/facundoolano/google-play-scraper)
and [app-store-scraper](https://github.com/facundoolano/app-store-scraper).
The given options will be included in every method call to the stores.
This can be used, for example, to target a differnt country than the default `'us'`:

```js
const itunesRussia = require('aso')('itunes', { country: 'ru' });

// do stuff with itunes
itunesRussia.scores('panda').then(console.log);
```

Other options that may be useful are `cache` and `throttle`. See the reference
of each scraper for all the available options.

### Note about Google Play performance

While iTunes provides an API to search apps with all their details, getting data from Google Play usually requires making a request for the search and then additional requests to get the details for each resulting app, then parsing the HTML. This means that most of the functions of this module (specially scores) will be muchs slower for Google Play than for iTunes (taking even minutes). This is expected given that data is scraped from Google Play in real time on every call. This can be partially mitigated using memoization, at the expense of memory usage, but a better approach (outside the scope of this project) to get faster results would be to periodically scan Google Play, save the data to a database and query that for score calculations.
