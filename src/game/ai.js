import { Building, Unit, BUILDING_DEFS, UNIT_DEFS } from './entities.js';

/**
 * 简单的 AI 控制器。AI 按固定顺序建造建筑并训练军队，满足一定数量后发起攻击。
 */
export class AI {
  constructor(owner, world, player, engine) {
    this.owner = owner;
    this.world = world;
    this.player = player;
    this.engine = engine;
    this.resources = 1000;
    this.constructionSites = [];
    this.buildings = [];
    // 创建初始基地
    const baseX = world.width - 4;
    const baseY = world.height - 4;
    const hq = new Building(baseX, baseY, owner, 'HQ', world);
    world.addEntity(hq);
    this.buildings.push(hq);
    this.base = hq;
    this.buildOrder = ['power', 'barracks', 'factory'];
    this.buildIndex = 0;
    this.attackThreshold = 5;
    this.hasAttacked = false;
  }
  /** 更新 AI 状态 */
  update(dt) {
    // 资源增长
    this.resources += 8 * dt;
    // 更新施工进度
    for (let i = this.constructionSites.length - 1; i >= 0; i--) {
      const site = this.constructionSites[i];
      site.progress += dt;
      if (site.progress >= site.buildTime) {
        const building = new Building(site.x, site.y, this.owner, site.type, this.world);
        this.world.addEntity(building);
        this.buildings.push(building);
        this.constructionSites.splice(i, 1);
      }
    }
    // 建造新建筑按顺序
    if (this.buildIndex < this.buildOrder.length) {
      const type = this.buildOrder[this.buildIndex];
      const def = BUILDING_DEFS[type];
      if (this.resources >= def.cost) {
        // 随机找位置，尝试数次
        for (let attempt = 0; attempt < 20; attempt++) {
          const gx = Math.floor(this.world.width * 0.6 + Math.random() * (this.world.width * 0.35));
          const gy = Math.floor(Math.random() * (this.world.height - def.height));
          if (this.world.canPlaceBuilding(gx, gy, def.width, def.height)) {
            this.resources -= def.cost;
            this.constructionSites.push({ x: gx, y: gy, type, progress: 0, buildTime: 3 });
            this.buildIndex++;
            break;
          }
        }
      }
    }
    // 训练单位
    for (const b of this.buildings) {
      if (b.unitType) {
        const unitDef = UNIT_DEFS[b.unitType];
        // AI 会保持队列数量不超过 2
        if (b.queue.length < 2 && this.resources >= unitDef.cost) {
          b.produce(b.unitType);
          this.resources -= unitDef.cost;
        }
      }
    }
    // 攻击逻辑：单位数量达到阈值后向玩家基地推进
    const myUnits = this.world.entities.filter((e) => e instanceof Unit && e.owner === this.owner);
    if (!this.hasAttacked && myUnits.length >= this.attackThreshold) {
      this.hasAttacked = true;
      for (const unit of myUnits) {
        unit.targetEntity = this.player.base;
      }
    }
  }
  /** 序列化 AI 状态 */
  serialize() {
    return {
      resources: this.resources,
      constructionSites: this.constructionSites.map((c) => ({ ...c })),
      buildIndex: this.buildIndex,
      hasAttacked: this.hasAttacked,
    };
  }
  /** 反序列化 AI 状态 */
  deserialize(data) {
    this.resources = data.resources;
    this.constructionSites = data.constructionSites || [];
    this.buildIndex = data.buildIndex || 0;
    this.hasAttacked = data.hasAttacked || false;
    // 重建 AI 建筑列表
    this.buildings = this.world.entities.filter((e) => e.owner === this.owner && e.isBuilding);
  }
}