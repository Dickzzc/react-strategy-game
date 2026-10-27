/**
 * 设置鼠标键盘输入。通过监听 canvas 上的事件，将用户操作转化为游戏命令。
 * @param {GameEngine} engine
 * @param {HTMLCanvasElement} canvas
 */
export function setupInput(engine, canvas) {
  let selecting = false;
  let selectStart = null;

  function getGridFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return engine.world.pixelToGrid(px, py, canvas);
  }

  canvas.addEventListener('mousedown', (e) => {
    const grid = getGridFromEvent(e);
    if (e.button === 0) {
      // 左键
      // 如果在放置建筑模式，则尝试放置建筑
      if (engine.placingBuilding) {
        const success = engine.player.placeBuilding(grid.x, grid.y, engine.placingBuilding);
        if (success) {
          engine.placingBuilding = null;
        }
        return;
      }
      selecting = true;
      selectStart = grid;
    } else if (e.button === 2) {
      // 右键
      e.preventDefault();
      // 如果选中了己方单位，执行移动或攻击
      if (engine.player.selectedEntities.length > 0) {
        const entitiesAt = engine.world.getEntitiesInRect(grid.x, grid.y, 1, 1);
        const enemy = entitiesAt.find((ent) => ent.owner !== engine.player.owner);
        if (enemy) {
          engine.player.attackSelected(enemy);
        } else {
          engine.player.moveSelectedTo(grid.x, grid.y);
        }
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    // 目前不实现实时框选绘制，可扩展
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0 && selecting) {
      const grid = getGridFromEvent(e);
      const x1 = Math.min(selectStart.x, grid.x);
      const x2 = Math.max(selectStart.x, grid.x);
      const y1 = Math.min(selectStart.y, grid.y);
      const y2 = Math.max(selectStart.y, grid.y);
      const selected = engine.world
        .getEntitiesInRect(x1, y1, x2 - x1 + 1, y2 - y1 + 1)
        .filter((ent) => ent.owner === engine.player.owner);
      engine.player.setSelection(selected);
      selecting = false;
    }
  });

  // 禁止默认右键菜单
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // 键盘快捷键：Q 暂停/继续
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'q') {
      // Toggle pause
      if (engine.paused) {
        engine.resume();
      } else {
        engine.pause();
      }
    }
  });
}