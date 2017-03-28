// System paths
const path = require('path')
const fs = require('fs')

// Electron
const electron = require('electron')

const menu = electron.Menu

// App Info
const app = electron.app
const appTitle = app.getName()
const appIsDev = require('electron-is-dev')
const appConfig = require('./lib/config.js')

// Right Click/Context menu contents
require('electron-context-menu')()

// Main App Window
let mainWindow

// If the application is quitting
let isQuitting = false

// Main Window
function createMainWindow() {
    const lastWindowState = appConfig.get('lastWindowState')

    const appView = new electron.BrowserWindow({
        title: appTitle,
        width: lastWindowState.width,
        height: lastWindowState.height,

        minWidth: 438, // Window minimum width
        minHeight: 395, // Window minimum height
        backgroundColor: '#2e2c29', // Background Color
        titleBarStyle: 'hidden-inset', // Titlebar style (MacOS Only)
        // transparent: true,
        // frame: false,
        center: true, // Center app window?
        movable: true, // Is window movable?
        resizable: true, // Is window resizable?
        fullscreenable: true, // Is app fullscreenable?
        autoHideMenuBar: true // Hide menubar in window on launch
    })
    appView.loadURL('https://playcode.io')

    // When window is closed, hide window
    appView.on('close', e => {
        if (!isQuitting) {
            e.preventDefault()
            if (process.platform === 'darwin') {
                app.hide()
            } else {
                app.quit()
            }
        }
    })

    // Enter fullscreen Playcode fullscreen method execution
    appView.on('enter-full-screen', () => {
        appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronEnteredFullscreen") );')
    })

    // Exit fullscreen Playcode fullscreen method execution
    appView.on('leave-full-screen', () => {
        appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronLeavedFullscreen") );')
    })

    return appView
}

app.on('ready', () => {
    mainWindow = createMainWindow()

    // Setting App menu
    menu.setApplicationMenu(require('./lib/menu.js'))

    // If running in developer environment = Open developer tools
    if (appIsDev) {
        mainWindow.openDevTools()
    }

    const appPage = mainWindow.webContents

    appPage.on('dom-ready', () => {
        // Global Style Additions
        appPage.insertCSS(fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8'))

        // MacOS ONLY style fixes
        if (process.platform === 'darwin') {
            appPage.insertCSS('')
        }

        // Global Code Additions
        appPage.executeJavaScript(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'))

        // Show the Main Window
        mainWindow.show()

        // Open external links in browser
        appPage.on('new-window', (e, url) => {
            e.preventDefault()
            electron.shell.openExternal(url)
        })

        // Navigate the window back when the user hits their mouse back button
        mainWindow.on('app-command', (e, cmd) => {
            if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
                mainWindow.webContents.goBack()
            }
        })
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    mainWindow.show()
})

app.on('before-quit', () => {
    isQuitting = true

    // Saves the current window position and window size to the config file.
    if (!mainWindow.isFullScreen()) {
        appConfig.set('lastWindowState', mainWindow.getBounds())
    }
})
