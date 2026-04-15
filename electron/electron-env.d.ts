/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: 'true'
    DIST_ELECTRON: string
    DIST: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

interface WindowApi {
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  selectFolder: (title?: string, defaultPath?: string) => Promise<string | null>;
  saveSettings: (settings: { dcsPath?: string }) => Promise<boolean>;
  getSettings: () => Promise<{ dcsPath: string }>;
}

interface IpcRenderer {
  on(channel: string, listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void): () => void;
  off(channel: string, listener?: (event: Electron.IpcRendererEvent, ...args: any[]) => void): void;
  send(channel: string, ...args: any[]): void;
  invoke<T = any>(channel: string, ...args: any[]): Promise<T>;
}

declare global {
  interface Window {
    windowApi: WindowApi;
    ipcRenderer: IpcRenderer;
  }
}

export {};
