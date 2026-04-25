import net from "node:net";
import process from "node:process";

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const host = url.hostname || "localhost";
const port = Number(url.port || 5432);

const socket = net.createConnection({ host, port });
const timeout = setTimeout(() => {
  socket.destroy();
  console.error(`PostgreSQL is not reachable at ${host}:${port}.`);
  process.exit(1);
}, 3000);

socket.once("connect", () => {
  clearTimeout(timeout);
  socket.end();
  console.log(`PostgreSQL is reachable at ${host}:${port}.`);
});

socket.once("error", (error) => {
  clearTimeout(timeout);
  console.error(`PostgreSQL is not reachable at ${host}:${port}.`);
  console.error(error.message);
  process.exit(1);
});
