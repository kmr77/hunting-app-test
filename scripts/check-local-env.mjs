import { accessSync, constants, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

function commandOutput(command, args = []) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function existsExecutable(path) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function firstExecutable(paths) {
  return paths.find((path) => existsExecutable(path)) ?? "";
}

const postgresBinary =
  commandOutput("which", ["postgres"]) ||
  firstExecutable([
    "/opt/homebrew/opt/postgresql@16/bin/postgres",
    "/opt/homebrew/bin/postgres",
    "/usr/local/opt/postgresql@16/bin/postgres",
    "/usr/local/bin/postgres",
  ]);

const psqlBinary = firstExecutable([
  "/opt/homebrew/opt/postgresql@16/bin/psql",
  "/opt/homebrew/bin/psql",
  "/usr/local/opt/libpq/bin/psql",
  "/usr/local/bin/psql",
]);

const checks = [
  {
    label: "Node",
    ok: Number(process.versions.node.split(".")[0]) >= 20,
    value: process.versions.node,
  },
  {
    label: "Apple Silicon Homebrew",
    ok: existsExecutable("/opt/homebrew/bin/brew"),
    value: existsSync("/opt/homebrew/bin/brew") ? "/opt/homebrew/bin/brew" : "not found",
  },
  {
    label: "Legacy Homebrew",
    ok: existsExecutable("/usr/local/bin/brew"),
    value: existsSync("/usr/local/bin/brew") ? "/usr/local/bin/brew" : "not found",
  },
  {
    label: "PostgreSQL server binary",
    ok: Boolean(postgresBinary),
    value: postgresBinary || "not found",
  },
  {
    label: "PostgreSQL client tools",
    ok: Boolean(psqlBinary),
    value: psqlBinary || "not found",
  },
  {
    label: "DATABASE_URL",
    ok: Boolean(process.env.DATABASE_URL),
    value: process.env.DATABASE_URL ? "configured" : "not configured",
  },
];

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "NG"} ${check.label}: ${check.value}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}
