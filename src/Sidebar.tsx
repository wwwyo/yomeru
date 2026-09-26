import type { NoteRecord } from "./types";

interface SidebarProps {
  notes: NoteRecord[];
  onSelectNote: (note: NoteRecord) => void;
  onDeleteNote: (id: string) => void;
}

export function Sidebar({ notes, onSelectNote, onDeleteNote }: SidebarProps) {
  const sorted = [...notes].sort((a, b) => a.page - b.page);

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">ノート ({notes.length})</h2>
      {sorted.length === 0 && <p className="sidebar-empty">まだノートがありません</p>}
      <ul className="sidebar-list">
        {sorted.map((note) => (
          <li key={note.id} className={`sidebar-item sidebar-item-${note.kind}`}>
            <button type="button" className="sidebar-item-main" onClick={() => onSelectNote(note)}>
              <span className="sidebar-item-page">p.{note.page}</span>
              <span className="sidebar-item-kind">{note.kind === "highlight" ? "ハイライト" : "Claude に聞く"}</span>
              <span className="sidebar-item-quote">{truncate(note.quote, 40)}</span>
              {note.note && <span className="sidebar-item-note">{note.note}</span>}
            </button>
            <button
              type="button"
              className="sidebar-item-delete"
              onClick={() => onDeleteNote(note.id)}
              aria-label="ノートを削除"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
