import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";



const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.loadURL("http://localhost:8080");
};

app.whenReady().then(createWindow);

// 🔹 Save File Handler
ipcMain.handle("save-file", async (_, code: string) => {
  const result = await dialog.showSaveDialog({
    filters: [{ name: "JavaScript Files", extensions: ["js"] }],
  }) as Electron.SaveDialogReturnValue;

  const { filePath, canceled } = result;

  if (!canceled && filePath) {
    fs.writeFileSync(filePath, code, "utf-8");
    return true;
  }

  return false;
});

// 🔹 Open File Handler
ipcMain.handle("open-file", async () => {
  console.log("📂 ipcMain: open-file triggered");

  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "JavaScript Files", extensions: ["js"] }],
  }) as Electron.OpenDialogReturnValue;

  console.log("📂 dialog result:", result);

  const { filePaths, canceled } = result;

  if (!canceled && filePaths.length > 0) {
    const content = fs.readFileSync(filePaths[0], "utf-8");
    console.log("📂 Loaded content from disk:", content.slice(0, 100)); // Log first 100 chars
    return content;
  }

  return null;
});

