import { useEffect, useRef, useState } from "react";
import { createNote, deleteNote, fetchBookMeta, fetchNotes } from "./api";
import type { BookMeta } from "./api";
import { renderHighlightsForPage } from "./highlightLayer";
import { createPdfViewer, type PdfViewerHandle } from "./pdfViewer";
import { computeSelectionInfo, type SelectionInfo } from "./selection";
import { SelectionPopup } from "./SelectionPopup";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import type { NoteKind, NoteRecord } from "./types";

interface PageChangingEvent {
  pageNumber: number;
}

interface PageRenderedEvent {
  pageNumber: number;
}

function lastPageKey(title: string): string {
  return `yomeru:last-page:${title}`;
}

export function App() {
  const [bookMeta, setBookMeta] = useState<BookMeta | null>(null);
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<SelectionInfo | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const viewerElRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pdfHandleRef = useRef<PdfViewerHandle | null>(null);

  // イベントリスナーは初期化時に 1 度だけ張るため、都度最新値を読める ref 経由で state を参照する。
  const notesRef = useRef<NoteRecord[]>([]);
  const pendingSelectionRef = useRef<SelectionInfo | null>(null);
  const noteDraftRef = useRef("");
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  useEffect(() => {
    pendingSelectionRef.current = pendingSelection;
  }, [pendingSelection]);
  useEffect(() => {
    noteDraftRef.current = noteDraft;
  }, [noteDraft]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meta, initialNotes] = await Promise.all([fetchBookMeta(), fetchNotes()]);
        if (cancelled) return;
        setBookMeta(meta);
        setNotes(initialNotes);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bookMeta || !containerRef.current || !viewerElRef.current) return;

    const handle = createPdfViewer(containerRef.current, viewerElRef.current);
    pdfHandleRef.current = handle;
    const container = containerRef.current;

    const onPagesInit = () => {
      setTotalPages(handle.viewer.pagesCount);
      const savedPage = Number(localStorage.getItem(lastPageKey(bookMeta.title)));
      if (Number.isInteger(savedPage) && savedPage >= 1 && savedPage <= handle.viewer.pagesCount) {
        handle.viewer.currentScaleValue = "page-width";
        handle.viewer.currentPageNumber = savedPage;
      } else {
        handle.viewer.currentScaleValue = "page-width";
      }
    };
    const onPageChanging = (evt: PageChangingEvent) => {
      setCurrentPage(evt.pageNumber);
      try {
        localStorage.setItem(lastPageKey(bookMeta.title), String(evt.pageNumber));
      } catch {
        // private mode 等で書けない場合は「前回のページから開く」を諦めるだけで致命的ではない
      }
    };
    const onPageRendered = (evt: PageRenderedEvent) => {
      renderHighlightsForPage(container, evt.pageNumber, notesRef.current);
    };

    handle.eventBus.on("pagesinit", onPagesInit);
    handle.eventBus.on("pagechanging", onPageChanging);
    handle.eventBus.on("pagerendered", onPageRendered);

    handle.load("/api/book").catch((err) => setError(err instanceof Error ? err.message : String(err)));

    return () => {
      handle.eventBus.off("pagesinit", onPagesInit);
      handle.eventBus.off("pagechanging", onPageChanging);
      handle.eventBus.off("pagerendered", onPageRendered);
      handle.destroy();
      pdfHandleRef.current = null;
    };
  }, [bookMeta]);

  useEffect(() => {
    function handleMouseUp(e: MouseEvent) {
      if (popupRef.current?.contains(e.target as Node)) return;
      setPendingSelection(computeSelectionInfo());
    }
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!pendingSelectionRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "h") {
        e.preventDefault();
        void handleSave("highlight");
      } else if (e.key === "q") {
        e.preventDefault();
        void handleSave("question");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSave(kind: NoteKind) {
    const info = pendingSelectionRef.current;
    if (!info) return;
    try {
      const created = await createNote({
        kind,
        page: info.page,
        quote: info.quote,
        note: noteDraftRef.current,
        rects: info.rects,
      });
      const nextNotes = [...notesRef.current, created];
      setNotes(nextNotes);
      setPendingSelection(null);
      setNoteDraft("");
      window.getSelection()?.removeAllRanges();
      if (containerRef.current) {
        renderHighlightsForPage(containerRef.current, created.page, nextNotes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDeleteNote(id: string) {
    const note = notesRef.current.find((n) => n.id === id);
    try {
      await deleteNote(id);
      const remaining = notesRef.current.filter((n) => n.id !== id);
      setNotes(remaining);
      if (note && containerRef.current) {
        renderHighlightsForPage(containerRef.current, note.page, remaining);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function handleSelectNote(note: NoteRecord) {
    const handle = pdfHandleRef.current;
    if (!handle) return;
    handle.viewer.currentPageNumber = note.page;
  }

  function handleJumpToPage(page: number) {
    const handle = pdfHandleRef.current;
    if (!handle) return;
    handle.viewer.currentPageNumber = page;
  }

  return (
    <div className="app">
      <Toolbar
        title={bookMeta?.title ?? ""}
        currentPage={currentPage}
        totalPages={totalPages}
        onJumpToPage={handleJumpToPage}
        onZoomIn={() => pdfHandleRef.current?.viewer.increaseScale()}
        onZoomOut={() => pdfHandleRef.current?.viewer.decreaseScale()}
      />
      <div className="app-body">
        <div className="pdf-outer">
          <div className="pdf-container" ref={containerRef}>
            <div className="pdfViewer" ref={viewerElRef} />
          </div>
        </div>
        <Sidebar notes={notes} onSelectNote={handleSelectNote} onDeleteNote={handleDeleteNote} />
      </div>
      {pendingSelection && (
        <SelectionPopup
          ref={popupRef}
          selection={pendingSelection}
          noteDraft={noteDraft}
          onNoteDraftChange={setNoteDraft}
          onHighlight={() => void handleSave("highlight")}
          onQuestion={() => void handleSave("question")}
        />
      )}
      {error && (
        <div className="app-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
