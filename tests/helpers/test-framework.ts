export interface TestCaseResult {
  suite: string;
  name: string;
  tier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
  featureId?: number;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface TestSuiteResult {
  name: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  tests: TestCaseResult[];
}

export interface FullRunReport {
  timestamp: string;
  durationMs: number;
  total: number;
  passed: number;
  failed: number;
  byTier: {
    tier1: { total: number; passed: number; failed: number };
    tier2: { total: number; passed: number; failed: number };
    tier3: { total: number; passed: number; failed: number };
    tier4: { total: number; passed: number; failed: number };
  };
  byFeature: Record<number, { name: string; total: number; passed: number; failed: number }>;
  failures: Array<{ suite: string; name: string; tier: string; error: string }>;
  suites: TestSuiteResult[];
}

class TestContext {
  private currentSuite = 'Default Suite';
  private currentTier: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1';
  private currentFeatureId?: number;
  private results: TestCaseResult[] = [];

  setSuite(name: string, tier: 'tier1' | 'tier2' | 'tier3' | 'tier4' = 'tier1', featureId?: number) {
    this.currentSuite = name;
    this.currentTier = tier;
    this.currentFeatureId = featureId;
  }

  setTier(tier: 'tier1' | 'tier2' | 'tier3' | 'tier4') {
    this.currentTier = tier;
  }

  setFeatureId(id: number | undefined) {
    this.currentFeatureId = id;
  }

  record(name: string, passed: boolean, durationMs: number, error?: string) {
    this.results.push({
      suite: this.currentSuite,
      name,
      tier: this.currentTier,
      featureId: this.currentFeatureId,
      passed,
      durationMs,
      error,
    });
  }

  getResults(): TestCaseResult[] {
    return this.results;
  }

  clear() {
    this.results = [];
  }
}

export const context = new TestContext();

export function describe(name: string, fn: () => void | Promise<void>, options?: { tier?: 'tier1' | 'tier2' | 'tier3' | 'tier4'; featureId?: number }) {
  context.setSuite(name, options?.tier || 'tier1', options?.featureId);
  return fn();
}

export async function it(name: string, testFn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    const res = testFn();
    if (res instanceof Promise) {
      await res;
    }
    const duration = performance.now() - start;
    context.record(name, true, duration);
  } catch (err: any) {
    const duration = performance.now() - start;
    context.record(name, false, duration, err?.message || String(err));
  }
}

export const test = it;

export function expect(actual: any) {
  const isNot = false;

  const createAssertion = (negate: boolean) => ({
    toBe(expected: any) {
      const pass = Object.is(actual, expected);
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'not to be' : 'to be'} ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      const pass = JSON.stringify(actual) === JSON.stringify(expected);
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'not to equal' : 'to equal'} ${JSON.stringify(expected)}`);
      }
    },
    toBeTruthy() {
      const pass = Boolean(actual);
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'to be falsy' : 'to be truthy'}`);
      }
    },
    toBeFalsy() {
      const pass = !Boolean(actual);
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'to be truthy' : 'to be falsy'}`);
      }
    },
    toBeGreaterThan(expected: number) {
      const pass = typeof actual === 'number' && actual > expected;
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${actual} ${negate ? 'not to be greater than' : 'to be greater than'} ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected: number) {
      const pass = typeof actual === 'number' && actual >= expected;
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${actual} ${negate ? 'not to be greater than or equal to' : 'to be greater than or equal to'} ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      const pass = typeof actual === 'number' && actual < expected;
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${actual} ${negate ? 'not to be less than' : 'to be less than'} ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: number) {
      const pass = typeof actual === 'number' && actual <= expected;
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${actual} ${negate ? 'not to be less than or equal to' : 'to be less than or equal to'} ${expected}`);
      }
    },
    toContain(itemOrSubstr: any) {
      let pass = false;
      if (typeof actual === 'string' && typeof itemOrSubstr === 'string') {
        pass = actual.includes(itemOrSubstr);
      } else if (Array.isArray(actual)) {
        pass = actual.includes(itemOrSubstr);
      } else if (actual && typeof actual === 'object') {
        pass = itemOrSubstr in actual;
      }
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'not to contain' : 'to contain'} ${JSON.stringify(itemOrSubstr)}`);
      }
    },
    toMatch(regex: RegExp) {
      const pass = regex.test(String(actual));
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${JSON.stringify(actual)} ${negate ? 'not to match' : 'to match'} ${regex}`);
      }
    },
    toBeDefined() {
      const pass = actual !== undefined;
      if (negate ? pass : !pass) {
        throw new Error(`Expected value ${negate ? 'to be undefined' : 'to be defined'}`);
      }
    },
    toBeUndefined() {
      const pass = actual === undefined;
      if (negate ? pass : !pass) {
        throw new Error(`Expected value ${negate ? 'to be defined' : 'to be undefined'}`);
      }
    },
    toBeNull() {
      const pass = actual === null;
      if (negate ? pass : !pass) {
        throw new Error(`Expected value ${negate ? 'not to be null' : 'to be null'}`);
      }
    },
    toBeCloseTo(expected: number, delta = 0.01) {
      const pass = Math.abs(actual - expected) <= delta;
      if (negate ? pass : !pass) {
        throw new Error(`Expected ${actual} ${negate ? 'not to be close to' : 'to be close to'} ${expected} within delta ${delta}`);
      }
    },
    toThrow(expectedMessage?: string | RegExp) {
      if (typeof actual !== 'function') {
        throw new Error(`Expected a function to test throwing, got ${typeof actual}`);
      }
      let threw = false;
      let thrownError: any;
      try {
        actual();
      } catch (err: any) {
        threw = true;
        thrownError = err;
      }
      if (!negate && !threw) {
        throw new Error('Expected function to throw an error, but it did not');
      }
      if (negate && threw) {
        throw new Error(`Expected function not to throw, but it threw: ${thrownError?.message || thrownError}`);
      }
      if (!negate && threw && expectedMessage) {
        const msg = thrownError?.message || String(thrownError);
        if (typeof expectedMessage === 'string' && !msg.includes(expectedMessage)) {
          throw new Error(`Expected thrown error message to include "${expectedMessage}", but got "${msg}"`);
        } else if (expectedMessage instanceof RegExp && !expectedMessage.test(msg)) {
          throw new Error(`Expected thrown error message to match ${expectedMessage}, but got "${msg}"`);
        }
      }
    },
  });

  return {
    ...createAssertion(false),
    not: createAssertion(true),
  };
}
