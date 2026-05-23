// electron/deployer.ts
import * as fs from "fs";
import * as path from "path";
import { uploadToCloudflare } from "./cloudflareClient"; // ✅ import moved function

/**
 * Saves code to disk before uploading or previewing
 * @param code The JS code to save
 * @returns Full file path of saved code
 */
export const bundleAndSave = async (code: string) => {
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const filePath = path.join(tempDir, "user-code.js");
  fs.writeFileSync(filePath, code);
  console.log("✅ Code saved for deployment at:", filePath);
  return filePath;
};

// ✅ Re-export for use in Electron API
export { uploadToCloudflare };