import { getSequelize, initModels } from "@starter-kit/shared";
import type { Sequelize } from "sequelize";

let initialized = false;

/**
 * Open the Postgres connection and initialize the Sequelize models.
 * Idempotent: safe to call more than once. Tables come from migrations —
 * we never call sequelize.sync().
 */
export async function initializeDatabase(): Promise<Sequelize> {
  const sequelize = getSequelize();

  if (!initialized) {
    await sequelize.authenticate();
    initModels(sequelize);
    initialized = true;
  }

  return sequelize;
}

export function getDatabase(): Sequelize {
  return getSequelize();
}
