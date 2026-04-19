interface ModTreeNode {
  title: string;
  key: string;
  path: string;
  isMod: boolean;
  children?: ModTreeNode[];
}

interface ScanModsResult {
  success: boolean;
  tree?: ModTreeNode[];
  error?: string;
}

// 禁用的 mod 信息
interface DisabledModInfo {
  originalPath: string;
  modName: string;
  disabledAt: string;
}

interface DisableModResult {
  success: boolean;
  error?: string;
}

interface EnableModResult {
  success: boolean;
  error?: string;
}

interface CheckModDeleteResult {
  success: boolean;
  hasOtherMods: boolean;
  otherModCount: number;
  luaFileCount: number;
  modName: string;
  error?: string;
}

interface DeleteModResult {
  success: boolean;
  error?: string;
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
  checkModsFolder: (folderPath: string) => Promise<{ valid: boolean; error?: string }>;
  scanModsDirectory: (basePath: string) => Promise<ScanModsResult>;
  disableMod: (modPath: string) => Promise<DisableModResult>;
  enableMod: (disabledModPath: string, originalPath?: string) => Promise<EnableModResult>;
  getDisabledMods: () => Promise<DisabledModInfo[]>;
  scanDisabledModsDirectory: (basePath: string) => Promise<ScanModsResult>;
  checkModDelete: (modPath: string) => Promise<CheckModDeleteResult>;
  deleteModFolder: (modPath: string) => Promise<DeleteModResult>;
  deleteModLua: (modPath: string) => Promise<DeleteModResult>;
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
