import { app, BrowserWindow } from "electron";
import * as path from "path";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  // Load your frontend from the webpack dev server
  win.loadURL("http://localhost:8080");

  // ✅ Open the DevTools in Electron (very helpful!)
};

app.whenReady().then(createWindow);
