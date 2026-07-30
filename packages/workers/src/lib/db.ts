import {
  getSequelize,
  initModels,
} from "@starter-kit/shared/db";

let initialized = false;

export async function initializeDatabase(): Promise<void> {
  const sequelize = getSequelize();

  if (!initialized) {
    await sequelize.authenticate();
    initModels(sequelize);
    initialized = true;
  }
}

export async function closeDatabase(): Promise<void> {
  if (!initialized) {
    return;
  }

  await getSequelize().close();
  initialized = false;
}
