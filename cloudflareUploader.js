"use strict";
// electron/cloudflareUploader.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudflare = void 0;
const node_fetch_1 = __importDefault(require("node-fetch")); // Make sure installed with `npm i node-fetch`
/**
 * Uploads code to Cloudflare Workers using the API
 * @param code The JavaScript code to upload
 * @returns Cloudflare API response or throws an error
 *
 * 🔐 Requires environment variables:
 *   - CF_API_TOKEN: API token with permissions:
 *     • Workers Scripts: Edit
 *     • (Optional) Workers Routes: Edit — if you’re routing through custom domains
 *   - CF_ACCOUNT_ID: Your Cloudflare account ID
 */
const uploadToCloudflare = async (code) => {
    const token = process.env.CF_API_TOKEN;
    const accountId = process.env.CF_ACCOUNT_ID;
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/edge-deployer-script`;
    const response = await (0, node_fetch_1.default)(url, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/javascript",
        },
        body: code,
    });
    const data = (await response.json());
    console.log("🌐 Cloudflare response:", JSON.stringify(data, null, 2));
    if (!data.success) {
        throw new Error(JSON.stringify(data.errors));
    }
    return data;
};
exports.uploadToCloudflare = uploadToCloudflare;
