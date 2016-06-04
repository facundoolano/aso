# App Store Optimization (aso)

This Node.js library provides a set of functions to aid [App Store Optimization](https://en.wikipedia.org/wiki/App_store_optimization) of applications in iTunes and Google Play.

The functions use either [google-play-scraper](https://github.com/facundoolano/google-play-scraper)
or [app-store-scraper](https://github.com/facundoolano/app-store-scraper) to
gather data, so bear in mind a lot of requests are performed under the hood
and you may hit throttling limits when making too many calls in a short period of time.

## Installation

```
npm install aso
```

## API Reference

The same API is exposed for the iTunes and Google Play stores through the `itunes`
and `gplay` objects respectively:

```js
const gplay = require('aso').gplay;
const itunes = require('aso').itunes;

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
const aso = require('aso').gplay;

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

The function takes an app ID and a strategy, which defaults to `CATEGORY`:

```js
const aso = require('aso').gplay;

aso.suggest('com.dxco.pandavszombies', aso.SIMILAR).then(console.log)
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

Using the `KEYWORDS` strategy:

```js
const aso = require('aso').itunes;

aso.suggest(['panda', 'zombie', 'waves', 'undead'], aso.KEYWORDS).then(console.log)
```

Returns:

```js
[
  'time',
  'panda',
  'graphics',
  'friends',
  'levels',
  'facebook',
  (...)
]
```

The avaliable strategies are:
  * `CATEGORY`: looks at apps in the same category as the one given.
  * `SIMILAR`: looks at apps marked by Google Play as "similar" to the one given (only available for the Google Play store).
  * `COMPETITION`: looks at apps that target the same keywords as the one given. Note this strategy is expensive so it may require around a minute to resolve.
  * `ARBITRARY`: look at an arbitrary list of apps. For this strategy, the first argument should be an array of
  application IDs instead of a single one.
  * `KEYWORDS`: look at apps that target one of the given seed keywords. For this strategy, the first argument should be an array of keywords.

A common flow of work would be to try all the strategies for a given app, hand pick the most interesting
keywords and then run the `scores` function on them to analize their quality.

### App keywords

The `app` function returns an array of keywords extracted from title and description
of the app. The only argument is the Google Play ID of the application (the `?id=` parameter on the url).

```js
const aso = require('aso').gplay;

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
