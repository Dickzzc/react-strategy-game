import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { World } from '../../src/game/world.js';
import { Unit, Building } from '../../src/game/entities.js';

export function validateConfig(config) {
  assert.equal(config.schemaVersion, 1, 'unsupported performance config schema');
  for (const field of ['seed', 'mapSize', 'warmupTicks', 'sampleTicks']) {
    assert.ok(Number.isSafeInteger(config[field]) && config[field] > 0, `invalid ${field}`);
  }
  assert.ok(config.mapSize >= 12 && config.mapSize <= 200, 'mapSize must be 12..200');
  assert.ok(Number.isFinite(config.fixedDt) && config.fixedDt > 0 && config.fixedDt <= 0.1, 'invalid fixedDt');
  for (const field of ['p95', 'p99']) {
    assert.ok(Number.isFinite(config.budgetsMs[field]) && config.budgetsMs[field] > 0, `invalid ${field} budget`);
  }
  assert.deepEqual(config.scenarios.map(s => s.name), ['movement', 'combat', 'production']);
  for (const scenario of config.scenarios) {
    assert.ok(Number.isSafeInteger(scenario.entities) && scenario.entities >= 2 && scenario.entities <= 4096, 'invalid entities');
  }
}

export function summarize(samplesMs, budgetsMs) {
  assert.ok(samplesMs.length > 0 && samplesMs.every(n => Number.isFinite(n) && n >= 0), 'invalid samples');
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const percentile = p => sorted[Math.ceil(p * sorted.length) - 1];
  const metrics = {
    mean: samplesMs.reduce((sum, n) => sum + n, 0) / samplesMs.length,
    p95: percentile(0.95), p99: percentile(0.99), max: sorted.at(-1),
  };
  return { metricsMs: metrics, passed: metrics.p95 <= budgetsMs.p95 && metrics.p99 <= budgetsMs.p99 };
}

export function createScenario(config, scenario) {
  let state = config.seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const world = new World(config.mapSize, config.mapSize);
  // Replace the game's random terrain only inside this fixture. No global RNG override.
  world.tiles = Array.from({ length: config.mapSize }, () => Array(config.mapSize).fill('grass'));
  for (let i = 0; i < scenario.entities; i++) {
    const x = 2 + random() * (config.mapSize - 8);
    const y = 2 + random() * (config.mapSize - 8);
    const owner = i % 2 ? 'red' : 'blue';
    const entity = scenario.name === 'production'
      ? new Building(Math.floor(x), Math.floor(y), owner, 'barracks', world)
      : new Unit(x, y, owner, i % 3 ? 'infantry' : 'lightTank', world);
    // A sustained combat workload: prevent deaths from shrinking the measured population.
    if (scenario.name === 'combat') entity.health = entity.maxHealth = 100000;
    world.addEntity(entity);
  }
  const initialEntities = [...world.entities];
  if (scenario.name === 'combat') {
    initialEntities.forEach((entity, i) => { entity.targetEntity = initialEntities[(i + 1) % initialEntities.length]; });
  }
  let ticks = 0;
  return {
    world,
    step() {
      // Command generation is deliberately outside the timed World.update call.
      for (const entity of world.entities) {
        if (entity.isBuilding) {
          if (entity.queue.length === 0) entity.produce('infantry');
        } else if (scenario.name !== 'combat' && !entity.targetPos) {
          entity.targetPos = { x: 2 + random() * (config.mapSize - 5), y: 2 + random() * (config.mapSize - 5) };
        }
      }
      const start = performance.now();
      world.update(config.fixedDt);
      const elapsed = performance.now() - start;
      ticks++;
      assert.ok(world.entities.length >= initialEntities.length, 'workload unexpectedly shrank');
      assert.ok(world.entities.every(e => Number.isFinite(e.x) && Number.isFinite(e.y) && e.health > 0), 'invalid simulation state');
      return elapsed;
    },
    verify() {
      if (scenario.name === 'production' && ticks * config.fixedDt >= 2.01) {
        assert.ok(world.entities.length > initialEntities.length, 'production did not spawn units');
      }
      if (scenario.name === 'combat') {
        assert.ok(initialEntities.some(e => e.health < e.maxHealth), 'combat workload did not inflict damage');
      }
      if (scenario.name === 'movement') {
        assert.ok(world.entities.some(e => e.targetPos), 'movement workload is inactive');
      }
      return createHash('sha256').update(JSON.stringify(world.serialize())).digest('hex');
    },
  };
}

export function runScenario(config, scenario) {
  const fixture = createScenario(config, scenario);
  for (let i = 0; i < config.warmupTicks; i++) fixture.step();
  const samplesMs = Array.from({ length: config.sampleTicks }, () => fixture.step());
  const stateHash = fixture.verify();
  return {
    name: scenario.name, initialEntities: scenario.entities, finalEntities: fixture.world.entities.length,
    ...summarize(samplesMs, config.budgetsMs), stateHash, samplesMs,
  };
}
