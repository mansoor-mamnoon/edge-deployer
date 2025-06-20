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
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudflare = exports.bundleAndSave = void 0;
// electron/deployer.ts
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cloudflareClient_1 = require("./cloudflareClient"); // ✅ import moved function
Object.defineProperty(exports, "uploadToCloudflare", { enumerable: true, get: function () { return cloudflareClient_1.uploadToCloudflare; } });
/**
 * Saves code to disk before uploading or previewing
 * @param code The JS code to save
 * @returns Full file path of saved code
 */
const bundleAndSave = async (code) => {
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir))
        fs.mkdirSync(tempDir);
    const filePath = path.join(tempDir, "user-code.js");
    fs.writeFileSync(filePath, code);
    console.log("✅ Code saved for deployment at:", filePath);
    return filePath;
};
exports.bundleAndSave = bundleAndSave;
