import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "./index";

let dir: string;
let bookPath: string;
let notesPath: string;
let server: ReturnType<typeof startServer>;
let baseUrl: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "yomeru-test-"));
  bookPath = join(dir, "sample-book.pdf");
  notesPath = join(dir, "notes", "notes.ndjson");
  await Bun.write(bookPath, new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]));

  server = startServer({ bookPath, notesPath, port: 0 });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterEach(async () => {
  server.stop(true);
  await rm(dir, { recursive: true, force: true });
});

function validNoteBody(overrides: Record<string, unknown> = {}) {
  return {
    kind: "highlight",
    page: 125,
    quote: "理科系の作文技術",
    note: "メモ",
    rects: [{ x: 0.12, y: 0.34, w: 0.5, h: 0.02 }],
    ...overrides,
  };
}

describe("GET /api/book/meta", () => {
  test("returns title/path/notesPath derived from the book file", async () => {
    const res = await fetch(`${baseUrl}/api/book/meta`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      title: "sample-book",
      path: bookPath,
      notesPath,
    });
  });
});

describe("GET /api/book", () => {
  test("streams the raw PDF bytes", async () => {
    const res = await fetch(`${baseUrl}/api/book`);
    expect(res.status).toBe(200);
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes).toEqual(new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]));
  });
});

describe("GET /api/notes", () => {
  test("returns an empty array when no notes file exists yet", async () => {
    const res = await fetch(`${baseUrl}/api/notes`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/notes", () => {
  test("appends a record to the NDJSON file and returns it", async () => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validNoteBody()),
    });
    expect(res.status).toBe(201);
    const created = await res.json();
    expect(created.id).toEqual(expect.any(String));
    expect(created.kind).toBe("highlight");
    expect(created.page).toBe(125);
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);

    const listRes = await fetch(`${baseUrl}/api/notes`);
    const list = await listRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);

    const raw = await readFile(notesPath, "utf8");
    expect(raw.trim().split("\n")).toHaveLength(1);
  });

  test.each([
    ["missing page", validNoteBody({ page: undefined })],
    ["invalid kind", validNoteBody({ kind: "memo" })],
    ["rects not an array", validNoteBody({ rects: "nope" })],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/notes/:id", () => {
  test("appends a tombstone and hides the note from GET /api/notes", async () => {
    const createRes = await fetch(`${baseUrl}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validNoteBody()),
    });
    const created = await createRes.json();

    const deleteRes = await fetch(`${baseUrl}/api/notes/${created.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    const tombstone = await deleteRes.json();
    expect(tombstone).toEqual({ id: created.id, deleted: true, at: expect.any(String) });

    const listRes = await fetch(`${baseUrl}/api/notes`);
    expect(await listRes.json()).toEqual([]);

    const raw = await readFile(notesPath, "utf8");
    expect(raw.trim().split("\n")).toHaveLength(2);
  });
});
