import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "./config";

describe("resolveConfig", () => {
  test("derives notesPath from the cache dir when YOMERU_NOTES is unset", async () => {
    const dir = await mkdtemp(join(tmpdir(), "yomeru-config-test-"));
    const bookPath = join(dir, "my-book.pdf");
    await writeFile(bookPath, "dummy");

    const config = resolveConfig({ YOMERU_BOOK: bookPath });
    expect(config.bookPath).toBe(bookPath);
    expect(config.notesPath).toMatch(/\.cache\/yomeru\/my-book\/notes\.ndjson$/);
  });

  test("throws when YOMERU_BOOK is unset", () => {
    expect(() => resolveConfig({})).toThrow(/YOMERU_BOOK/);
  });

  test("throws when YOMERU_BOOK points at a missing file", () => {
    expect(() => resolveConfig({ YOMERU_BOOK: "/no/such/file.pdf" })).toThrow(/見つかりません/);
  });
});

describe("server/index.ts as a CLI entry point", () => {
  test("exits 1 with a stderr message when YOMERU_BOOK is unset", async () => {
    const proc = Bun.spawn(["bun", "run", join(import.meta.dir, "index.ts")], {
      cwd: import.meta.dir,
      env: { ...process.env, YOMERU_BOOK: "" },
      stderr: "pipe",
      stdout: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/YOMERU_BOOK/);
  });
});
