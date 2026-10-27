import React from 'react';

/**
 * 底部 HUD 信息栏：显示资源数、选中数量、暂停按钮、存读档按钮。
 */
export default function HUD({ resources, selected, onPauseToggle, paused, onSave, onLoad }) {
  const handleSaveClick = (slot) => {
    if (onSave) onSave(slot);
  };
  const handleLoadClick = (slot) => {
    if (onLoad) onLoad(slot);
  };
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        background: 'rgba(0, 0, 0, 0.6)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        boxSizing: 'border-box',
        fontSize: 14,
      }}
    >
      <div style={{ marginRight: 24 }}>资源: {Math.floor(resources)}</div>
      <div style={{ marginRight: 24 }}>选中: {selected.length}</div>
      <button
        onClick={onPauseToggle}
        style={{ marginRight: 16, padding: '4px 8px' }}
      >
        {paused ? '继续' : '暂停'}
      </button>
      {/* 存档与读档按钮 */}
      {[1, 2, 3].map((slot) => (
        <span key={`save${slot}`} style={{ marginRight: 8 }}>
          <button
            style={{ marginRight: 4, padding: '4px 6px' }}
            onClick={() => handleSaveClick(slot)}
          >
            存{slot}
          </button>
          <button
            style={{ padding: '4px 6px' }}
            onClick={() => handleLoadClick(slot)}
          >
            读{slot}
          </button>
        </span>
      ))}
    </div>
  );
}