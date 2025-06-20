"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const deployer_1 = require("./deployer");
const deployer_2 = require("./deployer");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
console.log("🔐 CF API Token:", process.env.CF_API_TOKEN);
electron_1.ipcMain.handle("deploy-to-cloudflare", async (_e, code) => {
    return (0, deployer_2.uploadToCloudflare)(code);
});
const createWindow = () => {
    const win = new electron_1.BrowserWindow({
        width: 1000,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
        },
    });
    win.loadURL("http://localhost:8080");
};
electron_1.app.whenReady().then(createWindow);
// 🔹 Save File Handler
electron_1.ipcMain.handle("save-file", async (_, code) => {
    const result = await electron_1.dialog.showSaveDialog({
        filters: [{ name: "JavaScript Files", extensions: ["js"] }],
    });
    const { filePath, canceled } = result;
    if (!canceled && filePath) {
        fs.writeFileSync(filePath, code, "utf-8");
        return true;
    }
    return false;
});
// 🔹 Open File Handler
electron_1.ipcMain.handle("open-file", async () => {
    console.log("📂 ipcMain: open-file triggered");
    const result = await electron_1.dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "JavaScript Files", extensions: ["js"] }],
    });
    console.log("📂 dialog result:", result);
    const { filePaths, canceled } = result;
    if (!canceled && filePaths.length > 0) {
        const content = fs.readFileSync(filePaths[0], "utf-8");
        console.log("📂 Loaded content from disk:", content.slice(0, 100)); // Log first 100 chars
        return content;
    }
    return null;
});
electron_1.ipcMain.handle("deploy-code", async (_event, code) => {
    console.log("🚀 ipcMain: deploy-code triggered");
    const filePath = await (0, deployer_1.bundleAndSave)(code);
    return filePath;
});
