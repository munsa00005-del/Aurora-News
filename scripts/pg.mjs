// Userspace PostgreSQL controller using embedded-postgres.
// No sudo / Docker required — downloads a portable Postgres binary on first run
// and stores the data cluster under ./.pgdata.
//
// Usage:
//   node scripts/pg.mjs start   # start (idempotent), prints DATABASE_URL
//   node scripts/pg.mjs stop    # stop the server
//   node scripts/pg.mjs status  # check if reachable
//
// The dev/start npm scripts call `start` automatically.

import EmbeddedPostgres from "embedded-postgres";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import net from "node:net";
import fs from "node:fs";
import "./env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(ROOT, ".pgdata");

const PORT = Number(process.env.PG_PORT || 5433);
const USER = process.env.PG_USER || "orbitnews";
const PASSWORD = process.env.PG_PASSWORD || "orbitnews";
const DB_NAME = process.env.PG_DB || "orbitnews";

export const DATABASE_URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`;

function portOpen(port, host = "127.0.0.1", timeout = 800) {
  return new Promise((res) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      socket.destroy();
      res(v);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function createInstance() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: USER,
    password: PASSWORD,
    port: PORT,
    persistent: true,
  });
  return pg;
}

async function start() {
  // Already running?
  if (await portOpen(PORT)) {
    console.error(`[pg] already running on :${PORT}`);
    console.log(DATABASE_URL);
    return;
  }

  const pg = await createInstance();
  const initialized = fs.existsSync(resolve(DATA_DIR, "PG_VERSION"));

  if (!initialized) {
    console.error("[pg] initializing cluster (first run, downloads binary)…");
    await pg.initialise();
  }

  await pg.start();
  console.error(`[pg] started on :${PORT}`);

  if (!initialized) {
    try {
      await pg.createDatabase(DB_NAME);
      console.error(`[pg] created database ${DB_NAME}`);
    } catch (e) {
      console.error(`[pg] createDatabase: ${e.message}`);
    }
  }
  console.log(DATABASE_URL);
}

async function stop() {
  const pg = await createInstance();
  try {
    await pg.stop();
    console.error("[pg] stopped");
  } catch (e) {
    console.error(`[pg] stop: ${e.message}`);
  }
}

async function status() {
  const open = await portOpen(PORT);
  console.error(`[pg] ${open ? "running" : "not running"} on :${PORT}`);
  process.exit(open ? 0 : 1);
}

const cmd = process.argv[2] || "start";
if (cmd === "start") await start();
else if (cmd === "stop") await stop();
else if (cmd === "status") await status();
else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
