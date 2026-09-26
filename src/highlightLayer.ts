import type { NoteRecord } from "./types";

const OVERLAY_CLASS = "yomeru-highlight-layer";

const HIGHLIGHT_COLOR: Record<NoteRecord["kind"], string> = {
  highlight: "rgba(255, 196, 0, 0.32)",
  question: "rgba(66, 153, 225, 0.30)",
};

/**
 * ページ要素の上に正規化座標(0〜1)から矩形を描き直す。
 * .page は pdf_viewer.css で position:relative なので、子要素を絶対配置の % で置けば
 * 拡大縮小・再描画のたびに呼んでも同じ相対位置に収まる（呼び出し側は等冪性を気にしなくてよい）。
 */
export function renderHighlightsForPage(container: HTMLElement, pageNumber: number, notes: NoteRecord[]): void {
  const pageEl = container.querySelector<HTMLElement>(`.page[data-page-number="${pageNumber}"]`);
  if (!pageEl) return;

  let layer = pageEl.querySelector<HTMLElement>(`:scope > .${OVERLAY_CLASS}`);
  if (!layer) {
    layer = document.createElement("div");
    layer.className = OVERLAY_CLASS;
    pageEl.appendChild(layer);
  }
  layer.replaceChildren();

  for (const note of notes) {
    if (note.page !== pageNumber) continue;
    for (const rect of note.rects) {
      const rectEl = document.createElement("div");
      rectEl.className = "yomeru-highlight-rect";
      rectEl.style.left = `${rect.x * 100}%`;
      rectEl.style.top = `${rect.y * 100}%`;
      rectEl.style.width = `${rect.w * 100}%`;
      rectEl.style.height = `${rect.h * 100}%`;
      rectEl.style.background = HIGHLIGHT_COLOR[note.kind];
      rectEl.title = note.note || note.quote;
      layer.appendChild(rectEl);
    }
  }
}
