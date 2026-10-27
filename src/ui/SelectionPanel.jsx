import React from 'react';

/**
 * 右侧选中信息面板。展示当前选中的单位或建筑的基本信息。
 */
export default function SelectionPanel({ selected }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 8 + 200 + 8, // 预留小地图宽度 + 间距
        width: 200,
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '8px',
        borderRadius: '4px',
        fontSize: 14,
      }}
    >
      <div style={{ marginBottom: 4 }}>选中对象: {selected.length}</div>
      {selected.map((ent, idx) => (
        <div key={idx} style={{ marginBottom: 4, borderBottom: '1px solid #555', paddingBottom: 4 }}>
          <div>类型: {ent.name || ent.type}</div>
          <div>生命: {Math.floor(ent.health)}/{ent.maxHealth}</div>
        </div>
      ))}
    </div>
  );
}