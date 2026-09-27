import type { Rect } from "./types";

export interface SelectionInfo {
  page: number;
  quote: string;
  rects: Rect[];
  /** ポップアップの吹き出し位置に使う、選択範囲の viewport 座標。 */
  anchorClientRect: DOMRect;
}

/**
 * 複数ページにまたがる選択は先頭ページ(選択開始位置のページ)の分だけを残す仕様のため、
 * clientRects は開始ページの矩形と交差するものだけに絞る。
 */
export function computeSelectionInfo(): SelectionInfo | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const quote = selection.toString().trim();
  if (!quote) return null;

  const range = selection.getRangeAt(0);
  const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
  const pageEl = (startNode as Element | null)?.closest<HTMLElement>(".page[data-page-number]");
  if (!pageEl) return null;

  const pageNumber = Number(pageEl.dataset.pageNumber);
  if (!Number.isInteger(pageNumber)) return null;

  const pageRect = pageEl.getBoundingClientRect();
  const rects: Rect[] = [];
  for (const clientRect of Array.from(range.getClientRects())) {
    if (clientRect.width === 0 || clientRect.height === 0) continue;
    if (clientRect.bottom <= pageRect.top || clientRect.top >= pageRect.bottom) continue; // 別ページの行
    rects.push({
      x: clamp01((clientRect.left - pageRect.left) / pageRect.width),
      y: clamp01((clientRect.top - pageRect.top) / pageRect.height),
      w: clamp01(clientRect.width / pageRect.width),
      h: clamp01(clientRect.height / pageRect.height),
    });
  }
  if (rects.length === 0) return null;

  const clientRects = Array.from(range.getClientRects());
  const anchorClientRect = clientRects[clientRects.length - 1] ?? range.getBoundingClientRect();

  return { page: pageNumber, quote, rects, anchorClientRect };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
