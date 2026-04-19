import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { release } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { promises as fs } from 'node:fs'
import Store from 'electron-store'

// 禁用的 mod 信息接口
interface DisabledModInfo {
  originalPath: string  // 原存储路径
  modName: string        // mod 名称
  disabledAt: string     // 禁用时间
}

interface AppConfig {
  dcsPath: string
  disabledMods: DisabledModInfo[]  // 禁用的 mod 列表
}

const store = new Store<AppConfig>({
  defaults: {
    dcsPath: '',
    disabledMods: []
  }
})

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = path.join(__dirname, '..')
process.env.DIST = path.join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = path.join(__dirname, '../preload/index.mjs')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    autoHideMenuBar: true, // 隐藏菜单栏（工具栏）
    frame: false, // 隐藏原生标题栏，使用自定义标题栏
    minWidth: 1000,
    minHeight: 700,
    width: 1200,
    height: 800,
    webPreferences: {
      preload,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    await win.loadURL(url)
    // Open devTool if the app is not packaged
     win.webContents.openDevTools()
  } else {
    await win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    // 发送当前窗口状态
    win?.webContents.send('window-maximized', win.isMaximized())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  // 监听窗口最大化/还原事件并通知渲染进程
  win.on('maximize', () => {
    win.webContents.send('window-maximized', true)
  })

  win.on('unmaximize', () => {
    win.webContents.send('window-maximized', false)
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow().then( )
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`).then( )
  } else {
    childWindow.loadFile(indexHtml, { hash: arg }).then( )
  }
})

ipcMain.on('window-minimize', () => {
  win?.minimize()
})

ipcMain.on('window-maximize', () => {
  win?.maximize()
})

ipcMain.on('window-unmaximize', () => {
  win?.unmaximize()
})

ipcMain.on('window-close', () => {
  win?.close()
})

ipcMain.handle('window-is-maximized', () => {
  return win?.isMaximized()
})

// 处理文件夹选择对话框
ipcMain.handle('select-folder', async (_event, title?: string, defaultPath?: string) => {
  if (!win) return null

  const result = await dialog.showOpenDialog(win, {
    title: title || '选择文件夹',
    properties: ['openDirectory'],
    defaultPath: defaultPath || undefined,
  })

  if (result.canceled) {
    return null
  }

  return result.filePaths[0] || null
})

// 保存设置
ipcMain.handle('save-settings', async (_event, settings: { dcsPath?: string }) => {
  if (settings.dcsPath !== undefined) {
    (store as any).set('dcsPath', settings.dcsPath)
  }
  return true
})

// 获取设置
ipcMain.handle('get-settings', async () => {
  return {
    dcsPath: (store as any).get('dcsPath', ''),
  }
})

// 检查目录是否包含 Mods 文件夹
ipcMain.handle('check-mods-folder', async (_event, folderPath: string) => {
  try {
    if (!folderPath) {
      return { valid: false, error: '路径为空' }
    }

    const modsPath = path.join(folderPath, 'Mods')

    // 检查 Mods 文件夹是否存在
    try {
      const stats = await fs.stat(modsPath)
      if (stats.isDirectory()) {
        return { valid: true }
      } else {
        return { valid: false, error: '找到 Mods 文件但不是文件夹' }
      }
    } catch (error) {
      return { valid: false, error: '未找到 Mods 文件夹' }
    }
  } catch (error) {
    return { valid: false, error: '检查失败: ' + (error as Error).message }
  }
})

// 递归扫描 Mods 文件夹，返回目录树结构
interface ModTreeNode {
  title: string
  key: string
  path: string
  isMod: boolean
  children?: ModTreeNode[]
  entryLuaPath?: string  // Entry.lua 文件路径
  displayName?: string  // 从 Entry.lua 解析
  version?: string
  info?: string
  developerName?: string
}

// 从 Entry.lua 内容中提取信息
function parseEntryLua(content: string): { displayName: string; version: string; info: string; developerName: string } {
  const result = {
    displayName: '',
    version: '',
    info: '',
    developerName: ''
  };

  try {
    const displayNameMatch = content.match(/displayName\s*=\s*["']([^"']+)["']/);
    if (displayNameMatch) result.displayName = displayNameMatch[1];

    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    if (versionMatch) result.version = versionMatch[1];

    const developerMatch = content.match(/developerName\s*=\s*["']([^"']+)["']/);
    if (developerMatch) result.developerName = developerMatch[1];

    const infoMatch = content.match(/info\s*=\s*_\(["']([^"']+)["']\)/);
    if (infoMatch) result.info = infoMatch[1];
  } catch (error) {
    console.error('解析 Entry.lua 失败:', error);
  }

  return result;
}

// 在目录中搜索 Entry.lua（只搜索直接子目录，不递归）
async function findEntryLuaInDir(dirPath: string): Promise<string | null> {
  try {
    const entryPath = path.join(dirPath, 'Entry.lua');
    await fs.access(entryPath);
    return entryPath;
  } catch {
    return null;
  }
}

// 获取 MOD 的所有子目录（用于嵌套 MOD 的展开）
async function getAllChildDirectories(dirPath: string, parentKey: string, isModChild: boolean = false): Promise<ModTreeNode[]> {
  const nodes: ModTreeNode[] = [];

  // 如果是 MOD 的子目录（由父级调用时传入 isModChild=true），先添加主目录节点
  if (isModChild) {
    const currentEntryLua = await findEntryLuaInDir(dirPath);
    if (currentEntryLua) {
      const dirName = path.basename(dirPath);
      const content = await fs.readFile(currentEntryLua, 'utf-8');
      const parsed = parseEntryLua(content);

      nodes.push({
        title: dirName + ' (主目录)',
        key: parentKey + '/_main',
        path: dirPath,
        isMod: true,
        entryLuaPath: currentEntryLua,
        displayName: parsed.displayName || dirName,
        version: parsed.version || '未知',
        info: parsed.info || '未知',
        developerName: parsed.developerName || '未知'
      });
    }
  }

  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return nodes;
  }

  const subDirs = entries.filter(e => e.isDirectory());

  for (const entry of subDirs) {
    const childDirPath = path.join(dirPath, entry.name);
    const childKey = parentKey ? `${parentKey}/${entry.name}` : entry.name;

    // 检查这个子目录是否是 mod
    const entryLuaPath = await findEntryLuaInDir(childDirPath);

    if (entryLuaPath) {
      // 是 mod，递归获取其子目录（传入 true 表示这是 MOD 的子目录）
      const children = await getAllChildDirectories(childDirPath, childKey, true);
      const content = await fs.readFile(entryLuaPath, 'utf-8');
      const parsed = parseEntryLua(content);

      nodes.push({
        title: entry.name,
        key: childKey,
        path: childDirPath,
        isMod: true,
        children: children.length > 0 ? children : undefined,
        entryLuaPath,
        displayName: parsed.displayName || entry.name,
        version: parsed.version || '未知',
        info: parsed.info || '未知',
        developerName: parsed.developerName || '未知'
      });
    } else {
      // 不是 mod，递归获取其子目录
      const children = await getAllChildDirectories(childDirPath, childKey, false);
      if (children.length > 0) {
        nodes.push({
          title: entry.name,
          key: childKey,
          path: childDirPath,
          isMod: false,
          children
        });
      }
    }
  }

  return nodes;
}

// 递归扫描目录构建树
async function scanModsDirectory(dirPath: string, parentKey: string = ''): Promise<ModTreeNode[]> {
  const nodes: ModTreeNode[] = [];

  let entries: fs.Dirent[];
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch {
    return nodes;
  }

  const subDirs = entries.filter(e => e.isDirectory());
  console.log(`[SCAN] 目录: ${dirPath}, parentKey: "${parentKey}", 子目录: ${subDirs.map(e => e.name).join(', ')}`);

  for (const entry of subDirs) {
    const childDirPath = path.join(dirPath, entry.name);
    const childKey = parentKey ? `${parentKey}/${entry.name}` : entry.name;

    // 检查这个子目录本身是否是 mod
    const entryLuaPath = await findEntryLuaInDir(childDirPath);
    console.log(`[CHECK] ${entry.name} -> ${entryLuaPath ? '是MOD (Entry.lua: ' + entryLuaPath + ')' : '不是MOD'}`);

    if (entryLuaPath) {
      // 是 mod，先获取所有子目录作为 children（传入 true 表示这是 MOD 的子目录）
      const children = await getAllChildDirectories(childDirPath, childKey, true);
      console.log(`[FOUND] MOD: ${entry.name} (path: ${childDirPath}), 子目录: ${JSON.stringify(children)}`);

      const content = await fs.readFile(entryLuaPath, 'utf-8');
      const parsed = parseEntryLua(content);
      console.log(`[PARSED] ${entry.name}: displayName="${parsed.displayName}", version="${parsed.version}"`);

      nodes.push({
        title: entry.name,
        key: childKey,
        path: childDirPath,
        isMod: true,
        children: children.length > 0 ? children : undefined,
        entryLuaPath,
        displayName: parsed.displayName || entry.name,
        version: parsed.version || '未知',
        info: parsed.info || '未知',
        developerName: parsed.developerName || '未知'
      });
      console.log(`[NODE] 创建节点: key="${childKey}", displayName="${parsed.displayName || entry.name}"`);
    } else {
      // 不是 mod，检查是否有子 MOD 或子目录
      const childMods = await scanModsDirectory(childDirPath, childKey);
      if (childMods.length > 0) {
        nodes.push({
          title: entry.name,
          key: childKey,
          path: childDirPath,
          isMod: false,
          children: childMods
        });
      }
    }
  }

  return nodes;
}

// 获取禁用的 mods 列表
ipcMain.handle('get-disabled-mods', async () => {
  return (store as any).get('disabledMods', [])
})

// 禁用 mod - 移动 Entry.lua 文件到 disable_mods 文件夹
ipcMain.handle('disable-mod', async (_event, modPath: string) => {
  try {
    if (!modPath) {
      return { success: false, error: 'Mod 路径为空' }
    }

    // 获取 DCS 路径
    const dcsPath = (store as any).get('dcsPath', '')
    if (!dcsPath) {
      return { success: false, error: '未配置 DCS 路径' }
    }

    // 统一使用正斜杠
    const normalizedModPath = modPath.replace(/\\/g, '/')
    const normalizedDcsPath = dcsPath.replace(/\\/g, '/')
    const modsPath = normalizedDcsPath + '/Mods'

    // 检查 mod 路径是否在 Mods 目录下
    if (!normalizedModPath.startsWith(modsPath)) {
      return { success: false, error: 'Mod 不在 Mods 目录下' }
    }

    // 检查 Entry.lua 是否存在
    const entryLuaPath = path.join(modPath, 'Entry.lua')
    try {
      await fs.access(entryLuaPath)
    } catch {
      return { success: false, error: 'Entry.lua 文件不存在' }
    }

    // 获取 mod 相对于 Mods 的路径
    const relativePath = normalizedModPath.replace(modsPath + '/', '')

    // disable_mods 在 DCS 根目录下
    const disableModsPath = normalizedDcsPath + '/disable_mods'
    // 目标路径（保留相对路径结构）
    const targetDir = path.join(disableModsPath, relativePath)

    // 确保目标目录存在
    try {
      await fs.access(targetDir)
    } catch {
      await fs.mkdir(targetDir, { recursive: true })
    }

    // 目标 Entry.lua 路径
    const targetEntryLuaPath = path.join(targetDir, 'Entry.lua')

    // 检查目标 Entry.lua 是否已存在
    try {
      await fs.access(targetEntryLuaPath)
      return { success: false, error: '该 Mod 已在禁用列表中' }
    } catch {
      // 不存在，可以继续
    }

    // 复制 Entry.lua 文件到目标位置
    await fs.copyFile(entryLuaPath, targetEntryLuaPath)

    // 删除源 Entry.lua 文件
    await fs.unlink(entryLuaPath)

    // 保存禁用信息到 store
    const disabledMods = (store as any).get('disabledMods', [])
    disabledMods.push({
      originalPath: normalizedModPath,
      modName: relativePath,
      disabledAt: new Date().toISOString()
    })
    ;(store as any).set('disabledMods', disabledMods)

    return { success: true }
  } catch (error) {
    return { success: false, error: '禁用失败: ' + (error as Error).message }
  }
})

// 启用 mod - 从 disable_mods 复制 Entry.lua 回原位置
ipcMain.handle('enable-mod', async (_event, disabledModPath: string, originalPath?: string) => {
  try {
    if (!disabledModPath) {
      return { success: false, error: 'Mod 路径为空' }
    }

    // 获取 DCS 路径
    const dcsPath = (store as any).get('dcsPath', '')
    if (!dcsPath) {
      return { success: false, error: '未配置 DCS 路径' }
    }

    // 统一使用正斜杠
    const normalizedDcsPath = dcsPath.replace(/\\/g, '/')
    const disableModsPath = normalizedDcsPath + '/disable_mods'
    const normalizedDisabledModPath = disabledModPath.replace(/\\/g, '/')

    // 构建禁用 mod 的完整路径
    const disabledModDir = path.join(disableModsPath, normalizedDisabledModPath)
    const disabledEntryLuaPath = path.join(disabledModDir, 'Entry.lua')

    // 检查 disable_mods 目录下的 Entry.lua 是否存在
    try {
      await fs.access(disabledEntryLuaPath)
    } catch {
      return { success: false, error: '禁用的 Entry.lua 不存在' }
    }

    // 确定目标路径
    let targetPath: string
    if (originalPath) {
      targetPath = originalPath.replace(/\\/g, '/')
    } else {
      const disabledMods: DisabledModInfo[] = (store as any).get('disabledMods', [])
      const modInfo = disabledMods.find(m => {
        const storedModName = m.modName.replace(/\\/g, '/')
        return storedModName === normalizedDisabledModPath
      })

      if (!modInfo) {
        return { success: false, error: '未找到 Mod 的禁用记录' }
      }
      targetPath = modInfo.originalPath.replace(/\\/g, '/')
    }

    // 目标 Entry.lua 路径
    const targetEntryLuaPath = path.join(targetPath, 'Entry.lua')

    // 确保目标目录存在
    try {
      await fs.access(targetPath)
    } catch {
      await fs.mkdir(targetPath, { recursive: true })
    }

    // 检查目标 Entry.lua 是否已存在
    try {
      await fs.access(targetEntryLuaPath)
      return { success: false, error: '目标位置已存在 Entry.lua' }
    } catch {
      // 不存在，可以继续
    }

    // 复制 Entry.lua 文件回原位置
    await fs.copyFile(disabledEntryLuaPath, targetEntryLuaPath)

    // 删除 disable_mods 中的 Entry.lua 文件
    await fs.unlink(disabledEntryLuaPath)

    // 尝试删除空的父目录
    try {
      const entries = await fs.readdir(disabledModDir)
      if (entries.length === 0) {
        await fs.rmdir(disabledModDir)
      }
    } catch {
      // 目录非空或有错误，忽略
    }

    // 从 store 中移除记录
    const disabledMods = (store as any).get('disabledMods', [])
    const updatedDisabledMods = disabledMods.filter((m: DisabledModInfo) => {
      return m.modName.replace(/\\/g, '/') !== normalizedDisabledModPath
    })
    ;(store as any).set('disabledMods', updatedDisabledMods)

    return { success: true }
  } catch (error) {
    return { success: false, error: '启用失败: ' + (error as Error).message }
  }
})

// 获取禁用的 mods 目录树
ipcMain.handle('scan-disabled-mods-directory', async (_event, basePath: string) => {
  try {
    if (!basePath) {
      return { success: false, error: '路径为空' }
    }

    // disable_mods 在 DCS 根目录下，而不是 Mods 目录下
    const disableModsPath = path.join(basePath, 'disable_mods')

    // 检查 disable_mods 文件夹是否存在
    try {
      const stats = await fs.stat(disableModsPath)
      if (!stats.isDirectory()) {
        return { success: true, tree: [] }
      }
    } catch {
      return { success: true, tree: [] }
    }

    // 递归扫描目录
    const tree = await scanModsDirectory(disableModsPath)
    return { success: true, tree }
  } catch (error) {
    return { success: false, error: '扫描失败: ' + (error as Error).message }
  }
})

// 扫描 Mods 目录的 IPC handler
ipcMain.handle('scan-mods-directory', async (_event, basePath: string) => {
  try {
    if (!basePath) {
      return { success: false, error: '路径为空' }
    }

    const modsPath = path.join(basePath, 'Mods')
    console.log(`[scan-mods-directory] 开始扫描 Mods 目录: ${modsPath}`)

    // 检查 Mods 文件夹是否存在
    try {
      const stats = await fs.stat(modsPath)
      if (!stats.isDirectory()) {
        return { success: false, error: 'Mods 不是一个有效的文件夹' }
      }
    } catch {
      return { success: false, error: '未找到 Mods 文件夹' }
    }

    // 递归扫描目录
    const tree = await scanModsDirectory(modsPath)
    console.log(`[scan-mods-directory] 扫描完成，返回 ${tree.length} 个顶层节点`)
    console.log(`[scan-mods-directory] 树结构:`, JSON.stringify(tree, null, 2))
    return { success: true, tree }
  } catch (error) {
    console.error('[scan-mods-directory] 扫描失败:', error)
    return { success: false, error: '扫描失败: ' + (error as Error).message }
  }
})

// 检查文件夹内是否有其他 mod
async function checkOtherModsInFolder(folderPath: string): Promise<{ hasOtherMods: boolean; modCount: number }> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    let modCount = 0

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(folderPath, entry.name)
        const entryLuaPath = path.join(subPath, 'Entry.lua')
        try {
          await fs.access(entryLuaPath)
          modCount++
        } catch {
          // 没有 Entry.lua，继续检查子目录
          const subResult = await checkOtherModsInFolder(subPath)
          modCount += subResult.modCount
        }
      }
    }

    return { hasOtherMods: modCount > 0, modCount }
  } catch {
    return { hasOtherMods: false, modCount: 0 }
  }
}

// 获取需要删除的 Entry.lua 文件列表（只删除 Entry.lua）
async function getEntryLuaFilesToDelete(folderPath: string): Promise<string[]> {
  const entryLuaFiles: string[] = []

  async function scanForEntryLua(dirPath: string) {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        await scanForEntryLua(fullPath)
      } else if (entry.name === 'Entry.lua') {
        entryLuaFiles.push(fullPath)
      }
    }
  }

  await scanForEntryLua(folderPath)
  return entryLuaFiles
}

// 删除 mod - 检查是否有其他 mod
ipcMain.handle('check-mod-delete', async (_event, modPath: string) => {
  try {
    if (!modPath) {
      return { success: false, error: 'Mod 路径为空' }
    }

    // 获取 DCS 路径
    const dcsPath = (store as any).get('dcsPath', '')
    if (!dcsPath) {
      return { success: false, error: '未配置 DCS 路径' }
    }

    // 统一使用正斜杠
    const normalizedModPath = modPath.replace(/\\/g, '/')
    const normalizedDcsPath = dcsPath.replace(/\\/g, '/')
    const modsPath = normalizedDcsPath + '/Mods'

    // 检查 mod 路径是否在 Mods 目录下
    if (!normalizedModPath.startsWith(modsPath)) {
      return { success: false, error: 'Mod 不在 Mods 目录下' }
    }

    const modName = normalizedModPath.split('/').pop() || ''

    // 直接检查当前 mod 目录下的子文件夹是否有其他 Entry.lua（不包括当前目录自身）
    const otherModCount = await checkSubFoldersForOtherMods(normalizedModPath)

    return {
      success: true,
      hasOtherMods: otherModCount > 0,
      otherModCount,
      luaFileCount: 1, // Entry.lua 数量固定为 1
      modName
    }
  } catch (error) {
    return { success: false, error: '检查失败: ' + (error as Error).message }
  }
})

// 检查当前 mod 目录下的子文件夹是否有其他 Entry.lua
async function checkSubFoldersForOtherMods(folderPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    let count = 0

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subPath = path.join(folderPath, entry.name)
        const entryLuaPath = path.join(subPath, 'Entry.lua')
        try {
          await fs.access(entryLuaPath)
          count++ // 找到其他 mod
        } catch {
          // 没有 Entry.lua，递归检查子文件夹
          count += await checkSubFoldersForOtherMods(subPath)
        }
      }
    }
    return count
  } catch {
    return 0
  }
}

// 删除 mod - 完整删除
ipcMain.handle('delete-mod-folder', async (_event, modPath: string) => {
  try {
    if (!modPath) {
      return { success: false, error: 'Mod 路径为空' }
    }

    // 获取 DCS 路径
    const dcsPath = (store as any).get('dcsPath', '')
    if (!dcsPath) {
      return { success: false, error: '未配置 DCS 路径' }
    }

    // 统一使用正斜杠
    const normalizedModPath = modPath.replace(/\\/g, '/')
    const normalizedDcsPath = dcsPath.replace(/\\/g, '/')
    const modsPath = normalizedDcsPath + '/Mods'

    // 检查 mod 路径是否在 Mods 目录下
    if (!normalizedModPath.startsWith(modsPath)) {
      return { success: false, error: 'Mod 不在 Mods 目录下' }
    }

    // 删除整个文件夹
    await fs.rm(normalizedModPath, { recursive: true, force: true })

    // 尝试清理空父目录
    const parentPath = normalizedModPath.substring(0, normalizedModPath.lastIndexOf('/'))
    try {
      const entries = await fs.readdir(parentPath)
      if (entries.length === 0) {
        await fs.rmdir(parentPath)
      }
    } catch {
      // 忽略
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: '删除失败: ' + (error as Error).message }
  }
})

// 删除 mod - 只删除 lua 文件
ipcMain.handle('delete-mod-lua', async (_event, modPath: string) => {
  try {
    if (!modPath) {
      return { success: false, error: 'Mod 路径为空' }
    }

    // 获取 DCS 路径
    const dcsPath = (store as any).get('dcsPath', '')
    if (!dcsPath) {
      return { success: false, error: '未配置 DCS 路径' }
    }

    // 统一使用正斜杠
    const normalizedModPath = modPath.replace(/\\/g, '/')
    const normalizedDcsPath = dcsPath.replace(/\\/g, '/')
    const modsPath = normalizedDcsPath + '/Mods'

    // 检查 mod 路径是否在 Mods 目录下
    if (!normalizedModPath.startsWith(modsPath)) {
      return { success: false, error: 'Mod 不在 Mods 目录下' }
    }

    // 获取所有 Entry.lua 文件
    const entryLuaFiles = await getEntryLuaFilesToDelete(normalizedModPath)

    // 删除所有 Entry.lua 文件
    for (const luaFile of entryLuaFiles) {
      await fs.unlink(luaFile)
    }

    // 清理空目录
    async function cleanEmptyDirs(dirPath: string) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(dirPath, entry.name)
          await cleanEmptyDirs(subPath)
          // 检查是否为空
          const subEntries = await fs.readdir(subPath)
          if (subEntries.length === 0) {
            await fs.rmdir(subPath)
          }
        }
      }
    }
    await cleanEmptyDirs(normalizedModPath)

    // 最后检查 mod 目录是否为空
    try {
      const finalEntries = await fs.readdir(normalizedModPath)
      if (finalEntries.length === 0) {
        await fs.rmdir(normalizedModPath)
      }
    } catch {
      // 忽略
    }

    return { success: true, deletedCount: entryLuaFiles.length }
  } catch (error) {
    return { success: false, error: '删除失败: ' + (error as Error).message }
  }
})
