# with-retries
`with-retries` is a utility for retrying async promises on failure.

## Installation
### using npm:
```
npm install with-retries
```
### using yarn:
```
yarn add with-retries
```

## API
### How to import:
- Root level import using ES6 `import`:
    ```
    import withRetries from 'with-retries';
    ```
- Root level import using CommonJS `require`:
    ```
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
| scope | The value to use as `this` when invoking `func`. | object | `undefined` |
| attempts | How many times to attempt function upon failure. | number | `3` |
| delay | Time in milliseconds to delay each re-invocation. | number | `500` |

#### Return Value
Asynchronous function that:
* Returns async function that, when invoked, will invoke the given `func`.
* Due to how the delay is implemented, the returned function will _always_ be `async`, regardless of whether `func` is or isn't.

## Example Usage
### Simple function:
```javascript
import withRetries from 'with-retries'
const powerWithRetry = withRetries(Math.pow);
const twoSquared = powerWithRetry(2, 2);
// 4
```
Or more simply, combine the construction of retry-function and invocation:
```javascript
import withRetries from 'with-retries'
const twoSquared = withRetries(Math.pow)(2, 2);
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

#### With options:
```javascript
await withRetries(failingFunc, { attempts: 2, delay: 10 })()
// at 0ms:   attempt: 1
// at 10ms:  attempt: 2
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

### Applying scope to class function:
If the provided `func` refers to `this` in a class, you will need to pass the scope/class into the `scope` param of the options.
Consider the following two snippets (using promise syntax instead of await) :
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


## Coming soon:
* Exponential backoff
  * This will be the default retry logic. Exponential backoff helps prevent network congestion.
* Optional error condition method
  * Pass in method that determines whether the result of `func` is a failure or not. This will make the use of this module much more versatile.
  