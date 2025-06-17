import { app, BrowserWindow } from "electron";
import * as path from "path";

// Function to create the main window
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // __dirname is fine if using CommonJS
      contextIsolation: true,
    },
  });

  win.loadURL("http://localhost:8080"); // Load from Webpack Dev Server
  win.webContents.openDevTools(); // Optional: open DevTools by default
};

// When Electron is ready, create the window
app.whenReady().then(createWindow);

// Optional: Quit the app when all windows are closed (standard on Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Optional: On macOS, re-create a window if the dock icon is clicked and no windows are open
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
