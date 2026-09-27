import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type NoteKind = "highlight" | "question";

export interface NoteRecord {
  id: string;
  kind: NoteKind;
  page: number;
  quote: string;
  note: string;
  rects: Rect[];
  createdAt: string;
}

export interface TombstoneRecord {
  id: string;
  deleted: true;
  at: string;
}

export interface NoteInput {
  kind: NoteKind;
  page: number;
  quote: string;
  note: string;
  rects: Rect[];
}

type ValidationResult = { ok: true; value: NoteInput } | { ok: false; error: string };

export function validateNoteInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (b.kind !== "highlight" && b.kind !== "question") {
    return { ok: false, error: "kind must be 'highlight' or 'question'" };
  }
  if (typeof b.page !== "number" || !Number.isInteger(b.page) || b.page < 1) {
    return { ok: false, error: "page must be a positive integer" };
  }
  if (typeof b.quote !== "string") {
    return { ok: false, error: "quote must be a string" };
  }
  if (b.note !== undefined && typeof b.note !== "string") {
    return { ok: false, error: "note must be a string" };
  }
  if (!Array.isArray(b.rects) || b.rects.length === 0 || !b.rects.every(isRect)) {
    return { ok: false, error: "rects must be a non-empty array of {x,y,w,h} numbers" };
  }

  return {
    ok: true,
    value: {
      kind: b.kind,
      page: b.page,
      quote: b.quote,
      note: (b.note as string | undefined) ?? "",
      rects: b.rects as Rect[],
    },
  };
}

function isRect(value: unknown): value is Rect {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.x === "number" && typeof r.y === "number" && typeof r.w === "number" && typeof r.h === "number";
}

/** 追記型フォーマットを維持したまま、tombstone 済みレコードを除いた最新状態を返す。 */
export async function readNotes(notesPath: string): Promise<NoteRecord[]> {
  const file = Bun.file(notesPath);
  if (!(await file.exists())) return [];

  const text = await file.text();
  const records = new Map<string, NoteRecord>();
  const deletedIds = new Set<string>();

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const parsed = JSON.parse(line) as NoteRecord | TombstoneRecord;
    if ("deleted" in parsed && parsed.deleted) {
      deletedIds.add(parsed.id);
    } else {
      records.set(parsed.id, parsed as NoteRecord);
    }
  }

  return [...records.values()].filter((r) => !deletedIds.has(r.id));
}

export async function appendNote(notesPath: string, input: NoteInput): Promise<NoteRecord> {
  const record: NoteRecord = {
    id: crypto.randomUUID(),
    kind: input.kind,
    page: input.page,
    quote: input.quote,
    note: input.note,
    rects: input.rects,
    createdAt: localIsoNow(),
  };
  await appendLine(notesPath, record);
  return record;
}

export async function tombstoneNote(notesPath: string, id: string): Promise<TombstoneRecord> {
  const record: TombstoneRecord = { id, deleted: true, at: localIsoNow() };
  await appendLine(notesPath, record);
  return record;
}

async function appendLine(notesPath: string, record: NoteRecord | TombstoneRecord): Promise<void> {
  await mkdir(dirname(notesPath), { recursive: true });
  const file = Bun.file(notesPath);
  const existing = (await file.exists()) ? await file.text() : "";
  await Bun.write(notesPath, `${existing}${JSON.stringify(record)}\n`);
}

// Date#toISOString は UTC 固定なので、契約で要求されるローカル TZ オフセット付き ISO8601 には使えない。
function localIsoNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${date}T${time}${offset}`;
}
