# yomeru

## Story

本を読んでいて引っかかった箇所に印を付けると、その場で Claude に聞ける。

Core actions:
- 読んでいる箇所に線を引いてメモを書く — 日次
- 引っかかった箇所を Claude に渡して解説を受ける — 日次
- 読み終えた本の線とメモをまとめて取り出す — 月次

## ディレクトリ構造

```
yomeru/
├── mise.toml        ツールのバージョン
├── bunfig.toml      依存の exact ピンと cooldown
├── vite.config.ts   /api・/cmaps・/standard_fonts を server(:8787) へ proxy
├── tsconfig.json
├── index.html
├── scripts/
│   └── dev.ts       server と vite を同時に spawn する（追加依存なし）
├── server/          Bun.serve の API サーバー
│   ├── index.ts     ルーティング。単体で bun run server 起動できる
│   ├── config.ts    YOMERU_BOOK / YOMERU_NOTES の解決
│   ├── notes.ts     NDJSON の読み書き（tombstone 方式の削除を含む）
│   └── *.test.ts
├── src/             Vite + React のフロント
│   ├── main.tsx
│   ├── App.tsx
│   ├── pdfViewer.ts       pdfjs-dist/web/pdf_viewer.mjs の PDFViewer をラップ
│   ├── highlightLayer.ts  正規化座標のハイライトをページ上に描画
│   ├── selection.ts       テキスト選択→ページ番号・矩形の変換
│   ├── SelectionPopup.tsx / Sidebar.tsx / Toolbar.tsx
│   ├── api.ts / types.ts
│   └── styles.css
├── AGENTS.md
└── README.md
```

本のファイル（PDF / EPUB）と、そこから出たハイライト・メモは tracked なファイルに入れない。本は実行時にローカルの path を受けて読み、`books/` `*.pdf` `*.epub` は gitignore している。

## セットアップ

ツールは mise で管理している。

```bash
mise install   # mise.toml に従ってツールをインストール
bun install
bun dev
```

## 技術スタック

- Bun（ランタイム・パッケージマネージャ）
- Vite + React + TypeScript
- pdf.js（PDF の表示。スキャン PDF は画像の上に OCR の文字層を重ねる）
- [handoff](https://github.com/wwwyo/handoff) — v0 では使わない。ハイライトは NDJSON ファイルに追記し、Claude Code はそのファイルを読む。handoff はページ上に Claude の返信を出したくなったときに検討する

## 関連

- 受け手は wwwyo/me の `reading` skill。ハイライトとメモはページ番号つきで渡す
