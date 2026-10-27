import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// 入口文件：将 App 渲染到 index.html 中的 #root 元素
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);