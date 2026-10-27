import React from 'react';

/**
 * 建造/生产菜单。根据当前选中的建筑，提供可建造的建筑或单位选项。
 */
export default function BuildMenu({ options, engine, onClose }) {
  if (!options || options.length === 0) return null;
  const handleClick = (opt) => {
    // 如果是单位生产
    if (opt.unit) {
      const selected = engine.player.selectedEntities;
      if (selected.length === 1) {
        engine.player.produceUnit(selected[0], opt.type);
      }
      onClose();
    } else {
      // 建造建筑，进入放置模式
      engine.startBuildingPlacement(opt.type);
      onClose();
    }
  };
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: 8,
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: '8px',
        borderRadius: '4px',
        minWidth: '160px',
      }}
    >
      <div style={{ marginBottom: 4 }}>选择建造/训练：</div>
      {options.map((opt) => (
        <button
          key={opt.type}
          style={{
            width: '100%',
            padding: '4px',
            marginBottom: '4px',
            background: '#444',
            color: '#fff',
            border: '1px solid #666',
            cursor: 'pointer',
          }}
          onClick={() => handleClick(opt)}
        >
          {opt.name} ({opt.cost})
        </button>
      ))}
    </div>
  );
}