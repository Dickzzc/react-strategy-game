import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateConfig, summarize, createScenario } from '../scripts/perf/benchmark.mjs';

const config = JSON.parse(readFileSync(new URL('../scripts/perf/config.json', import.meta.url), 'utf8'));

test('performance gate uses nearest-rank percentiles and fails an exceeded budget', () => {
  const samples = Array.from({ length: 100 }, (_, i) => i + 1);
  const result = summarize(samples, { p95: 94, p99: 100 });
  assert.equal(result.metricsMs.p95, 95);
  assert.equal(result.metricsMs.p99, 99);
  assert.equal(result.passed, false);
  assert.equal(summarize(samples, { p95: 95, p99: 99 }).passed, true);
  assert.throws(() => summarize([NaN], { p95: 1, p99: 1 }));
});

test('performance configuration rejects missing or disabled budgets', () => {
  validateConfig(config);
  assert.throws(() => validateConfig({ ...config, sampleTicks: 0 }));
  assert.throws(() => validateConfig({ ...config, budgetsMs: { p95: 0, p99: 1 } }));
});

test('performance fixtures reproduce the same simulated state with a fixed seed', () => {
  for (const scenario of config.scenarios) {
    const first = createScenario(config, scenario);
    const second = createScenario(config, scenario);
    for (let i = 0; i < 150; i++) { first.step(); second.step(); }
    assert.equal(first.verify(), second.verify());
  }
});
