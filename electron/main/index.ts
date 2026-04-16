import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { release } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
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
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
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
const preload = join(__dirname, '../preload/index.mjs')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(process.env.VITE_PUBLIC, 'favicon.ico'),
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

    const modsPath = join(folderPath, 'Mods')

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
    // 匹配 displayName = "xxx" 或 displayName = 'xxx'
    const displayNameMatch = content.match(/displayName\s*=\s*["']([^"']+)["']/);
    if (displayNameMatch) {
      result.displayName = displayNameMatch[1];
    }

    // 匹配 version = "xxx"
    const versionMatch = content.match(/version\s*=\s*["']([^"']+)["']/);
    if (versionMatch) {
      result.version = versionMatch[1];
    }

    // 匹配 developerName = "xxx"
    const developerMatch = content.match(/developerName\s*=\s*["']([^"']+)["']/);
    if (developerMatch) {
      result.developerName = developerMatch[1];
    }

    // 匹配 info = _("xxx") - DCS 使用 _() 函数包裹字符串
    const infoMatch = content.match(/info\s*=\s*_\(["']([^"']+)["']\)/);
    if (infoMatch) {
      result.info = infoMatch[1];
    }
  } catch (error) {
    console.error('解析 Entry.lua 失败:', error);
  }

  return result;
}

async function scanModsDirectory(dirPath: string, parentKey: string = ''): Promise<ModTreeNode[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const nodes: ModTreeNode[] = []

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name)
    const key = parentKey ? `${parentKey}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      const entryLuaPath = join(fullPath, 'Entry.lua')
      let hasEntryLua = false

      try {
        await fs.access(entryLuaPath)
        hasEntryLua = true
      } catch {
        hasEntryLua = false
      }

      if (hasEntryLua) {
        // 读取并解析 Entry.lua
        const entryContent = await fs.readFile(entryLuaPath, 'utf-8');
        const parsed = parseEntryLua(entryContent);

        nodes.push({
          title: entry.name,
          key,
          path: fullPath,
          isMod: true,
          children: [],
          entryLuaPath,
          displayName: parsed.displayName || entry.name,
          version: parsed.version || '未知',
          info: parsed.info || '未知',
          developerName: parsed.developerName || '未知'
        })
      } else {
        // 普通文件夹，递归扫描
        const children = await scanModsDirectory(fullPath, key)
        if (children.length > 0) {
          nodes.push({
            title: entry.name,
            key,
            path: fullPath,
            isMod: false,
            children
          })
        }
      }
    }
  }

  return nodes
}

// 获取禁用的 mods 列表
ipcMain.handle('get-disabled-mods', async () => {
  return (store as any).get('disabledMods', [])
})

// 禁用 mod - 移动到 disable_mods 文件夹
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

    // 获取 mod 相对于 Mods 的路径（保留目录结构，使用正斜杠）
    const relativePath = normalizedModPath.replace(modsPath + '/', '')

    // disable_mods 在 DCS 根目录下
    const disableModsPath = normalizedDcsPath + '/disable_mods'
    // 目标路径（保留相对路径结构）
    const targetPath = join(disableModsPath, relativePath)
    // 确保目标目录存在
    const targetDir = dirname(targetPath)
    try {
      await fs.access(targetDir)
    } catch {
      await fs.mkdir(targetDir, { recursive: true })
    }

    // 检查 disable_mods 下的目标路径是否已存在
    try {
      await fs.access(targetPath)
      return { success: false, error: '该 Mod 已在禁用列表中' }
    } catch {
      // 不存在，可以继续
    }

    // 检查源目录是否存在
    try {
      await fs.access(modPath)
    } catch {
      return { success: false, error: 'Mod 目录不存在或已被移动' }
    }

    // 移动文件夹到 disable_mods（保留目录结构）
    await fs.rename(modPath, targetPath)

    // 保存禁用信息到 store（使用正斜杠路径）
    const disabledMods = (store as any).get('disabledMods', [])
    disabledMods.push({
      originalPath: normalizedModPath,
      modName: relativePath,  // 使用正斜杠相对路径
      disabledAt: new Date().toISOString()
    })
    ;(store as any).set('disabledMods', disabledMods)

    return { success: true }
  } catch (error) {
    return { success: false, error: '禁用失败: ' + (error as Error).message }
  }
})

// 启用 mod - 从 disable_mods 移回原位置
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
    const disabledModFullPath = join(disableModsPath, normalizedDisabledModPath)

    // 检查 disable_mods 目录下的 mod 是否存在
    try {
      await fs.access(disabledModFullPath)
    } catch {
      return { success: false, error: '禁用的 Mod 不存在: ' + disabledModFullPath }
    }

    // 确定目标路径
    let targetPath: string
    if (originalPath) {
      // 如果提供了原始路径，规范化它
      targetPath = originalPath.replace(/\\/g, '/')
    } else {
      // 否则从 store 中查找（使用多种路径格式匹配）
      const disabledMods: DisabledModInfo[] = (store as any).get('disabledMods', [])
      const normalizedPath = normalizedDisabledModPath

      // 尝试多种匹配方式
      const modInfo = disabledMods.find(m => {
        const storedModName = m.modName.replace(/\\/g, '/')
        const storedModNameBackslash = m.modName.replace(/\//g, '\\')
        return storedModName === normalizedPath ||
               storedModNameBackslash === normalizedPath ||
               normalizedPath.endsWith(storedModName) ||
               storedModName.endsWith(normalizedPath)
      })

      if (!modInfo) {
        return { success: false, error: '未找到 Mod 的禁用记录: ' + normalizedPath }
      }
      targetPath = modInfo.originalPath.replace(/\\/g, '/')
    }

    // 确保目标目录存在
    const targetDir = dirname(targetPath)
    try {
      await fs.access(targetDir)
    } catch {
      await fs.mkdir(targetDir, { recursive: true })
    }

    // 检查目标是否已存在
    try {
      await fs.access(targetPath)
      return { success: false, error: '目标位置已存在同名文件' }
    } catch {
      // 不存在，可以继续
    }

    // 移动回原位置
    await fs.rename(disabledModFullPath, targetPath)

    // 从 store 中移除（使用兼容的路径匹配）
    const disabledMods = (store as any).get('disabledMods', [])
    const normalizedPath = normalizedDisabledModPath
    const updatedDisabledMods = disabledMods.filter((m: DisabledModInfo) => {
      const storedModName = m.modName.replace(/\\/g, '/')
      // 移除匹配到的记录
      return storedModName !== normalizedPath
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
    const disableModsPath = join(basePath, 'disable_mods')

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

    const modsPath = join(basePath, 'Mods')

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
    return { success: true, tree }
  } catch (error) {
    return { success: false, error: '扫描失败: ' + (error as Error).message }
  }
})
