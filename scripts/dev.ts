/**
 * server(Bun.serve, :8787) と vite(フロント) を同時に起動する。
 * 追加の依存(concurrently 等)を入れないため Bun.spawn を直接使う。
 */
// `bun run dev -- --port 5390 --strictPort` のように付けた追加引数はそのまま vite に渡す
// (5173 を他 PJ が使っているなど、preview 用にポートを固定したい場面があるため)。
const forwardedArgs = process.argv.slice(2);

const server = Bun.spawn(["bun", "run", "server/index.ts"], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const vite = Bun.spawn(["bun", "x", "vite", ...forwardedArgs], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  server.kill();
  vite.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// どちらかが先に落ちたら(設定エラー等)もう一方を道連れにして dev を終える。
const firstExit = await Promise.race([server.exited, vite.exited]);
shutdown();
await Promise.all([server.exited, vite.exited]);
process.exit(firstExit);
