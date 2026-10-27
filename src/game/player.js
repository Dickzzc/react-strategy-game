import { Building, Unit, BUILDING_DEFS, UNIT_DEFS } from './entities.js';

/**
 * 玩家控制器，负责资源管理、建造建筑、选中与命令单位等。
 */
export class Player {
  constructor(owner, world, engine) {
    this.owner = owner;
    this.world = world;
    this.engine = engine;
    this.resources = 1000;
    this.selectedEntities = [];
    this.constructionSites = [];
    // 创建初始基地在地图左上角
    const baseX = 2;
    const baseY = 2;
    const hq = new Building(baseX, baseY, owner, 'HQ', world);
    world.addEntity(hq);
    this.base = hq;
  }

  /** 更新玩家状态 */
  update(dt) {
    // 增加资源，每秒增长固定值
    this.resources += 10 * dt;
    // 更新建筑生产队列由 world 更新
    // 更新施工进度
    for (let i = this.constructionSites.length - 1; i >= 0; i--) {
      const site = this.constructionSites[i];
      site.progress += dt;
      if (site.progress >= site.buildTime) {
        // 完成建造
        const building = new Building(site.x, site.y, this.owner, site.type, this.world);
        this.world.addEntity(building);
        this.constructionSites.splice(i, 1);
      }
    }
  }

  /** 选中实体 */
  setSelection(entities) {
    this.selectedEntities = entities;
    if (this.engine.callbacks.onSelectionChange) {
      this.engine.callbacks.onSelectionChange(entities);
    }
    // 如果选中单个己方建筑，显示可建造列表
    if (entities.length === 1 && entities[0].isBuilding && entities[0].owner === this.owner) {
      const building = entities[0];
      // HQ 可以建造其他建筑，其他建筑如果有 produces 可生产
      let options = [];
      if (building.type === 'HQ') {
        options = Object.keys(BUILDING_DEFS).filter((key) => BUILDING_DEFS[key].cost > 0).map((key) => {
          const def = BUILDING_DEFS[key];
          return { type: key, name: def.name, cost: def.cost };
        });
      } else if (building.unitType) {
        const unitType = building.unitType;
        const def = UNIT_DEFS[unitType];
        options = [{ type: unitType, name: def.name, cost: def.cost, unit: true }];
      }
      if (options.length > 0) {
        this.engine.openBuildMenu(options);
      }
    } else {
      // 非单建筑选中时关闭菜单
      this.engine.openBuildMenu(null);
    }
  }

  /** 给当前选中单位下达移动命令 */
  moveSelectedTo(x, y) {
    for (const ent of this.selectedEntities) {
      if (ent instanceof Unit && ent.owner === this.owner) {
        ent.targetEntity = null;
        ent.targetPos = { x, y };
      }
    }
  }

  /** 给当前选中单位下达攻击命令 */
  attackSelected(target) {
    for (const ent of this.selectedEntities) {
      if (ent instanceof Unit && ent.owner === this.owner) {
        ent.targetEntity = target;
      }
    }
  }

  /** 在地图上放置建筑 */
  placeBuilding(gridX, gridY, type) {
    const def = BUILDING_DEFS[type];
    const cost = def.cost;
    if (this.resources < cost) {
      alert('资源不足');
      return false;
    }
    // 检查是否可以放置
    if (!this.world.canPlaceBuilding(gridX, gridY, def.width, def.height)) {
      alert('无法放置在此处');
      return false;
    }
    // 扣除资源并加入施工队列
    this.resources -= cost;
    this.constructionSites.push({ x: gridX, y: gridY, type, progress: 0, buildTime: 3 });
    // 更新资源回调
    if (this.engine.callbacks.onResourcesChange) {
      this.engine.callbacks.onResourcesChange({ player: this.resources, ai: this.engine.ai.resources });
    }
    return true;
  }

  /** 在建筑内生产单位 */
  produceUnit(building, unitType) {
    const def = UNIT_DEFS[unitType];
    if (this.resources < def.cost) {
      alert('资源不足');
      return false;
    }
    building.produce(unitType);
    this.resources -= def.cost;
    if (this.engine.callbacks.onResourcesChange) {
      this.engine.callbacks.onResourcesChange({ player: this.resources, ai: this.engine.ai.resources });
    }
    return true;
  }

  /** 序列化玩家数据 */
  serialize() {
    return {
      owner: this.owner,
      resources: this.resources,
      selectedIds: this.selectedEntities.map((e) => this.world.entities.indexOf(e)),
      constructionSites: this.constructionSites.map((c) => ({ ...c })),
    };
  }

  /** 反序列化玩家数据并重建状态 */
  deserialize(data) {
    this.resources = data.resources;
    this.constructionSites = data.constructionSites || [];
    // 取消旧选择
    this.setSelection([]);
  }
}