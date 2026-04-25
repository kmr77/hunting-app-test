import { writeFileSync } from "node:fs";
import process from "node:process";
import { startPrismaDevServer } from "@prisma/dev";

const server = await startPrismaDevServer({
  name: "hunting-app-test",
  persistenceMode: "stateful",
});

const info = {
  name: server.name,
  database: server.database,
  shadowDatabase: server.shadowDatabase,
  http: server.http,
  ppg: server.ppg,
  experimental: server.experimental.streams,
};

const envValue = `DATABASE_URL="${server.ppg.url}"\nDIRECT_DATABASE_URL="${server.database.connectionString}"\n`;

writeFileSync(".prisma-dev-server.json", JSON.stringify(info, null, 2));
writeFileSync(".env", envValue);

console.log("Prisma local dev server started.");
console.log(envValue.trim());
console.log(JSON.stringify(info, null, 2));

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down Prisma local dev server...`);
  try {
    await server.close();
  } catch (error) {
    console.warn("Prisma local dev server closed with warnings.", error);
  }
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

setInterval(() => {}, 1 << 30);
