#!/usr/bin/env node
/**
 * One-time Dropbox OAuth flow to obtain a refresh token.
 *
 * Usage:
 *   DROPBOX_APP_KEY=xxx DROPBOX_APP_SECRET=yyy node scripts/dropbox-auth.mjs
 *
 * On success it prints the three env vars to add to .env.local.
 */

import http from "http";
import { exec } from "child_process";

const APP_KEY    = process.env.DROPBOX_APP_KEY;
const APP_SECRET = process.env.DROPBOX_APP_SECRET;
const PORT       = 3001;
const REDIRECT   = `http://localhost:${PORT}`;

if (!APP_KEY || !APP_SECRET) {
  console.error("\nMissing env vars. Run like this:\n");
  console.error("  DROPBOX_APP_KEY=xxx DROPBOX_APP_SECRET=yyy node scripts/dropbox-auth.mjs\n");
  process.exit(1);
}

const authUrl =
  `https://www.dropbox.com/oauth2/authorize` +
  `?client_id=${APP_KEY}` +
  `&response_type=code` +
  `&token_access_type=offline` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}`;

console.log("\nOpening Dropbox in your browser...");
console.log("If it doesn't open automatically, visit:\n");
console.log("  " + authUrl + "\n");

const opener =
  process.platform === "darwin" ? "open" :
  process.platform === "win32"  ? "start" :
  "xdg-open";
exec(`${opener} "${authUrl}"`);

const server = http.createServer(async (req, res) => {
  const url   = new URL(req.url, `http://localhost:${PORT}`);
  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!code && !error) { res.writeHead(404); res.end(); return; }

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page("Authorization denied", `<p style="color:red">${error}</p>`, false));
    server.close();
    return;
  }

  // Exchange code → tokens
  const credentials = Buffer.from(`${APP_KEY}:${APP_SECRET}`).toString("base64");

  let data;
  try {
    const r = await fetch("https://api.dropboxapi.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: REDIRECT }),
    });
    data = await r.json();
  } catch (err) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page("Request failed", `<p style="color:red">${err.message}</p>`, false));
    server.close();
    return;
  }

  if (data.error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(page("Token error", `<p style="color:red">${data.error_description ?? data.error}</p>`, false));
    server.close();
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(page("Connected!", "<p>You can close this tab and check your terminal.</p>", true));

  console.log("\n✓ Success! Add these to your .env.local:\n");
  console.log(`DROPBOX_APP_KEY=${APP_KEY}`);
  console.log(`DROPBOX_APP_SECRET=${APP_SECRET}`);
  console.log(`DROPBOX_REFRESH_TOKEN=${data.refresh_token}`);
  console.log("\nDone — you can Ctrl+C now.\n");

  server.close();
});

server.listen(PORT, () => {
  console.log(`Waiting for Dropbox callback on http://localhost:${PORT} ...\n`);
});

function page(title, body, success) {
  const color = success ? "#059669" : "#dc2626";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f2;}
    .card{background:#fff;border:1px solid #e2e8f0;padding:40px 48px;max-width:420px;text-align:center;}
    h1{color:${color};font-size:20px;margin:0 0 12px;}p{color:#64748b;font-size:14px;margin:0;}</style>
    </head><body><div class="card"><h1>${title}</h1>${body}</div></body></html>`;
}
