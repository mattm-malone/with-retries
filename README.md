# with-retries
`with-retries` is a utility for retrying functions and promises on failure.

## Docs
- [Installation](#installation)
- [API](#api)
- [Usage](#usage)

## Installation
### using npm:
```shell
npm install with-retries
```

### using yarn:
```shell
yarn add with-retries
```

## API
### How to import:
- Root level import using ES6 `import`:
```js
import withRetries from 'with-retries';
```

- Root level import using CommonJS `require`:
```js
const withRetries = require('with-retries').default;
```

### `withRetries(func, [options]})`
#### Description
Returns a new async function that, when invoked, will invoke the given `func`. If the given `func` throws an error or
rejects, `with-retries` will attempt to invoke the function again.

#### Arguments
* `func` - The function to invoke.
* `options` - Optional. Configures how `func` is invoked, retried

The following describes what the available options are:

| Property | Description | Type | Default |
|----------|-------------|------|---------|
| [attempts.max](#attemptsmax) | Max number of times to try operation before giving up. | `number` | `5` |
| [attempts.when](#attemptswhen-conditional-retry) | Predicate function that determines whether to retry or not. | `(result: any) => boolean` | `undefined` |
| [delay.exponentialBackoff](#delayexponentialbackoff) | Whether or not to use exponential backoff. | `boolean` | `true` |
| [delay.jitter](#delayjitter) | Whether or not to use exponential backoff. | `boolean` | `true` |
| [delay.initial](#delayinitial) | Time in milliseconds before first retry (all if jitter and exponentialBackoff are false). | `number` | `100` |
| [delay.max](#delaymax) | Time in milliseconds before first retry (all if jitter and exponentialBackoff are false). | `number` | `Infinity` |
| [errorHandler](#errorhandler-define-error-behavior) | Function to handle caught error. | `(error: Error) => any` | `undefined` |
| [scope](#scope-applying-scope-to-class-function) | The value to use as `this` when invoking `func`. | `object` | `undefined` |

#### Return Value
Asynchronous function that:
* When invoked, will invoke the given `func`.
* Due to how the delay is implemented, the returned function will _always_ be `async`, regardless of whether the passed in `func` is or isn't.

## Usage
### Simple function:
```javascript
import withRetries from 'with-retries'
const powerWithRetry = withRetries(Math.pow);
const twoSquared = await powerWithRetry(2, 2);
// 4
```
Or more simply, combine the construction of retry-function and invocation:
```javascript
import withRetries from 'with-retries'
const twoSquared = await withRetries(Math.pow)(2, 2);
// 4
```
Because `Math.pow` never threw an error or rejected, the result is simply returned, without any retries.

### With a constantly failing function:
```javascript
const failingFunc = () => {
  console.count('attempt');
  throw new Error('Failed :(');
}
await withRetries(failingFunc, { exponentialBackoff: false })()
// at 0ms:    attempt: 1
// at 100ms:  attempt: 2
// at 200ms:  attempt: 3
// at 300ms:  attempt: 4
// at 400ms:  attempt: 5
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

### Function begins fails on first call, succeeds on 3rd attempt
```javascript
let iter = 0;
const partiallyFailingFunc = () => {
  console.count('attempt');
  iter++;
  if (iter <= 1) throw new Error('Failed :(');
  return 'success!'
}
const result = await withRetries(partiallyFailingFunc, { exponentialBackoff: false })()
// at 0ms:   attempt: 1
// at 100ms: attempt: 2
// at 200ms: returns 'success!'
```

### Options:

#### `options.attempts`


##### `attempts.max` 
Defines max number of possible attempts. Defaults to `5`.
```javascript
await withRetries(failingFunc, { maxAttempts: 2})()
// attempt: 1
// attempt: 2
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

##### `attempts.when`: Conditional Retry
If you want to retry the function not just on an error, but on a certain condition, you can do so by passing in a `when` function to `options.attempts`.

For example, you may want to `fetch` if the response doesn't contain what you want, or has a certain status code.
```javascript
const fetchWithRetries = withRetries(fetch, { attempts: { when: (resp) => !resp.ok } }); // Retry when response is NOT ok (not 200/300)
await fetchWithRetries('https://httpbin.org/status/503');
// attempt: 1
// attempt: 2
// attempt: 3
// ...UnhandledPromiseRejectionWarning: Error: Failed given conditon
```

You can also do this with synchronous functions. For example, retry when function result is less than three:
```javascript
const lessThanThree = (res: number) => res < 3;
let iter = 0;
const func = () => {
  console.count('attempt');
  iter++;
  return iter;
}
console.log()
const result = await withRetries(func, { attempts: { when: lessThanThree } })();
console.log('result: ', result);
// attempt: 1
// attempt: 2
// attempt: 3
// result: 3
```
NOTE: `withRetries` will still retry on a rejected promise or exception, regardless of whether `when` was passed in or not.

#### `options.delay`
##### `delay.exponentialBackoff`
By default, the delay between each invocation is increasingly delayed exponentially. Jitter is also applied by default, but for the sake of demonstration this will be disabled.
Without jitter enabled, the delay between each invocation is defined as `delay.initial * 2 ** attempt`.

For example:

```javascript
await withRetries(failingFunc, { delay: { jitter: false } })()
// at 0ms:    attempt: 1, next delay 100ms
// at 100ms:  attempt: 2, next delay 200ms
// at 300ms:  attempt: 3, next delay 400ms
// at 700ms:  attempt: 4, next delay 800ms
// at 1500ms: attempt: 5, next delay 800ms
// ...UnhandledPromiseRejectionWarning
```

##### `delay.jitter`
By default, the delay between each invocation is not only increased exponentially, but also randomized between `0ms` (instant) and 2x the exponentially increasing delay.
This is done to alleviate the [thundering herd problem](https://en.wikipedia.org/wiki/Thundering_herd_problem) by distributing calls.

The delay between each invocation is defined as `randomBetween(0, Math.min(maxDelay, delay.initial * 2 ** attempt))`.

Here is an example of potential delays with jitter enabled:
```javascript
await withRetries(failingFunc)()
// at 0ms:    attempt: 1, next delay 24ms
// at 24ms:   attempt: 2, next delay 81ms
// at 105ms:  attempt: 3, next delay 327ms
// at 432ms:  attempt: 4, next delay 782ms
// at 1214ms: attempt: 5, next delay 991ms
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

This still follows exponential growth on average, however the jitter may help distribute load.

##### `delay.initial`
Defines the initial delay in milliseconds. If exponential backoff is disabled, then `delay.initial` will be used as a constant
delay between each invocation.

```javascript
await withRetries(failingFunc, { delay: { exponentialBackoff: false, initial: 10 } })();
// at 0ms:   attempt: 1
// at 10ms:  attempt: 2
// at 20ms:  attempt: 3
// at 30ms:  attempt: 4
// at 40ms:  attempt: 5
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

##### `delay.max`
Defines the maximum possible delay in milliseconds.

```javascript
await withRetries(failingFunc, { delay: { max: 200 } })();
// at 0ms:    attempt: 1, next delay 100ms
// at 100ms:  attempt: 2, next delay 200ms
// at 300ms:  attempt: 3, next delay 200ms
// at 500ms:  attempt: 4, next delay 200ms
// at 700ms:  attempt: 5, next delay 200ms
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

#### `errorHandler`: Define error behavior
If you don't want to throw an error after reaching `maxAttempts`, or want to modify/create a custom error to throw, then pass in an `errorHandler` function to the options.

Throwing a custom error:
```javascript
const errorHandler = (err) => { throw new Error('custom error') };
const failingFunc = () => { throw new Error('original error') };
await withRetries(failingFunc, { errorHandler })();
// ...UnhandledPromiseRejectionWarning: Error: custom error
```

Eat and log error instead of throwing:
```javascript
const errorHandler = (err) => { console.error('Caught error', { err }) };
const failingFunc = () => { throw new Error('bad error') };
await withRetries(failingFunc, { errorHandler })();
// Console.error: Caught error Object { err: Error }
```

#### `scope`: Applying scope to class function:
If the provided `func` refers to `this` in a class, you will need to pass the scope/class into the `scope` param of the options.
Consider the following two snippets (using promise syntax instead of async await):
```javascript
class Api {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getRecipes() {
    return fetch(`${this.baseUrl}/recipes`);
  }
}

const foodApi = new Api('https://www.myFoodApi.com');
const getWithRetriesCorrect = withRetries(foodApi.getRecipes, { scope: foodApi });
getWithRetriesCorrect()
        .then(resp => { console.log(resp) });
// ...response
```
Because the scope was passed in, `getRecipes` was able to successfully fetch at the correct url.

```javascript
const getWithRetriesWRONG = withRetries(foodApi.getRecipes);
getWithRetriesWRONG()
        .then(resp => {  console.log(resp) }) // This won't happen!
        .catch(err => { console.log('Error:', err) });
// ...Error: Cannot fetch url "undefined/recipes"
```
Without the scope, `this.baseUrl` will be undefined, and the method will fail.
