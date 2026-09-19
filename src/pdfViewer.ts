import * as pdfjsLib from "pdfjs-dist";
import { EventBus, PDFLinkService, PDFViewer } from "pdfjs-dist/web/pdf_viewer.mjs";
// pdf.js は本体とワーカーのバージョン不一致を例外にするため、
// 同一パッケージの worker ビルドを ?url 経由でバンドルさせる（別途 CDN から取得しない）。
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export interface PdfViewerHandle {
  eventBus: EventBus;
  viewer: PDFViewer;
  load(url: string): Promise<void>;
  destroy(): void;
}

export function createPdfViewer(container: HTMLDivElement, viewerEl: HTMLDivElement): PdfViewerHandle {
  const eventBus = new EventBus();
  const linkService = new PDFLinkService({ eventBus });
  const viewer = new PDFViewer({
    container,
    viewer: viewerEl,
    eventBus,
    linkService,
    textLayerMode: 2,
  });
  linkService.setViewer(viewer);

  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

  async function load(url: string): Promise<void> {
    // OCR 文字層が 90ms-RKSJ-H の非埋め込み CID フォントを使っているため、
    // cMap/標準フォントを渡さないと選択文字列が文字化けするか空になる。
    loadingTask = pdfjsLib.getDocument({
      url,
      cMapUrl: "/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/standard_fonts/",
    });
    const pdfDocument = await loadingTask.promise;
    viewer.setDocument(pdfDocument);
    linkService.setDocument(pdfDocument, null);
  }

  function destroy(): void {
    loadingTask?.destroy();
  }

  return { eventBus, viewer, load, destroy };
}
