"use strict";

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});

const url = require("url");

function parseDbUrl(dbUrl) {
  const parsed = new url.URL(dbUrl);
  return {
    username: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
    host: parsed.hostname,
    port: parseInt(parsed.port || "5432", 10),
    dialect: "postgres",
    migrationStorage: "sequelize",
    seederStorage: "sequelize",
  };
}

const developmentDbUrl =
  process.env.DEMO_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/starter_kit";
const testDbUrl =
  process.env.DEMO_DATABASE_URL ||
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/starter_kit_test";

module.exports = {
  development: parseDbUrl(developmentDbUrl),
  test: parseDbUrl(testDbUrl),
  production: parseDbUrl(
    process.env.DEMO_DATABASE_URL ||
      process.env.DATABASE_URL ||
      developmentDbUrl,
  ),
};
