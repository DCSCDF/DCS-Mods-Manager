import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { release } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'

interface AppConfig {
  dcsPath: string
}

const store = new Store<AppConfig>({
  defaults: {
    dcsPath: ''
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
