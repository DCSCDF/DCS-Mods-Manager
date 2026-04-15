/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

// 扩展 Window 接口以包含 Electron API
// 实际的类型定义在 electron/electron-env.d.ts 中
interface Window {
  // 实际的类型由 electron-env.d.ts 提供
}
