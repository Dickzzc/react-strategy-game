import test from 'node:test';
import assert from 'node:assert/strict';
import { Building, Unit } from '../src/game/entities.js';
import { World } from '../src/game/world.js';

function makeGrassWorld(width = 12, height = 12) {
  const world = new World(width, height);
  world.tiles = Array.from({ length: height }, () => Array(width).fill('grass'));
  return world;
}

test('world placement rejects water, out-of-bounds, and overlapping buildings', () => {
  const world = makeGrassWorld();
  world.tiles[4][4] = 'water';
  const hq = new Building(1, 1, 'blue', 'HQ', world);
  world.addEntity(hq);

  assert.equal(world.canPlaceBuilding(4, 4, 1, 1), false);
  assert.equal(world.canPlaceBuilding(11, 11, 2, 2), false);
  assert.equal(world.canPlaceBuilding(1, 1, 1, 1), false);
  assert.equal(world.canPlaceBuilding(6, 6, 2, 2), true);
});

test('world rectangle queries return entities intersecting the selection area', () => {
  const world = makeGrassWorld();
  const unit = new Unit(3, 3, 'blue', 'infantry', world);
  const building = new Building(8, 8, 'red', 'HQ', world);
  world.addEntity(unit);
  world.addEntity(building);

  assert.deepEqual(world.getEntitiesInRect(2, 2, 3, 3), [unit]);
  assert.deepEqual(world.getEntitiesInRect(7, 7, 3, 3), [building]);
  assert.deepEqual(world.getEntitiesInRect(0, 0, 1, 1), []);
});

test('unit movement advances toward a target and stops on an invalid map cell', () => {
  const world = makeGrassWorld();
  const unit = new Unit(2, 2, 'blue', 'infantry', world);
  world.addEntity(unit);
  unit.targetPos = { x: 5, y: 2 };

  world.update(0.5);
  assert.ok(unit.x > 2);
  assert.equal(unit.y, 2);

  unit.targetPos = { x: -10, y: 2 };
  const before = { x: unit.x, y: unit.y };
  world.update(2);
  assert.deepEqual({ x: unit.x, y: unit.y }, before);
  assert.equal(unit.targetPos, null);
});

test('world updates a stable entity snapshot when entities are added or removed', () => {
  const world = makeGrassWorld();
  const updates = [];
  const spawned = { health: 1, update: () => updates.push('spawned') };
  const removed = {
    health: 1,
    update() {
      updates.push('removed');
      world.addEntity(spawned);
      this.health = 0;
    },
  };
  const survivor = { health: 1, update: () => updates.push('survivor') };
  world.addEntity(removed);
  world.addEntity(survivor);

  world.update(1 / 60);

  assert.deepEqual(updates, ['removed', 'survivor']);
  assert.deepEqual(world.entities, [survivor, spawned]);
});

test('nested world updates do not overwrite the outer update snapshot', () => {
  const world = makeGrassWorld();
  const updates = [];
  let nested = false;
  world.addEntity({
    health: 1,
    update() {
      updates.push('first');
      if (!nested) {
        nested = true;
        world.update(1 / 60);
      }
    },
  });
  world.addEntity({ health: 1, update: () => updates.push('second') });

  world.update(1 / 60);

  assert.deepEqual(updates, ['first', 'first', 'second', 'second']);
});

test('building production adds the queued unit after its production time', () => {
  const world = makeGrassWorld();
  const factory = new Building(4, 4, 'blue', 'barracks', world);
  world.addEntity(factory);
  factory.produce('infantry');

  world.update(2.01);

  assert.equal(factory.queue.length, 0);
  assert.equal(world.entities.length, 2);
  assert.equal(world.entities[1].type, 'infantry');
  assert.equal(world.entities[1].owner, 'blue');
});
