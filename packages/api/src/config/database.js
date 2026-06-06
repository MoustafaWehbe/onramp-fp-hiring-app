"use strict";

require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../.env"),
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

const dbUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/starter_kit";

module.exports = {
  development: parseDbUrl(dbUrl),
  test: parseDbUrl(
    process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/starter_kit_test",
  ),
  production: parseDbUrl(process.env.DATABASE_URL || dbUrl),
};
