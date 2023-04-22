// Import Electron and IPC
const {app, BrowserWindow} = require('electron');
const ipc = require('electron').ipcMain;
const path = require('path');

// Function to create the main window
const createWindow = () => {
  // Main window with preload script + webview support
  const mainWindow = new BrowserWindow({
    width: 1230,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'index-preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
    autoHideMenuBar: true,
  });
  // Load the dashboard
  mainWindow.loadFile('index.html')

  // ==> uncomment for debugging with dev tools
  //mainWindow.webContents.openDevTools({mode: 'undocked'});
};

// IPC function to close the app
ipc.on("close-app", (e, msg) => {
  BrowserWindow.getAllWindows().forEach((browserWindow) => {
    browserWindow.close();
  });
});

// App contstuction
app.whenReady().then(() => {
  // Create the window
  createWindow();
  // ==> A fix for macOS
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// App desctruction
app.on('window-all-closed', () => {
  // ==> A fix for macOS
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
