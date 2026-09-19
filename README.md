# yomeru

本を読みながら線を引いてメモを書き、引っかかった箇所をそのまま Claude Code に渡せる reader。PDF（スキャンを含む）と DRM フリーの EPUB を対象にする。v0 は PDF のみ。

## Getting Started

前提: [mise](https://mise.jdx.dev/)

```bash
mise install
bun install
YOMERU_BOOK=/path/to/book.pdf bun dev
```

`bun dev` は server(:8787) と vite を同時に起動する。ブラウザは vite が開く URL(既定 http://localhost:5173)を開く。

- `YOMERU_BOOK`（必須）: 読む PDF の絶対パス
- `YOMERU_NOTES`（省略可）: ハイライト・メモを追記する NDJSON の出力先。省略時は `~/.cache/yomeru/<PDF のファイル名>/notes.ndjson`

## ハイライト・メモの NDJSON

1 行が 1 レコード。`kind` は `highlight`（ハイライト）か `question`（Claude に聞きたい箇所）。削除は行を消さず tombstone (`{"id":...,"deleted":true,"at":...}`) を追記する。

```json
{"id":"<uuid>","kind":"highlight","page":125,"quote":"選択した文字列","note":"自分のメモ（空文字可）","rects":[{"x":0.12,"y":0.34,"w":0.5,"h":0.02}],"createdAt":"2026-09-19T18:30:00+09:00"}
```

- `page`: PDF の 1 始まりのページ番号
- `rects`: そのページの表示領域に対する 0〜1 の正規化座標。複数行の選択は複数の rect になる

## スクリプト

```bash
bun run server     # server のみ起動
bun run build      # vite build
bun run typecheck  # tsc --noEmit
bun test           # server の API テスト
```
