import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { homedir } from "node:os";

export interface ServerConfig {
  bookPath: string;
  notesPath: string;
}

/**
 * YOMERU_BOOK / YOMERU_NOTES から起動設定を組み立てる。
 * env を引数で受けるのは、process.env をテストから汚さずに欠落系のケースを検証するため。
 */
export function resolveConfig(env: Record<string, string | undefined>): ServerConfig {
  const bookPath = env.YOMERU_BOOK;
  if (!bookPath) {
    throw new ConfigError(
      "YOMERU_BOOK が未設定です。読む PDF の絶対パスを指定してください。\n例: YOMERU_BOOK=/path/to/book.pdf bun run server",
    );
  }
  if (!existsSync(bookPath)) {
    throw new ConfigError(`YOMERU_BOOK で指定されたファイルが見つかりません: ${bookPath}`);
  }

  const stem = basename(bookPath).replace(/\.[^./]+$/, "");
  const notesPath = env.YOMERU_NOTES || join(homedir(), ".cache", "yomeru", stem, "notes.ndjson");

  return { bookPath, notesPath };
}

export class ConfigError extends Error {}

/** CLI エントリポイントから呼ぶ。標準エラーに理由を出して exit 1 する。 */
export function loadConfigOrExit(env: Record<string, string | undefined>): ServerConfig {
  try {
    return resolveConfig(env);
  } catch (err) {
    const message = err instanceof ConfigError ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}
