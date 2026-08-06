import { hashPassword, verifyPassword } from "../../../shared/auth/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../../../shared/auth/jwt";
import { AuthService } from "../../src/services/auth.service";

// ─── Password utilities ───────────────────────────────────────────────────────

describe("hashPassword / verifyPassword", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "MySecurePass1";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
    await expect(verifyPassword(password, hash)).resolves.toBe(true);
  });

  it("returns false for a wrong password", async () => {
    const hash = await hashPassword("correct-password");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("produces different hashes for the same password (salt uniqueness)", async () => {
    const password = "SamePassword1";
    const [hash1, hash2] = await Promise.all([
      hashPassword(password),
      hashPassword(password),
    ]);
    expect(hash1).not.toBe(hash2);
  });
});

// ─── JWT utilities ────────────────────────────────────────────────────────────

describe("signAccessToken / verifyAccessToken", () => {
  const payload = {
    userId: "user-uuid-123",
    email: "test@example.com",
    role: "CANDIDATE" as const,
    sessionId: "session-uuid-456",
  };

  it("signs and verifies a token successfully", () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it("throws when verifying a tampered token", () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("signRefreshToken", () => {
  it("mints a distinct token every time, even within the same second", () => {
    // refresh_tokens.token_hash is UNIQUE, so two identical tokens mean the
    // second session cannot be stored at all. Opening two sessions back to
    // back — a password login right after an OAuth callback, say — used to
    // produce byte-identical tokens because the payload was only {userId}.
    const tokens = new Set(
      Array.from({ length: 5 }, () => signRefreshToken({ userId: "user-1" })),
    );

    expect(tokens.size).toBe(5);
  });

  it("still verifies and still carries the user it was issued for", () => {
    const token = signRefreshToken({ userId: "user-1" });

    expect(verifyRefreshToken(token).userId).toBe("user-1");
  });
});

describe("AuthService.refresh", () => {
  it("turns an invalid refresh JWT into a 401 operational error", async () => {
    await expect(new AuthService().refresh("not-a-jwt")).rejects.toMatchObject({
      message: "Invalid refresh token",
      statusCode: 401,
      isOperational: true,
    });
  });
});
