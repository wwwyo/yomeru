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
  // PDFViewer のコンストラクタは container に ResizeObserver を張り、container 自体に
  // (removeEventListener ではなく) `signal` 付き scroll listener を付ける。abortSignal を渡さないと
  // 呼び出し側で破棄したつもりの PDFViewer インスタンスがこの 2 つを通じて container に residual に
  // 居座り、後から作った 2 個目の PDFViewer と同じ container を取り合う。
  // PDFViewerOptions の型定義(6.3.289 時点)には abortSignal が無いが、ソース(pdf_viewer.mjs)は
  // options.abortSignal を読んでいるため、型だけキャストして実装側の契約に合わせる。
  const abortController = new AbortController();
  const viewer = new PDFViewer({
    container,
    viewer: viewerEl,
    eventBus,
    linkService,
    textLayerMode: 2,
    abortSignal: abortController.signal,
  } as ConstructorParameters<typeof PDFViewer>[0] & { abortSignal: AbortSignal });
  linkService.setViewer(viewer);

  let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
  let destroyed = false;

  async function load(url: string): Promise<void> {
    // OCR 文字層が 90ms-RKSJ-H の非埋め込み CID フォントを使っているため、
    // cMap/標準フォントを渡さないと選択文字列が文字化けするか空になる。
    // 本文ページ自体はスキャン画像(JBIG2/OpenJPEG)なので、wasmUrl が無いとデコードに失敗して
    // キャンバスが白紙のまま止まる(エラーにはならず warning で握りつぶされるので気づきにくい)。
    loadingTask = pdfjsLib.getDocument({
      url,
      cMapUrl: "/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/standard_fonts/",
      wasmUrl: "/wasm/",
    });
    const task = loadingTask;
    let pdfDocument: Awaited<typeof task.promise>;
    try {
      pdfDocument = await task.promise;
    } catch (err) {
      // destroy() が先に task.destroy() を呼んでいれば、この reject は意図した中断であって
      // 呼び出し元に見せるべきエラーではない。
      if (destroyed) return;
      throw err;
    }
    // React StrictMode の二重 effect で load() の途中に destroy() が先に走った場合、
    // 解決済みの pdfDocument を破棄済みの viewer に setDocument してしまうと container に
    // ページ DOM が復活する。PDFDocumentProxy 自体は destroy() を持たないため、
    // loadingTask 側を破棄してドキュメントごと片付ける。
    if (destroyed) {
      if (!task.destroyed) await task.destroy();
      return;
    }
    viewer.setDocument(pdfDocument);
    linkService.setDocument(pdfDocument, null);
  }

  function destroy(): void {
    destroyed = true;
    loadingTask?.destroy();
    // setDocument(pdfDocument) 済みなら viewer.textContent="" でページ DOM を外し、
    // findController 等の内部状態もリセットする。型定義は non-null を要求するが、
    // ソース側は `if (!pdfDocument) return;` で null を明示的に許容している。
    viewer.setDocument(null as unknown as Parameters<typeof viewer.setDocument>[0]);
    abortController.abort();
  }

  return { eventBus, viewer, load, destroy };
}
