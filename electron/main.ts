import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";
import { bundleAndSave } from "./deployer";
import { uploadToCloudflare } from "./deployer";

import dotenv from "dotenv";
dotenv.config();

function sendLog(win: BrowserWindow, line: string) {
  win.webContents.send("deploy-log", line);
}


console.log("🔐 CF API Token:", process.env.CF_API_TOKEN);

ipcMain.handle("deploy-to-cloudflare", async (_event, code: string) => {
  const win = BrowserWindow.getAllWindows()[0]; // Get the current window

  sendLog(win, "✅ Starting deployment...");
  sendLog(win, "📦 Bundling files...");

  try {
    const result = await uploadToCloudflare(code);
    sendLog(win, "☁️ Uploading to Cloudflare...");
    sendLog(win, "✅ Deploy complete!");
    sendLog(win, "✅ Starting deployment...");
    sendLog(win, "Bundling files...");
    sendLog(win, "Uploading to AWS...");
    sendLog(win, "✅ Deploy complete!");

    return result;
  } catch (error) {
    if (error instanceof Error) {
      sendLog(win, `❌ Deployment failed: ${error.message}`);
    } else {
      sendLog(win, `❌ Deployment failed: ${String(error)}`);
    }
    throw error;
  }
  
});



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


ipcMain.handle("deploy-code", async (_event, code: string) => {
  console.log("🚀 ipcMain: deploy-code triggered");
  const filePath = await bundleAndSave(code);
  return filePath;
});

ipcMain.handle("download-pulumi", async (_event, config: any, code: string) => {
  const { generatePulumiCloudflare } = await import("./generatePulumiCloudflare");
  const jszip = require("jszip");
  const { saveAs } = require("file-saver");

  const pulumiCode = generatePulumiCloudflare(config, code, true);
  const zip = new jszip();
  zip.file("Pulumi.yaml", `name: cloudflare-worker\ndescription: Infra as code demo\nruntime: nodejs`);
  zip.file("index.ts", pulumiCode);

  const content = await zip.generateAsync({ type: "nodebuffer" });
  const filePath = path.join(app.getPath("downloads"), "pulumi-cloudflare.zip");
  fs.writeFileSync(filePath, content);

  return filePath;
});
