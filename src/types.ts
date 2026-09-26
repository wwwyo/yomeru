// NDJSON レコードの形は server/notes.ts が SSOT。Claude Code への受け渡し契約でもあるため二重定義しない。
export type { NoteInput, NoteKind, NoteRecord, Rect } from "../server/notes";
