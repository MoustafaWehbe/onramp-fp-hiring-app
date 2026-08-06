import { signOAuthState } from "@starter-kit/shared/auth";

jest.mock("@starter-kit/shared/db", () => ({
  getSequelize: jest.fn(),
  User: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  OAuthIdentity: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  OAUTH_PROVIDERS: ["google", "github"],
}));

import { getSequelize, OAuthIdentity, User } from "@starter-kit/shared/db";
import {
  OAuthFlowError,
  OAuthService,
  redirectUriFor,
} from "../../src/services/oauth.service";
import type { OAuthProfile } from "../../src/lib/oauth/providers";

const mockUser = User as unknown as {
  findByPk: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
};
const mockIdentity = OAuthIdentity as unknown as {
  findOne: jest.Mock;
  create: jest.Mock;
};
const mockGetSequelize = getSequelize as jest.Mock;

const service = new OAuthService();

const googleProfile: OAuthProfile = {
  providerUserId: "google-sub-123",
  email: "New.Person@example.com",
  emailVerified: true,
  name: "New Person",
};

beforeEach(() => {
  jest.clearAllMocks();

  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;

  // Run transaction callbacks inline; these tests are about the branching,
  // not about Sequelize's transaction plumbing.
  mockGetSequelize.mockReturnValue({
    transaction: (callback: (t: unknown) => unknown) => callback({}),
  });
});

// ─── Authorization request ────────────────────────────────────────────────────

describe("OAuthService.buildAuthorizationRequest", () => {
  it("builds a Google consent URL carrying the client id, redirect and state", () => {
    const { url, nonce, stateToken } = service.buildAuthorizationRequest({
      provider: "google",
      role: "RECRUITER",
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(parsed.searchParams.get("client_id")).toBe("test-google-client-id");
    expect(parsed.searchParams.get("response_type")).toBe("code");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      redirectUriFor("google"),
    );
    expect(parsed.searchParams.get("state")).toBe(nonce);
    expect(parsed.searchParams.get("scope")).toContain("email");
    expect(stateToken).toEqual(expect.any(String));
  });

  it("refuses to start a flow for a provider with no credentials", () => {
    expect(() =>
      service.buildAuthorizationRequest({ provider: "github" }),
    ).toThrow(
      expect.objectContaining({ code: "provider_not_configured" }),
    );
  });
});

// ─── State round-trip (CSRF) ──────────────────────────────────────────────────

describe("OAuthService.verifyState", () => {
  it("returns the intent stashed in a matching state", () => {
    const stateCookie = signOAuthState({
      nonce: "nonce-1",
      provider: "google",
      role: "RECRUITER",
      returnTo: "/recruiter/jobs",
    });

    expect(
      service.verifyState({
        provider: "google",
        stateCookie,
        stateParam: "nonce-1",
      }),
    ).toEqual({ role: "RECRUITER", returnTo: "/recruiter/jobs" });
  });

  it("rejects a callback whose nonce does not match the cookie", () => {
    const stateCookie = signOAuthState({
      nonce: "nonce-1",
      provider: "google",
    });

    expect(() =>
      service.verifyState({
        provider: "google",
        stateCookie,
        stateParam: "nonce-2",
      }),
    ).toThrow(expect.objectContaining({ code: "invalid_state" }));
  });

  it("rejects a state issued for a different provider", () => {
    const stateCookie = signOAuthState({
      nonce: "nonce-1",
      provider: "github",
    });

    expect(() =>
      service.verifyState({
        provider: "google",
        stateCookie,
        stateParam: "nonce-1",
      }),
    ).toThrow(expect.objectContaining({ code: "invalid_state" }));
  });

  it("rejects a tampered state cookie", () => {
    const stateCookie = `${signOAuthState({
      nonce: "nonce-1",
      provider: "google",
    }).slice(0, -5)}XXXXX`;

    expect(() =>
      service.verifyState({
        provider: "google",
        stateCookie,
        stateParam: "nonce-1",
      }),
    ).toThrow(expect.objectContaining({ code: "invalid_state" }));
  });

  it("rejects a callback that arrives with no state at all", () => {
    expect(() =>
      service.verifyState({ provider: "google", stateParam: "nonce-1" }),
    ).toThrow(expect.objectContaining({ code: "invalid_state" }));
  });
});

// ─── Identity resolution ──────────────────────────────────────────────────────

describe("OAuthService.resolveUser", () => {
  it("logs in the linked user when the provider account is already known", async () => {
    const existing = { id: "user-1", email: "known@example.com" };
    mockIdentity.findOne.mockResolvedValue({
      userId: "user-1",
      provider: "google",
    });
    mockUser.findByPk.mockResolvedValue(existing);

    const result = await service.resolveUser("google", googleProfile);

    expect(result).toEqual({ user: existing, isNewUser: false });
    expect(mockUser.create).not.toHaveBeenCalled();
    // A known identity short-circuits: no email lookup, so no chance of the
    // collision branch touching a returning user.
    expect(mockUser.findOne).not.toHaveBeenCalled();
  });

  it("refuses to link silently when the email already has a password account", async () => {
    mockIdentity.findOne.mockResolvedValue(null);
    mockUser.findOne.mockResolvedValue({
      id: "user-2",
      email: "new.person@example.com",
    });

    await expect(service.resolveUser("google", googleProfile)).rejects.toThrow(
      expect.objectContaining({ code: "email_exists" }),
    );

    expect(mockUser.create).not.toHaveBeenCalled();
    expect(mockIdentity.create).not.toHaveBeenCalled();
  });

  it("creates the user and the identity row for a brand-new account", async () => {
    mockIdentity.findOne.mockResolvedValue(null);
    mockUser.findOne.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({ id: "user-3" });
    mockIdentity.create.mockResolvedValue({ id: "identity-3" });

    const result = await service.resolveUser("google", googleProfile);

    expect(result.isNewUser).toBe(true);

    const [userAttrs] = mockUser.create.mock.calls[0];
    expect(userAttrs).toMatchObject({
      email: "new.person@example.com",
      name: "New Person",
      roleSelectionPending: true,
    });
    // No usable password: the hash is of a random secret thrown away on
    // creation, so the password form can never match this account.
    expect(userAttrs.passwordHash).toEqual(expect.any(String));
    expect(userAttrs.passwordHash).not.toContain("new.person");

    const [identityAttrs] = mockIdentity.create.mock.calls[0];
    expect(identityAttrs).toMatchObject({
      userId: "user-3",
      provider: "google",
      providerUserId: "google-sub-123",
    });
  });

  it("will not create an account on an address the provider has not verified", async () => {
    mockIdentity.findOne.mockResolvedValue(null);

    await expect(
      service.resolveUser("google", { ...googleProfile, emailVerified: false }),
    ).rejects.toThrow(expect.objectContaining({ code: "email_unverified" }));

    expect(mockUser.create).not.toHaveBeenCalled();
  });

  it("reports a provider that returned no email instead of inventing one", async () => {
    mockIdentity.findOne.mockResolvedValue(null);

    await expect(
      service.resolveUser("github", { ...googleProfile, email: null }),
    ).rejects.toThrow(expect.objectContaining({ code: "email_missing" }));
  });

  it("treats an identity whose user has vanished as unlinked", async () => {
    const destroy = jest.fn();
    mockIdentity.findOne.mockResolvedValue({ userId: "gone", destroy });
    mockUser.findByPk.mockResolvedValue(null);
    mockUser.findOne.mockResolvedValue(null);
    mockUser.create.mockResolvedValue({ id: "user-4" });
    mockIdentity.create.mockResolvedValue({ id: "identity-4" });

    const result = await service.resolveUser("google", googleProfile);

    expect(destroy).toHaveBeenCalled();
    expect(result.isNewUser).toBe(true);
  });
});

// ─── Callback orchestration ───────────────────────────────────────────────────

describe("OAuthService.completeCallback", () => {
  it("maps a denied consent to access_denied without touching the database", async () => {
    await expect(
      service.completeCallback({ provider: "google", error: "access_denied" }),
    ).rejects.toThrow(expect.objectContaining({ code: "access_denied" }));

    expect(mockIdentity.findOne).not.toHaveBeenCalled();
  });

  it("maps any other provider-reported error to provider_error", async () => {
    await expect(
      service.completeCallback({ provider: "google", error: "server_error" }),
    ).rejects.toThrow(expect.objectContaining({ code: "provider_error" }));
  });

  it("rejects a callback with valid state but no code", async () => {
    const stateCookie = signOAuthState({
      nonce: "nonce-1",
      provider: "google",
    });

    await expect(
      service.completeCallback({
        provider: "google",
        stateCookie,
        stateParam: "nonce-1",
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "missing_code" }));
  });

  it("checks state before spending a code", async () => {
    await expect(
      service.completeCallback({
        provider: "google",
        code: "some-code",
        stateParam: "nonce-1",
      }),
    ).rejects.toThrow(expect.objectContaining({ code: "invalid_state" }));
  });
});

describe("OAuthFlowError", () => {
  it("keeps provider detail off the message the user would ever see", () => {
    const err = new OAuthFlowError("provider_error", "client secret rejected");
    expect(err.code).toBe("provider_error");
    expect(err.detail).toBe("client secret rejected");
  });
});
