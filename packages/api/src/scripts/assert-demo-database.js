"use strict";

const { isIP } = require("node:net");
const databaseConfig = require("../config/database");

function resolveDemoDatabaseTarget() {
  const environment = process.env.NODE_ENV || "development";
  const config = databaseConfig[environment];

  if (!config) {
    throw new Error(`No database config for NODE_ENV=${environment}`);
  }

  return { environment, config };
}

function normalizeHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
}

function isLoopbackHost(host) {
  const normalized = normalizeHost(host);
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    (isIP(normalized) === 4 && normalized.startsWith("127."))
  );
}

function describeTarget(config) {
  const host = normalizeHost(config.host) || "<missing-host>";
  const port = config.port || 5432;
  const database = config.database || "<missing-database>";
  return `${host}:${port}/${database}`;
}

function assertDemoDatabaseTarget(target = resolveDemoDatabaseTarget()) {
  const { environment, config } = target;
  const description = describeTarget(config);
  const overrideAllowed = process.env.ALLOW_DEMO_SEED === "1";
  const restrictedReasons = [];

  if (environment === "production") {
    restrictedReasons.push("NODE_ENV is production");
  }
  if (!isLoopbackHost(config.host)) {
    restrictedReasons.push("database host is not loopback");
  }

  if (restrictedReasons.length > 0 && !overrideAllowed) {
    throw new Error(
      `Refusing to reset demo data at ${description}: ${restrictedReasons.join(
        "; ",
      )}. Set ALLOW_DEMO_SEED=1 only after verifying this destructive target.`,
    );
  }

  if (restrictedReasons.length > 0) {
    console.warn(
      `Demo database safety override accepted for ${description} (${restrictedReasons.join(
        "; ",
      )}).`,
    );
  } else {
    console.info(`Demo database target approved: ${description}`);
  }

  return target;
}

if (require.main === module) {
  try {
    assertDemoDatabaseTarget();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  assertDemoDatabaseTarget,
  describeTarget,
  isLoopbackHost,
  resolveDemoDatabaseTarget,
};
