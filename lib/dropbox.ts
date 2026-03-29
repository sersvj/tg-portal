/**
 * Dropbox API utilities.
 * Uses a long-lived refresh token to obtain short-lived access tokens on demand.
 */

const API   = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

// ── Token refresh ─────────────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getDropboxAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const key    = process.env.DROPBOX_APP_KEY;
  const secret = process.env.DROPBOX_APP_SECRET;
  const refresh = process.env.DROPBOX_REFRESH_TOKEN;

  if (!key || !secret || !refresh) {
    throw new Error("Dropbox credentials not configured (DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN)");
  }

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
  });

  const data = await res.json() as { access_token: string; expires_in: number; error?: string };
  if (data.error) throw new Error(`Dropbox token refresh failed: ${data.error}`);

  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

// ── Folder listing ────────────────────────────────────────────────────────────

export type DropboxFolder = {
  name: string;
  path: string;  // display path e.g. /TG Portal/Acme Corp
};

export async function listDropboxFolders(path: string): Promise<DropboxFolder[]> {
  const token = await getDropboxAccessToken();

  type Entry = { ".tag": string; name: string; path_display: string };
  type ListResponse = {
    entries?: Entry[];
    cursor?: string;
    has_more?: boolean;
    error_summary?: string;
  };

  const allEntries: Entry[] = [];

  // First page
  const res = await fetch(`${API}/files/list_folder`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: path === "/" ? "" : path, recursive: false }),
  });
  let data: ListResponse = await res.json();
  if (data.error_summary) throw new Error(`Dropbox list failed: ${data.error_summary}`);
  allEntries.push(...(data.entries ?? []));

  // Continue until all pages are fetched
  while (data.has_more && data.cursor) {
    const cont = await fetch(`${API}/files/list_folder/continue`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ cursor: data.cursor }),
    });
    data = await cont.json();
    if (data.error_summary) throw new Error(`Dropbox list/continue failed: ${data.error_summary}`);
    allEntries.push(...(data.entries ?? []));
  }

  return allEntries
    .filter((e) => e[".tag"] === "folder")
    .map((e) => ({ name: e.name, path: e.path_display }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Folder creation ───────────────────────────────────────────────────────────

export async function ensureDropboxFolder(path: string): Promise<void> {
  const token = await getDropboxAccessToken();

  const res = await fetch(`${API}/files/create_folder_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path, autorename: false }),
  });

  const data = await res.json() as { error_summary?: string };
  // path/conflict/folder means it already exists — that's fine
  if (data.error_summary && !data.error_summary.startsWith("path/conflict/folder")) {
    throw new Error(`Dropbox create folder failed: ${data.error_summary}`);
  }
}

// ── File upload ───────────────────────────────────────────────────────────────

export async function uploadToDropbox(
  folderPath: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const token = await getDropboxAccessToken();

  // Sanitize filename — strip non-ASCII (e.g. macOS narrow no-break space U+202F)
  // then replace characters invalid in Dropbox paths
  const safe = filename
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[/\\:*?"<>|]/g, "_")
    .trim() || "file";
  const destPath = `${folderPath}/${safe}`;

  const res = await fetch(`${CONTENT}/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: destPath,
        mode: "add",
        autorename: true,
        mute: false,
      }),
    },
    body: buffer as unknown as BodyInit,
  });

  const data = await res.json() as { path_display?: string; error_summary?: string };
  if (data.error_summary) throw new Error(`Dropbox upload failed: ${data.error_summary}`);

  return data.path_display ?? destPath;
}
