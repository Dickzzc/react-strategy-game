import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine.js';
import HUD from './ui/HUD.jsx';
import MiniMap from './ui/MiniMap.jsx';
import BuildMenu from './ui/BuildMenu.jsx';
import SelectionPanel from './ui/SelectionPanel.jsx';

// 根组件负责创建和管理游戏引擎对象，并根据游戏状态展示 UI。
export default function App() {
  const canvasRef = useRef(null);
  const [engine, setEngine] = useState(null);
  const [selected, setSelected] = useState([]);
  const [buildOptions, setBuildOptions] = useState(null);
  const [resources, setResources] = useState({ player: 1000, ai: 1000 });
  const [paused, setPaused] = useState(false);

  // 当 canvas 初始化后创建游戏引擎
  useEffect(() => {
    if (canvasRef.current && !engine) {
      const eng = new GameEngine(canvasRef.current, {
        onSelectionChange: setSelected,
        onResourcesChange: setResources,
        onOpenBuildMenu: (opts) => setBuildOptions(opts),
      });
      setEngine(eng);
      eng.start();
    }
    // 在组件卸载时停止引擎
    return () => {
      if (engine) engine.stop();
    };
  }, [canvasRef, engine]);

  // 切换暂停状态
  const togglePause = () => {
    if (!engine) return;
    if (paused) {
      engine.resume();
      setPaused(false);
    } else {
      engine.pause();
      setPaused(true);
    }
  };

  // 保存游戏到槽位
  const handleSave = (slot) => {
    if (!engine) return;
    engine.saveGame(slot);
    alert(`游戏已保存到槽位 ${slot}`);
  };

  // 读取游戏槽位
  const handleLoad = (slot) => {
    if (!engine) return;
    const ok = engine.loadGame(slot);
    if (ok) {
      alert(`读取槽位 ${slot} 成功`);
    } else {
      alert(`槽位 ${slot} 没有存档`);
    }
  };

  // 当点击建造菜单外区域时关闭菜单
  const closeBuildMenu = () => setBuildOptions(null);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 游戏主画布 */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      {/* 信息条 */}
      <HUD
        resources={resources.player}
        selected={selected}
        onPauseToggle={togglePause}
        paused={paused}
        onSave={handleSave}
        onLoad={handleLoad}
      />
      {/* 小地图 */}
      {engine && <MiniMap engine={engine} />}
      {/* 建造菜单，当玩家选中可建造的建筑时出现 */}
      {buildOptions && engine && (
        <BuildMenu
          options={buildOptions}
          engine={engine}
          onClose={closeBuildMenu}
        />
      )}
      {/* 右侧选中信息面板 */}
      <SelectionPanel selected={selected} />
    </div>
  );
}