import { basename, join } from "node:path";
import { type ServerConfig, loadConfigOrExit } from "./config";
import { appendNote, readNotes, tombstoneNote, validateNoteInput } from "./notes";

export interface StartOptions extends ServerConfig {
  port?: number;
}

// pdf.js の cMapUrl/standardFontDataUrl はファイル名をそのまま付け足して fetch するため、
// dev(vite proxy)・build 後のどちらでも同じ URL 形で配信できるようサーバー自身が持つ。
const PDFJS_DIST_DIR = join(import.meta.dir, "..", "node_modules", "pdfjs-dist");
const SAFE_ASSET_NAME = /^[\w.-]+$/;

function servePdfjsAsset(dir: string, filename: string): Response {
  if (!SAFE_ASSET_NAME.test(filename)) return new Response("Not Found", { status: 404 });
  return new Response(Bun.file(join(PDFJS_DIST_DIR, dir, filename)));
}

export function startServer({ bookPath, notesPath, port }: StartOptions) {
  const title = basename(bookPath).replace(/\.[^./]+$/, "");

  return Bun.serve({
    hostname: "127.0.0.1",
    port: port ?? 8787,
    async fetch(req) {
      const url = new URL(req.url);

      if (req.method === "GET" && url.pathname === "/api/book") {
        return new Response(Bun.file(bookPath));
      }

      if (req.method === "GET" && url.pathname === "/api/book/meta") {
        return Response.json({ title, path: bookPath, notesPath });
      }

      if (req.method === "GET" && url.pathname === "/api/notes") {
        return Response.json(await readNotes(notesPath));
      }

      if (req.method === "POST" && url.pathname === "/api/notes") {
        let body: unknown;
        try {
          body = await req.json();
        } catch {
          return Response.json({ error: "invalid JSON body" }, { status: 400 });
        }
        const validated = validateNoteInput(body);
        if (!validated.ok) {
          return Response.json({ error: validated.error }, { status: 400 });
        }
        const record = await appendNote(notesPath, validated.value);
        return Response.json(record, { status: 201 });
      }

      const deleteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/);
      if (req.method === "DELETE" && deleteMatch) {
        const record = await tombstoneNote(notesPath, decodeURIComponent(deleteMatch[1]!));
        return Response.json(record);
      }

      const cmapMatch = url.pathname.match(/^\/cmaps\/([^/]+)$/);
      if (req.method === "GET" && cmapMatch) {
        return servePdfjsAsset("cmaps", cmapMatch[1]!);
      }

      const fontMatch = url.pathname.match(/^\/standard_fonts\/([^/]+)$/);
      if (req.method === "GET" && fontMatch) {
        return servePdfjsAsset("standard_fonts", fontMatch[1]!);
      }

      return new Response("Not Found", { status: 404 });
    },
  });
}

if (import.meta.main) {
  const config = loadConfigOrExit(process.env);
  const server = startServer(config);
  console.log(`yomeru server listening on http://${server.hostname}:${server.port}`);
}
