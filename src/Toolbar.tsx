import { type FormEvent, useState } from "react";

interface ToolbarProps {
  currentPage: number;
  totalPages: number;
  title: string;
  onJumpToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function Toolbar({ currentPage, totalPages, title, onJumpToPage, onZoomIn, onZoomOut }: ToolbarProps) {
  const [pageInput, setPageInput] = useState("");

  function handleJumpSubmit(e: FormEvent) {
    e.preventDefault();
    const page = Number(pageInput);
    if (Number.isInteger(page) && page >= 1 && page <= totalPages) {
      onJumpToPage(page);
    }
    setPageInput("");
  }

  return (
    <header className="toolbar">
      <span className="toolbar-title">{title}</span>
      <span className="toolbar-page">
        {currentPage} / {totalPages || "-"}
      </span>
      <form className="toolbar-jump" onSubmit={handleJumpSubmit}>
        <input
          type="number"
          min={1}
          max={totalPages || undefined}
          value={pageInput}
          placeholder="ページ"
          onChange={(e) => setPageInput(e.target.value)}
          aria-label="ページ番号を入力してジャンプ"
        />
        <button type="submit">移動</button>
      </form>
      <div className="toolbar-zoom">
        <button type="button" onClick={onZoomOut} aria-label="縮小">
          −
        </button>
        <button type="button" onClick={onZoomIn} aria-label="拡大">
          ＋
        </button>
      </div>
    </header>
  );
}
