// 世界与地图管理

/**
 * 可用的地形类型及其颜色
 */
const TILE_TYPES = {
  grass: '#2b7a0b',
  water: '#1a4a8d',
  road: '#888888',
};

/**
 * 世界类维护网格地图、实体列表并负责渲染。
 */
export class World {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    // 初始化地图，随机生成草地、水域和道路
    this.tiles = [];
    for (let y = 0; y < height; y++) {
      const row = [];
      for (let x = 0; x < width; x++) {
        let type = 'grass';
        // 在边缘区域生成水域
        if (Math.random() < 0.05) type = 'water';
        // 生成横贯地图的道路
        if (y === Math.floor(height / 2)) type = 'road';
        if (x === Math.floor(width / 2)) type = 'road';
        row.push(type);
      }
      this.tiles.push(row);
    }
    // 所有实体（单位和建筑）
    this.entities = [];
  }

  /**
   * 增加实体到世界
   * @param {Entity} entity
   */
  addEntity(entity) {
    this.entities.push(entity);
  }

  /**
   * 从世界移除实体
   * @param {Entity} entity
   */
  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx >= 0) this.entities.splice(idx, 1);
  }

  /** 更新所有实体 */
  update(dt) {
    // 使用副本防止在迭代中修改数组
    for (const entity of [...this.entities]) {
      entity.update(dt);
      // 移除死亡实体
      if (entity.health <= 0) {
        this.removeEntity(entity);
      }
    }
  }

  /**
   * 渲染地图和实体。根据 canvas 大小计算每个格子的像素尺寸。
   * @param {CanvasRenderingContext2D} ctx
   * @param {Entity[]} selectedEntities
   */
  render(ctx, selectedEntities = []) {
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const tileW = cw / this.width;
    const tileH = ch / this.height;
    // 先绘制地图
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        ctx.fillStyle = TILE_TYPES[this.tiles[y][x]];
        ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
      }
    }
    // 根据 y 坐标排序实体，保证较低的实体绘制在上层
    const sorted = [...this.entities].sort((a, b) => (a.y + a.height / 2) - (b.y + b.height / 2));
    for (const entity of sorted) {
      entity.render(ctx, tileW, tileH);
      // 高亮选中的实体
      if (selectedEntities.includes(entity)) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(entity.x * tileW, entity.y * tileH, entity.width * tileW, entity.height * tileH);
      }
    }
  }

  /**
   * 判断某个网格位置是否在地图范围内
   * @param {number} x
   * @param {number} y
   */
  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /**
   * 判断某个区域是否可以放置建筑（面积为 w×h 的矩形，不与水域重叠，不与其他建筑重叠）
   */
  canPlaceBuilding(x, y, w, h) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const gx = x + dx;
        const gy = y + dy;
        if (!this.inBounds(gx, gy)) return false;
        const tile = this.tiles[gy][gx];
        if (tile === 'water') return false;
        // 检查是否已有建筑占用
        for (const ent of this.entities) {
          if (ent.isBuilding) {
            if (gx >= ent.x && gx < ent.x + ent.width && gy >= ent.y && gy < ent.y + ent.height) {
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  /**
   * 根据像素坐标获取格子坐标
   * @param {number} px
   * @param {number} py
   * @param {HTMLCanvasElement} canvas
   */
  pixelToGrid(px, py, canvas) {
    const tileW = canvas.width / this.width;
    const tileH = canvas.height / this.height;
    const x = Math.floor(px / tileW);
    const y = Math.floor(py / tileH);
    return { x, y };
  }

  /**
   * 根据格子坐标和大小，返回该矩形内所有实体
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   */
  getEntitiesInRect(x, y, w, h) {
    return this.entities.filter((e) => {
      return !(e.x + e.width <= x || e.x >= x + w || e.y + e.height <= y || e.y >= y + h);
    });
  }

  /**
   * 序列化世界用于存档
   */
  serialize() {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      entities: this.entities.map((e) => e.serialize()),
    };
  }

  /**
   * 反序列化存档数据重建世界状态
   * @param {Object} data
   */
  deserialize(data) {
    this.width = data.width;
    this.height = data.height;
    this.tiles = data.tiles;
    // 清理现有实体
    this.entities = [];
    // 由于世界并不知道具体的实体类，这里暂时将实体的重建委托给 Player 和 AI
    // 它们将在 deserialize 调用之后重新创建自己的实体并添加至 world.entities
  }
}