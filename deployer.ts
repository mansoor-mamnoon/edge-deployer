// electron/deployer.ts
import * as fs from "fs";
import * as path from "path";

export const bundleAndSave = async (code: string) => {
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const filePath = path.join(tempDir, "user-code.js");
  fs.writeFileSync(filePath, code);
  console.log("✅ Code saved for deployment at:", filePath);
  return filePath;
};
