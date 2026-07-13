import express from "express";
import request from "supertest";
import { createError, errorHandler } from "../../src/middleware/error-handler";

function appThatThrows() {
  const app = express();
  app.get("/boom", (_req, _res, next) => {
    next(new Error("boom"));
  });
  app.use(errorHandler);
  return app;
}

function appWithOperationalError() {
  const app = express();
  app.get("/expected", (_req, _res, next) => {
    next(createError("Expected failure", 401));
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
  });

  it("does not expose stack traces in production", async () => {
    process.env.NODE_ENV = "production";

    const res = await request(appThatThrows()).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(res.body).not.toHaveProperty("stack");
  });

  it("exposes stack traces in development", async () => {
    process.env.NODE_ENV = "development";

    const res = await request(appThatThrows()).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
    expect(res.body.stack).toContain("Error: boom");
  });

  it("does not expose stack traces for operational errors", async () => {
    process.env.NODE_ENV = "development";

    const res = await request(appWithOperationalError()).get("/expected");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Expected failure");
    expect(res.body).not.toHaveProperty("stack");
  });
});
