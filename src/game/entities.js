// 定义建筑和单位的属性、行为以及基类

export const BUILDING_DEFS = {
  HQ: {
    name: '基地',
    width: 2,
    height: 2,
    maxHealth: 1000,
    cost: 0,
    produces: ['barracks', 'factory', 'power'],
  },
  barracks: {
    name: '兵营',
    width: 2,
    height: 2,
    maxHealth: 600,
    cost: 300,
    unitType: 'infantry',
    productionTime: 2,
  },
  factory: {
    name: '战车工厂',
    width: 3,
    height: 3,
    maxHealth: 800,
    cost: 500,
    unitType: 'lightTank',
    productionTime: 4,
  },
  power: {
    name: '发电厂',
    width: 2,
    height: 2,
    maxHealth: 400,
    cost: 200,
    produces: [],
  },
};

export const UNIT_DEFS = {
  infantry: {
    name: '步兵',
    width: 1,
    height: 1,
    maxHealth: 100,
    speed: 4,
    damage: 10,
    range: 1.5,
    cost: 100,
  },
  lightTank: {
    name: '轻型坦克',
    width: 2,
    height: 2,
    maxHealth: 300,
    speed: 2.5,
    damage: 25,
    range: 2,
    cost: 400,
  },
  heavyTank: {
    name: '重型坦克',
    width: 3,
    height: 3,
    maxHealth: 500,
    speed: 1.5,
    damage: 40,
    range: 2.5,
    cost: 700,
  },
};

/** 基类，所有实体（单位和建筑）共同的属性和方法 */
export class Entity {
  constructor(x, y, width, height, owner, type) {
    this.x = x; // 网格坐标
    this.y = y;
    this.width = width;
    this.height = height;
    this.owner = owner;
    this.type = type;
    this.health = 1;
    this.maxHealth = 1;
    this.isBuilding = false;
  }
  /** 更新，子类覆盖 */
  update(dt) {}
  /** 渲染，子类覆盖 */
  render(ctx, tileW, tileH) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(this.x * tileW, this.y * tileH, this.width * tileW, this.height * tileH);
  }
  /** 受到伤害 */
  takeDamage(amount) {
    this.health -= amount;
  }
  /** 序列化公用字段 */
  serialize() {
    return {
      class: this.constructor.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      owner: this.owner,
      type: this.type,
      health: this.health,
    };
  }
}

/** 单位类：可移动、攻击 */
export class Unit extends Entity {
  constructor(x, y, owner, unitType, world) {
    const def = UNIT_DEFS[unitType];
    super(x, y, def.width, def.height, owner, unitType);
    this.world = world;
    this.name = def.name;
    this.maxHealth = def.maxHealth;
    this.health = def.maxHealth;
    this.speed = def.speed; // 格子/秒
    this.damage = def.damage;
    this.range = def.range;
    this.targetPos = null;
    this.targetEntity = null;
  }
  /** 朝目标移动或攻击 */
  update(dt) {
    // 如果有目标实体且仍存活则追踪
    if (this.targetEntity && this.world.entities.includes(this.targetEntity)) {
      const dist = this.distanceToEntity(this.targetEntity);
      if (dist <= this.range) {
        // 攻击
        this.targetEntity.takeDamage(this.damage * dt);
      } else {
        // 移动向目标实体
        const tx = this.targetEntity.x;
        const ty = this.targetEntity.y;
        this.moveTowards(tx, ty, dt);
      }
    } else if (this.targetPos) {
      const { x: tx, y: ty } = this.targetPos;
      const dx = tx - this.x;
      const dy = ty - this.y;
      if (Math.hypot(dx, dy) > 0.1) {
        this.moveTowards(tx, ty, dt);
      } else {
        // 到达目标
        this.targetPos = null;
      }
    }
  }
  /** 根据速度逐渐靠近目标 */
  moveTowards(tx, ty, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const vx = (dx / dist) * this.speed;
    const vy = (dy / dist) * this.speed;
    const newX = this.x + vx * dt;
    const newY = this.y + vy * dt;
    // 防止进入水域或超出地图
    const gx = Math.floor(newX);
    const gy = Math.floor(newY);
    if (this.world.inBounds(gx, gy) && this.world.tiles[gy][gx] !== 'water') {
      this.x = newX;
      this.y = newY;
    } else {
      // 避免卡死，停止移动
      this.targetPos = null;
    }
  }
  /** 当前单位与另一个实体的距离（按中心点） */
  distanceToEntity(entity) {
    const ax = this.x + this.width / 2;
    const ay = this.y + this.height / 2;
    const bx = entity.x + entity.width / 2;
    const by = entity.y + entity.height / 2;
    return Math.hypot(ax - bx, ay - by);
  }
  /** 渲染单位：用不同颜色和简单形状表示 */
  render(ctx, tileW, tileH) {
    ctx.save();
    // 根据阵营着色
    ctx.fillStyle = this.owner === 'blue' ? '#3c77d7' : '#c43c39';
    ctx.fillRect(this.x * tileW, this.y * tileH, this.width * tileW, this.height * tileH);
    // 绘制生命条
    const hpRatio = this.health / this.maxHealth;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.x * tileW, this.y * tileH - 2, this.width * tileW, 2);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(this.x * tileW, this.y * tileH - 2, this.width * tileW * hpRatio, 2);
    ctx.restore();
  }
  /** 序列化单位 */
  serialize() {
    return {
      class: 'Unit',
      type: this.type,
      x: this.x,
      y: this.y,
      owner: this.owner,
      health: this.health,
      targetPos: this.targetPos,
    };
  }
}

/** 建筑类：静止，能够生产单位 */
export class Building extends Entity {
  constructor(x, y, owner, buildingType, world) {
    const def = BUILDING_DEFS[buildingType];
    super(x, y, def.width, def.height, owner, buildingType);
    this.world = world;
    this.name = def.name;
    this.maxHealth = def.maxHealth;
    this.health = def.maxHealth;
    this.isBuilding = true;
    this.produces = def.produces || [];
    this.unitType = def.unitType;
    this.productionTime = def.productionTime || 0;
    this.productionProgress = 0;
    this.queue = [];
  }
  /** 更新建造进度 */
  update(dt) {
    if (this.queue.length > 0) {
      this.productionProgress += dt;
      if (this.productionProgress >= this.productionTime) {
        this.productionProgress = 0;
        const unitType = this.queue.shift();
        // 在建筑旁边生成单位
        const spawnX = this.x + this.width;
        const spawnY = this.y;
        const unit = new Unit(spawnX, spawnY, this.owner, unitType, this.world);
        this.world.addEntity(unit);
      }
    }
  }
  /** 渲染建筑 */
  render(ctx, tileW, tileH) {
    ctx.save();
    ctx.fillStyle = this.owner === 'blue' ? '#2d5f91' : '#912d2d';
    ctx.fillRect(this.x * tileW, this.y * tileH, this.width * tileW, this.height * tileH);
    // 显示名称
    ctx.fillStyle = '#fff';
    ctx.font = `${12}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(this.name, (this.x + this.width / 2) * tileW, (this.y + this.height / 2) * tileH + 4);
    // 显示建造条
    if (this.queue.length > 0 && this.productionTime > 0) {
      const ratio = this.productionProgress / this.productionTime;
      ctx.fillStyle = '#000';
      ctx.fillRect(this.x * tileW, (this.y + this.height) * tileH - 4, this.width * tileW, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(this.x * tileW, (this.y + this.height) * tileH - 4, this.width * tileW * Math.min(ratio, 1), 4);
    }
    ctx.restore();
  }
  /** 开始生产指定单位 */
  produce(unitType) {
    if (this.unitType === unitType) {
      this.queue.push(unitType);
    }
  }
  /** 序列化建筑 */
  serialize() {
    return {
      class: 'Building',
      type: this.type,
      x: this.x,
      y: this.y,
      owner: this.owner,
      health: this.health,
      queue: [...this.queue],
      productionProgress: this.productionProgress,
    };
  }
}