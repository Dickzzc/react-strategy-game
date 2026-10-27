import React, { useEffect, useRef } from 'react';

/**
 * 小地图组件，显示整个世界的简略视图。它不是交互式的，仅用于概览。
 */
export default function MiniMap({ engine }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrame;
    const draw = () => {
      const world = engine.world;
      const cw = canvas.width;
      const ch = canvas.height;
      const tileW = cw / world.width;
      const tileH = ch / world.height;
      // 清屏
      ctx.clearRect(0, 0, cw, ch);
      // 绘制地形
      for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
          const type = world.tiles[y][x];
          let color;
          if (type === 'grass') color = '#2b7a0b';
          else if (type === 'water') color = '#1a4a8d';
          else color = '#777';
          ctx.fillStyle = color;
          ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
        }
      }
      // 绘制实体
      for (const ent of world.entities) {
        ctx.fillStyle = ent.owner === 'blue' ? '#3c77d7' : '#c43c39';
        ctx.fillRect(ent.x * tileW, ent.y * tileH, ent.width * tileW, ent.height * tileH);
      }
      animationFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animationFrame);
  }, [engine]);
  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        border: '1px solid #444',
        background: '#000',
        width: 200,
        height: 200,
      }}
    />
  );
}