import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getDatabaseEnv } from "@/lib/env";
import * as schema from "@/db/schema";

const databaseUrl = getDatabaseEnv().DATABASE_URL;

const globalForDatabase = globalThis as typeof globalThis & {
  __quizcraftSql?: ReturnType<typeof postgres>;
};

function getSqlOptions(overrides: Parameters<typeof postgres>[1] = {}) {
  return {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ...overrides,
  };
}

export function createDatabaseSqlClient(
  overrides?: Parameters<typeof postgres>[1],
) {
  return postgres(databaseUrl, getSqlOptions(overrides));
}

const sql =
  globalForDatabase.__quizcraftSql ??
  createDatabaseSqlClient();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.__quizcraftSql = sql;
}

export const db = drizzle(sql, {
  schema,
  casing: "snake_case",
});

export { sql };
