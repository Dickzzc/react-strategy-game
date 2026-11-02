import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import { cpus, platform, release, arch } from 'node:os';
import { validateConfig, runScenario } from './benchmark.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const { values } = parseArgs({ options: { config: { type: 'string' }, output: { type: 'string' } } });
const configPath = values.config ? resolve(values.config) : fileURLToPath(new URL('./config.json', import.meta.url));
const config = JSON.parse(await readFile(configPath, 'utf8'));
validateConfig(config);
const timestamp = new Date().toISOString();
const output = values.output ? resolve(values.output)
  : resolve(root, '.codex-perf-logs', `quick-${timestamp.replaceAll(':', '-')}-${process.pid}.json`);
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const results = config.scenarios.map(s => runScenario(config, s));
const report = {
  schemaVersion: 1, timestamp, scope: 'CPU World.update only',
  excluded: ['Canvas rendering', 'GPU', 'React UI', 'player/AI controllers', 'browser FPS'],
  runtime: { node: process.version, platform: platform(), osRelease: release(), arch: arch(), cpu: cpus()[0]?.model },
  source: { commit: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain').length > 0 },
  config, results, passed: results.every(r => r.passed),
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log('Scope: CPU World.update only; browser FPS/GPU: NOT MEASURED');
for (const r of results) {
  console.log(`${r.name}: entities=${r.initialEntities}->${r.finalEntities} p95 update=${r.metricsMs.p95.toFixed(4)}ms p99 update=${r.metricsMs.p99.toFixed(4)}ms ${r.passed ? 'PASS' : 'FAIL'}`);
}
console.log(`Budgets (policy): p95 <= ${config.budgetsMs.p95}ms, p99 <= ${config.budgetsMs.p99}ms`);
console.log(`Report: ${output}`);
if (!report.passed) process.exitCode = 1;
