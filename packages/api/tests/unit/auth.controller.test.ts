import request from "supertest";
import { app } from "../../app";

// Mock the DB so we don't need a real database in unit tests
jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  },
}));

import { authService } from "../../src/services/auth.service";
import { signAccessToken } from "@starter-kit/shared/auth";
import jwt from "jsonwebtoken";
const mockAuthService = authService as jest.Mocked<typeof authService>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("returns 201 with user data on success", async () => {
    mockAuthService.register.mockResolvedValue({
      id: "uuid-1",
      email: "alice@example.com",
      name: "Alice",
      role: "CANDIDATE",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("alice@example.com");
  });

  it("returns 422 when email is invalid", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "SecurePass1",
      name: "Alice",
    });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe("email");
  });

  it("returns 422 when password is too weak", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "alice@example.com",
      password: "short",
      name: "Alice",
    });

    expect(res.status).toBe(422);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  it("returns 200, sets httpOnly cookies, and returns only the user", async () => {
    mockAuthService.login.mockResolvedValue({
      user: {
        id: "uuid-1",
        email: "alice@example.com",
        name: "Alice",
        role: "CANDIDATE",
      },
      accessToken: "access.token.here",
      refreshToken: "refresh.token.here",
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@example.com", password: "SecurePass1" });

    expect(res.status).toBe(200);

    // The controller sets tokens as httpOnly cookies and returns only the user;
    // tokens must NOT appear in the JSON body.
    expect(res.body.data.user.email).toBe("alice@example.com");
    expect(res.body.data).not.toHaveProperty("accessToken");
    expect(res.body.data).not.toHaveProperty("refreshToken");

    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
    expect(cookies.every((c) => c.includes("HttpOnly"))).toBe(true);
  });

  it("returns 422 when body is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe("GET /api/auth/me", () => {
  it("returns a clean 401 (not 500) when no auth cookie is present", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
    expect(res.body).not.toHaveProperty("stack");
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid access token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", ["accessToken=not-a-jwt"]);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();
  });

  it("returns 401 when the access token payload does not include userId", async () => {
    const token = jwt.sign(
      {
        id: "uuid-1",
        email: "alice@example.com",
        role: "CANDIDATE",
        sessionId: "session-1",
      },
      process.env.JWT_SECRET ?? "test-jwt-secret",
    );

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`accessToken=${token}`]);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid or expired token");
    expect(mockAuthService.getProfile).not.toHaveBeenCalled();
  });

  it("returns the profile when a valid access token cookie is sent", async () => {
    mockAuthService.getProfile.mockResolvedValue({
      id: "uuid-1",
      email: "alice@example.com",
      name: "Alice",
      role: "CANDIDATE",
    });

    const token = signAccessToken({
      userId: "uuid-1",
      email: "alice@example.com",
      role: "CANDIDATE",
      sessionId: "session-1",
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [`accessToken=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("alice@example.com");
    expect(res.body.data).not.toHaveProperty("passwordHash");
    expect(mockAuthService.getProfile).toHaveBeenCalledWith("uuid-1");
  });
});

// --- POST /api/auth/refresh ---------------------------------------------------

describe("POST /api/auth/refresh", () => {
  it("returns a clean 401 when no refresh cookie is present", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing refresh token");
    expect(res.body).not.toHaveProperty("stack");
    expect(mockAuthService.refresh).not.toHaveBeenCalled();
  });

  it("returns a clean 401 when the refresh token is invalid", async () => {
    const error = Object.assign(new Error("Invalid refresh token"), {
      statusCode: 401,
      isOperational: true,
    });
    mockAuthService.refresh.mockRejectedValue(error);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", ["refreshToken=not-a-refresh-token"]);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
    expect(res.body).not.toHaveProperty("stack");
  });
});

// --- POST /api/auth/logout ----------------------------------------------------

describe("POST /api/auth/logout", () => {
  it("returns a clean 401 when unauthenticated", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
    expect(mockAuthService.logout).not.toHaveBeenCalled();
  });
});
