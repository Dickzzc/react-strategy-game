import { World } from './world.js';
import { Player } from './player.js';
import { AI } from './ai.js';
import { setupInput } from './input.js';
import { Building, Unit } from './entities.js';

/**
 * 游戏引擎负责驱动世界更新与渲染、输入事件处理以及存档/读档。
 * 它维护了一个 World 实例，管理玩家和 AI 的控制器，并负责执行主循环。
 */
export class GameEngine {
  /**
   * @param {HTMLCanvasElement} canvas 游戏绘制目标
   * @param {Object} callbacks 回调函数集合，用于向 React 组件反馈状态
   */
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;
    // 创建地图与世界对象
    this.world = new World(50, 50);
    // 创建玩家和 AI 控制器
    this.player = new Player('blue', this.world, this);
    this.ai = new AI('red', this.world, this.player, this);
    // 时间管理
    this.lastTimestamp = 0;
    this.running = false;
    this.paused = false;
    // 设置输入处理
    setupInput(this, canvas);

    // 当处于建筑放置模式时，该字段表示要放置的建筑类型
    this.placingBuilding = null;
  }

  /** 启动主循环 */
  start() {
    this.running = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  /** 停止主循环 */
  stop() {
    this.running = false;
  }

  /** 暂停游戏 */
  pause() {
    this.paused = true;
  }

  /** 恢复游戏 */
  resume() {
    this.paused = false;
    this.lastTimestamp = performance.now();
  }

  /**
   * 主循环逻辑，计算 dt 并更新和渲染世界
   * @param {DOMHighResTimeStamp} timestamp
   */
  loop(timestamp) {
    if (!this.running) return;
    const dt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    if (!this.paused) {
      this.update(dt);
      this.render();
    }
    requestAnimationFrame(this.loop.bind(this));
  }

  /** 更新所有游戏对象 */
  update(dt) {
    this.world.update(dt);
    this.player.update(dt);
    this.ai.update(dt);
    // 更新资源信息回调
    if (this.callbacks.onResourcesChange) {
      this.callbacks.onResourcesChange({
        player: this.player.resources,
        ai: this.ai.resources,
      });
    }
  }

  /** 渲染世界和实体 */
  render() {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    ctx.clearRect(0, 0, width, height);
    this.world.render(ctx, this.player.selectedEntities);
  }

  /**
   * 打开建造菜单，供玩家选择要建造的建筑类型
   * @param {Array<{type:string,name:string,cost:number}>} options
   */
  openBuildMenu(options) {
    if (this.callbacks.onOpenBuildMenu) {
      this.callbacks.onOpenBuildMenu(options);
    }
  }

  /**
   * 进入建筑放置模式。此时鼠标左键点击地图将在目标位置尝试放置建筑。
   * @param {string} buildingType
   */
  startBuildingPlacement(buildingType) {
    this.placingBuilding = buildingType;
    // 关闭建造菜单
    if (this.callbacks.onOpenBuildMenu) this.callbacks.onOpenBuildMenu(null);
  }

  /** 取消放置建筑 */
  cancelBuildingPlacement() {
    this.placingBuilding = null;
  }

  /**
   * 保存游戏到指定槽位
   * @param {number} slot 1-3 的存档槽
   */
  saveGame(slot) {
    const data = {
      world: this.world.serialize(),
      player: this.player.serialize(),
      ai: this.ai.serialize(),
    };
    localStorage.setItem(`strategy-save-${slot}`, JSON.stringify(data));
  }

  /**
   * 读取指定槽位的游戏存档
   * @param {number} slot
   * @returns {boolean} 是否成功读取
   */
  loadGame(slot) {
    const raw = localStorage.getItem(`strategy-save-${slot}`);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      // 反序列化地图
      this.world.deserialize(data.world);
      // 根据存档重建实体
      this.world.entities = [];
      for (const ent of data.world.entities) {
        if (ent.class === 'Building') {
          const b = new Building(ent.x, ent.y, ent.owner, ent.type, this.world);
          b.health = ent.health;
          // 重建建造队列
          if (ent.queue) b.queue = [...ent.queue];
          if (ent.productionProgress) b.productionProgress = ent.productionProgress;
          this.world.addEntity(b);
        } else if (ent.class === 'Unit') {
          const u = new Unit(ent.x, ent.y, ent.owner, ent.type, this.world);
          u.health = ent.health;
          if (ent.targetPos) u.targetPos = ent.targetPos;
          this.world.addEntity(u);
        }
      }
      // 反序列化玩家和 AI 状态
      this.player.deserialize(data.player);
      this.ai.deserialize(data.ai);
      // 重新定位基地引用
      this.player.base = this.world.entities.find((e) => e.owner === this.player.owner && e.type === 'HQ');
      this.ai.base = this.world.entities.find((e) => e.owner === this.ai.owner && e.type === 'HQ');
      return true;
    } catch (err) {
      console.error('Failed to load save:', err);
      return false;
    }
  }
}