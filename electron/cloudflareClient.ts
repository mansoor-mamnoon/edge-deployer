// electron/cloudflareUploader.ts

import fetch from "node-fetch"; // Make sure installed with `npm i node-fetch`

interface CloudflareResponse {
  success: boolean;
  errors?: any[];
  messages?: any[];
  result?: any;
}

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
export const uploadToCloudflare = async (code: string) => {
  const token = process.env.CF_API_TOKEN!;
  const accountId = process.env.CF_ACCOUNT_ID!;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/edge-deployer-script`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/javascript",
    },
    body: code,
  });

  const data = (await response.json()) as CloudflareResponse;
  console.log("🌐 Cloudflare response:", JSON.stringify(data, null, 2));

  if (!data.success) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data;
};