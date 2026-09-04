const testCookies = new Map();

export function setTestCookie(name, value) {
  if (!value) {
    testCookies.delete(name);
  } else {
    testCookies.set(name, value);
  }
}

export function clearTestCookies() {
  testCookies.clear();
}

export async function cookies() {
  return {
    get: (name) => {
      if (testCookies.has(name)) {
        return { value: testCookies.get(name) };
      }
      return undefined;
    },
    getAll: () => {
      return Array.from(testCookies.entries()).map(([name, value]) => ({ name, value }));
    },
  };
}

export async function headers() {
  return new Headers();
}
