const testCookies = new Map();

/**
 * Sets a test cookie or removes it when the value is falsy.
 * @param {string} name - The cookie name.
 * @param {*} value - The cookie value.
 */
export function setTestCookie(name, value) {
  if (!value) {
    testCookies.delete(name);
  } else {
    testCookies.set(name, value);
  }
}

/**
 * Removes all stored test cookies.
 */
export function clearTestCookies() {
  testCookies.clear();
}

/**
 * Retrieves a stored test cookie by name.
 * @param {string} name - The cookie name.
 * @returns {{value: *}|undefined} The cookie value, or `undefined` if no cookie is stored under the name.
 */
export function getTestCookie(name) {
  if (testCookies.has(name)) {
    return { value: testCookies.get(name) };
  }
  return undefined;
}

/**
 * Provides access to the current test cookies.
 * @returns {{get: Function, getAll: Function}} An object for retrieving individual cookies or all stored cookies.
 */
export async function cookies() {
  return {
    get: getTestCookie,
    getAll: () => {
      return Array.from(testCookies.entries()).map(([name, value]) => ({ name, value }));
    },
  };
}

/**
 * Provides an empty collection of request headers for tests.
 * @returns {Headers} An empty headers collection.
 */
export async function headers() {
  return new Headers();
}
