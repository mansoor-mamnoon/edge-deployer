// src/utils/cloudflareClient.ts

import fetch from "node-fetch"; // Needed for Node/Electron

interface CloudflareResponse {
  success: boolean;
  errors?: any[];
  messages?: any[];
  result?: any;
}

/**
 * Uploads a script to Cloudflare Workers using user-provided credentials.
 * @param userCode The JavaScript code to upload
 */
export const uploadToCloudflare = async (userCode: string) => {
  // Step 1: Get stored credentials from localStorage
  const config = JSON.parse(localStorage.getItem("envConfig") || "{}");

  if (!config.apiKey || !config.accountId || !config.scriptName) {
    throw new Error("Missing API key, Account ID, or Script Name. Please fill out the config panel.");
  }

  // Step 2: Construct Cloudflare endpoint
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/workers/scripts/${config.scriptName}`;

  // Step 3: Make the PUT request
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/javascript",
    },
    body: userCode,
  });

  const result = (await res.json()) as CloudflareResponse;

  // Step 4: Check for success
  if (!result.success) {
    console.error("Cloudflare upload failed:", result.errors);
    throw new Error("Upload failed. See console for details.");
  }

  return result;
};
