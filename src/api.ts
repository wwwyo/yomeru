import type { NoteInput, NoteRecord } from "./types";

export interface BookMeta {
  title: string;
  path: string;
  notesPath: string;
}

export async function fetchBookMeta(): Promise<BookMeta> {
  const res = await fetch("/api/book/meta");
  if (!res.ok) throw new Error(`failed to load book meta: ${res.status}`);
  return res.json();
}

export async function fetchNotes(): Promise<NoteRecord[]> {
  const res = await fetch("/api/notes");
  if (!res.ok) throw new Error(`failed to load notes: ${res.status}`);
  return res.json();
}

export async function createNote(input: NoteInput): Promise<NoteRecord> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`failed to create note: ${res.status}`);
  return res.json();
}

export async function deleteNote(id: string): Promise<void> {
  const res = await fetch(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`failed to delete note: ${res.status}`);
}
