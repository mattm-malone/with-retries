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
* `options` - Optional. Configures how `func` is invoked and retried.

The following describes what the available options are:
| Property | Description | Type | Default |
|----------|-------------|------|---------|
| [delay](#maxattempts-and-delay) | Time in milliseconds to delay each re-invocation. | `number` | `500` |
| [errorHandler](#errorHandler-define-error-behavior) | Function to handle caught error. | `(error: Error) => any` | `undefined` |
| [maxAttempts](#maxattempts-and-delay) | How many times to attempt function upon failure. | `number` | `3` |
| [scope](#scope-applying-scope-to-class-function) | The value to use as `this` when invoking `func`. | `object` | `undefined` |
| [when](#when-conditional-retry) | Function that determines whether to retry or not. | `(result: any) => boolean` | `undefined` |

#### Return Value
Asynchronous function that:
* Returns async function that, when invoked, will invoke the given `func`.
* Due to how the delay is implemented, the returned function will _always_ be `async`, regardless of whether `func` is or isn't.

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
await withRetries(failingFunc)()
// at 0ms:    attempt: 1
// at 500ms:  attempt: 2
// at 1000ms: attempt: 3
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
const result = await withRetries(partiallyFailingFunc)()
// at 0ms:   attempt: 1
// at 500ms: attempt: 2
// at 1000ms: returns 'success!'
```

### Options:
#### `maxAttempts` and `delay`
With a `maxAttempts` of 2 and `delay` of 10, the function will be invoked a maximum of 2 times with a 10ms delay between each invocation.
```javascript
await withRetries(failingFunc, { maxAttempts: 2, delay: 10 })()
// at 0ms:   attempt: 1
// at 10ms:  attempt: 2
// ...UnhandledPromiseRejectionWarning: Error: Fail :(
```

#### `errorHandler`: Define error behavior
If you don't want to throw an error after reaching `maxAttempts`, or want to modify/create a custom error to throw, then pass in an `errorHandler` function to the options.

Throwing a custom error:
```javascript
const errorHandler = (err) => { throw new Error('custom error') };
const failingFunc = () => { throw new Error('original error') };
await withRetries(failingFunc, { errorHandler })();
// at 0ms:    attempt: 1
// at 500ms:  attempt: 2
// at 1000ms: attempt: 3
// ...UnhandledPromiseRejectionWarning: Error: custom error
```

Eat and log error instead of throwing:
```javascript
const errorHandler = (err) => { console.error('Caught error', { err }) };
const failingFunc = () => { throw new Error('bad error') };
await withRetries(failingFunc, { errorHandler })();
// at 0ms:    attempt: 1
// at 500ms:  attempt: 2
// at 1000ms: attempt: 3
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

#### `when`: Conditional Retry
If you want to retry the function not just on an error, but on a certain condition, you can do so by passing in a `when` function.

For example, you may want to `fetch` if the response doesn't contain what you want, or has a certain status code.
```javascript
const fetchWithRetries = withRetries(fetch, { when: (resp) => !resp.ok }); // Retry when response is NOT ok (not 200/300)
await fetchWithRetries('https://httpbin.org/status/503');
// at 0ms:    attempt: 1
// at 500ms:  attempt: 2
// at 1000ms: attempt: 3
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
await withRetries(func, { when: lessThanThree })();
// at 0ms:    attempt: 1
// at 500ms:  attempt: 2
// at 1000ms: attempt: 3 Returns 3
```
NOTE: `withRetries` will still retry on a rejected promise or exception, regardless of whether `when` was passed in or not.


## Coming soon:
* Exponential backoff
  * This will be the default retry logic on promises/async functions. Exponential backoff helps prevent network congestion.