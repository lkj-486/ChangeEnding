import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 临时简化版本用于调试
console.log("🔍 main.tsx开始执行");

const rootElement = document.getElementById('root');
console.log("🔍 root元素:", rootElement);

if (rootElement) {
  console.log("🔍 开始渲染React应用");
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log("🔍 React应用渲染完成");
} else {
  console.error("🔍 找不到root元素！");
}
