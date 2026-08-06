import request from "supertest";

jest.mock("../../src/lib/db", () => ({
  initializeDatabase: jest.fn().mockResolvedValue(undefined),
  getDatabase: jest.fn(),
}));

// Only the service is faked. The controller, the routes, the cookie helpers
// and the redirect wiring are the things under test here.
jest.mock("../../src/services/oauth.service", () => {
  const actual = jest.requireActual("../../src/services/oauth.service");
  return {
    ...actual,
    oauthService: {
      buildAuthorizationRequest: jest.fn(),
      completeCallback: jest.fn(),
    },
  };
});

import { app } from "../../app";
import {
  oauthService,
  OAuthFlowError,
} from "../../src/services/oauth.service";

const mockOAuthService = oauthService as unknown as {
  buildAuthorizationRequest: jest.Mock;
  completeCallback: jest.Mock;
};

function cookieNamed(res: request.Response, name: string): string | undefined {
  const jar = res.headers["set-cookie"] as unknown as string[] | undefined;
  return jar?.find((entry) => entry.startsWith(`${name}=`));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  delete process.env.GITHUB_CLIENT_ID;
  delete process.env.GITHUB_CLIENT_SECRET;
});

// ─── GET /api/auth/providers ──────────────────────────────────────────────────

describe("GET /api/auth/providers", () => {
  it("lists only the providers this deployment has credentials for", async () => {
    const res = await request(app).get("/api/auth/providers");

    expect(res.status).toBe(200);
    expect(res.body.data.providers).toEqual(["google"]);
  });

  it("lists both once GitHub is configured too", async () => {
    process.env.GITHUB_CLIENT_ID = "test-github-client-id";
    process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";

    const res = await request(app).get("/api/auth/providers");

    expect(res.body.data.providers).toEqual(["google", "github"]);
  });
});

// ─── GET /api/auth/:provider ──────────────────────────────────────────────────

describe("GET /api/auth/google", () => {
  it("redirects to the consent screen and parks the state in a cookie", async () => {
    mockOAuthService.buildAuthorizationRequest.mockReturnValue({
      url: "https://accounts.google.com/o/oauth2/v2/auth?state=nonce-1",
      stateToken: "signed-state-token",
      nonce: "nonce-1",
    });

    const res = await request(app).get("/api/auth/google?role=RECRUITER");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?state=nonce-1",
    );

    const stateCookie = cookieNamed(res, "oauthState");
    expect(stateCookie).toContain("signed-state-token");
    expect(stateCookie).toContain("HttpOnly");
    // Lax, not Strict: the provider returns the user by top-level navigation,
    // and a Strict cookie would be withheld on exactly that request.
    expect(stateCookie).toContain("SameSite=Lax");

    expect(mockOAuthService.buildAuthorizationRequest).toHaveBeenCalledWith({
      provider: "google",
      role: "RECRUITER",
      returnTo: undefined,
    });
  });

  it("drops a returnTo that is not a local path", async () => {
    mockOAuthService.buildAuthorizationRequest.mockReturnValue({
      url: "https://accounts.google.com/o/oauth2/v2/auth",
      stateToken: "signed-state-token",
      nonce: "nonce-1",
    });

    await request(app).get(
      "/api/auth/google?returnTo=https://evil.example.com/steal",
    );

    expect(mockOAuthService.buildAuthorizationRequest).toHaveBeenCalledWith(
      expect.objectContaining({ returnTo: undefined }),
    );
  });

  it("sends the user back to login when the provider is not configured", async () => {
    mockOAuthService.buildAuthorizationRequest.mockImplementation(() => {
      throw new OAuthFlowError("provider_not_configured", "no client id");
    });

    const res = await request(app).get("/api/auth/github");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("oauth_error")).toBe(
      "provider_not_configured",
    );
    // The reason stays in the server log; the URL carries a code, not a cause.
    expect(res.headers.location).not.toContain("no client id");
  });
});

// ─── GET /api/auth/:provider/callback ─────────────────────────────────────────

describe("GET /api/auth/google/callback", () => {
  const session = {
    user: {
      id: "user-1",
      email: "person@example.com",
      name: "Person",
      role: "CANDIDATE",
    },
    accessToken: "access-token-value",
    refreshToken: "refresh-token-value",
  };

  it("issues the same session cookies the password flow does", async () => {
    mockOAuthService.completeCallback.mockResolvedValue({
      session,
      isNewUser: false,
    });

    const res = await request(app).get(
      "/api/auth/google/callback?code=abc&state=nonce-1",
    );

    const accessCookie = cookieNamed(res, "accessToken");
    const refreshCookie = cookieNamed(res, "refreshToken");

    expect(accessCookie).toContain("access-token-value");
    expect(accessCookie).toContain("HttpOnly");
    expect(accessCookie).toContain("Path=/api");
    expect(refreshCookie).toContain("refresh-token-value");
    expect(refreshCookie).toContain("Path=/api/auth/refresh");
  });

  it("flags a first-time signup so the frontend can ask for a role", async () => {
    mockOAuthService.completeCallback.mockResolvedValue({
      session,
      isNewUser: true,
      intendedRole: "RECRUITER",
    });

    const res = await request(app).get(
      "/api/auth/google/callback?code=abc&state=nonce-1",
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("status")).toBe("new");
    expect(location.searchParams.get("role")).toBe("RECRUITER");
  });

  it("does not flag a returning user for the role prompt", async () => {
    mockOAuthService.completeCallback.mockResolvedValue({
      session,
      isNewUser: false,
    });

    const res = await request(app).get(
      "/api/auth/google/callback?code=abc&state=nonce-1",
    );

    const location = new URL(res.headers.location);
    expect(location.searchParams.get("status")).toBeNull();
  });

  it("passes the state cookie through to the service and then clears it", async () => {
    mockOAuthService.completeCallback.mockResolvedValue({
      session,
      isNewUser: false,
    });

    const res = await request(app)
      .get("/api/auth/google/callback?code=abc&state=nonce-1")
      .set("Cookie", ["oauthState=signed-state-token"]);

    expect(mockOAuthService.completeCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        code: "abc",
        stateParam: "nonce-1",
        stateCookie: "signed-state-token",
      }),
    );

    // Single use: cleared whether or not the rest of the flow succeeded.
    expect(cookieNamed(res, "oauthState")).toContain("oauthState=;");
  });

  it("returns a denied consent to login with a non-alarming code", async () => {
    mockOAuthService.completeCallback.mockRejectedValue(
      new OAuthFlowError("access_denied", "user clicked cancel"),
    );

    const res = await request(app).get(
      "/api/auth/google/callback?error=access_denied&state=nonce-1",
    );

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("oauth_error")).toBe("access_denied");
    expect(location.searchParams.get("provider")).toBe("google");
    expect(cookieNamed(res, "accessToken")).toBeUndefined();
  });

  it("surfaces an email collision as its own code, with no session issued", async () => {
    mockOAuthService.completeCallback.mockRejectedValue(
      new OAuthFlowError("email_exists", "person@example.com is taken"),
    );

    const res = await request(app).get(
      "/api/auth/google/callback?code=abc&state=nonce-1",
    );

    const location = new URL(res.headers.location);
    expect(location.searchParams.get("oauth_error")).toBe("email_exists");
    expect(cookieNamed(res, "accessToken")).toBeUndefined();
    // The colliding address must not travel in a URL.
    expect(res.headers.location).not.toContain("person@example.com");
  });

  it("redirects rather than 500s when the callback throws something unexpected", async () => {
    mockOAuthService.completeCallback.mockRejectedValue(
      new TypeError("Cannot read properties of undefined"),
    );

    const res = await request(app).get(
      "/api/auth/google/callback?code=abc&state=nonce-1",
    );

    expect(res.status).toBe(302);
    expect(new URL(res.headers.location).searchParams.get("oauth_error")).toBe(
      "provider_error",
    );
  });
});
