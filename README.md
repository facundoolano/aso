# google-play-keywords

This Node.js library provides a set of functions to aid [App Store Optimization](https://en.wikipedia.org/wiki/App_store_optimization) of applications in Google Play.

All the functions use [google-play-scraper](https://github.com/facundoolano/google-play-scraper) to
gather data, so bear in mind a lot of requests are performed under the hood
and you may hit throttling limits when making too many calls in a short period of time.

## Installation

```
npm install google-play-keywords
```

## API Reference

### App keywords

The `app` function returns an array of keywords extracted from the description
of the app. The only argument is the Google Play ID of the application (the `?id=` parameter on the url).

```js
const keywords = require('google-play-keywords');

keywords.app('com.dxco.pandavszombies').then(console.log)
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
from the app description.

### Keyword scores

The `scores` function gathers several statistics about a keyword and builds
`difficulty` and `traffic` scores that can be used to evaluate the
convenience of targeting that keyword.

The only argument is the keyword:

```js
const keywords = require('google-play-keywords');

keywords.scores('panda').then(console.log)
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
target that keyword in their description.
* `installs`: measures the average amount of installs of the top 10 apps.
* `rating`: measures the average rating of the top 10 apps.
* `age`: measures the average time since the apps in the top 10 have been updated.

#### Traffic

The traffic score estimates how much traffic that keyword gets. Note this factor
is better considered after picking keywords with high relevance and low difficulty.
A high score means high traffic and therefore a better keyword candidate.

The properties considered for this score are:

* `suggest`: the amount of characters needed for the keyword to come up as a
suggestion in the Google Play search box, and the position in the suggestions list.
* `ranked`: the amount of apps in the top 10 of the keyword that appear in their
category rankings, and the average ranking of those that do.
* `installs`: measures the average amount of installs of the top 10 apps.
* `length`: length of the keyword (less traffic is assumed for longer keywords).

### Keyword suggestions

The `suggest` function returns a list of suggestions consisting
of the most commonly used keywords among a given set of apps. There are several
strategies to select that set of apps.

The function takes an app ID and a strategy, which defaults to `keywords.suggest.SIMILAR`:

```js
const keywords = require('google-play-keywords');

keywords.suggest('com.dxco.pandavszombies', keywords.suggest.SIMILAR).then(console.log)
```

Returns:

```js
[
  'zombies',
  'game',
  'zombie',
  'shooter',
  'guns',
  'apocalypse',
  'fire',
  'games',
  'survivors',
  (...)
]
```

The avaliable strategies are:
  * `keywords.suggest.SIMILAR`: looks at apps marked by Google Play as "similar" to the one given.
  * `keywords.suggest.CATEGORY`: looks at apps in the same category as the one given.
  * `keywords.suggest.COMPETITION`: looks at apps that target the same keywords as the one given. Note this strategy is expensive so it may require around a minute to resolve.
  * `keywords.suggest.ARBITRARY`: look at an arbitrary list of apps. For this strategy, the first argument should be an array of
  application IDs instead of a single one.

A common flow of work would be to try all the strategies for a given app, hand pick the most interesting
keywords and then run the `scores` function on them to analize their quality.
