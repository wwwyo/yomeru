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
├── mise.toml      ツールのバージョン
├── bunfig.toml    依存の exact ピンと cooldown
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
- [handoff](https://github.com/wwwyo/handoff)（ページ上のコメントを実行中の Claude Code へ渡す overlay と bridge）

## 関連

- 受け手は wwwyo/me の `reading` skill。ハイライトとメモはページ番号つきで渡す
