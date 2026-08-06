import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { signOAuthState } from "@starter-kit/shared/auth";
import {
  getSequelize,
  Company,
  OAuthIdentity,
  User,
} from "@starter-kit/shared/db";

/**
 * The provider round-trip against a real database.
 *
 * Only the two outbound HTTP calls are faked — the token exchange and the
 * userinfo read. Everything after that is the real thing: the real state
 * check, the real uniqueness constraint, the real session issuance, and the
 * real company gate a recruiter walks into afterwards. Faking the service
 * instead would have tested the mock.
 *
 * The one part no test can cover is the consent screen itself; that still
 * needs a human to click through once against real credentials.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface FakeProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
}

let nextProfile: FakeProfile;
let tokenExchangeStatus = 200;
let tokenExchangeBody: Record<string, unknown> = {
  access_token: "provider-access-token",
};

const realFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function suffixed(value: string, suffix: string): string {
  return `${value}-${suffix}@example.com`;
}

/** Mint the state pair the callback expects, skipping the redirect to Google. */
function statePair(role?: string): { cookie: string; param: string } {
  const nonce = randomUUID();
  return {
    cookie: signOAuthState({ nonce, provider: "google", role }),
    param: nonce,
  };
}

function callback(params: {
  code?: string;
  state: { cookie: string; param: string };
  error?: string;
}) {
  const query = new URLSearchParams();
  if (params.code) {
    query.set("code", params.code);
  }
  if (params.error) {
    query.set("error", params.error);
  }
  query.set("state", params.state.param);

  return request(app)
    .get(`/api/auth/google/callback?${query.toString()}`)
    .set("Cookie", [`oauthState=${params.state.cookie}`]);
}

function accessCookieFrom(res: request.Response): string {
  const jar = res.headers["set-cookie"] as unknown as string[];
  const cookie = jar.find((entry) => entry.startsWith("accessToken="));
  if (!cookie) {
    throw new Error("callback issued no access cookie");
  }
  return cookie.split(";")[0];
}

function errorCodeFrom(res: request.Response): string | null {
  return new URL(res.headers.location).searchParams.get("oauth_error");
}

const suffix = randomUUID().slice(0, 8);
const createdUserIds: string[] = [];
const createdCompanyIds: string[] = [];

beforeAll(async () => {
  await initializeDatabase();

  process.env.GOOGLE_CLIENT_ID = "integration-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "integration-client-secret";

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.startsWith(TOKEN_URL)) {
      return jsonResponse(tokenExchangeStatus, tokenExchangeBody);
    }
    if (url.startsWith(USERINFO_URL)) {
      return jsonResponse(200, nextProfile);
    }

    throw new Error(`unexpected outbound request to ${url}`);
  }) as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;

  if (createdUserIds.length > 0) {
    await OAuthIdentity.destroy({ where: { userId: createdUserIds } });
    await User.destroy({ where: { id: createdUserIds } });
  }
  if (createdCompanyIds.length > 0) {
    await Company.destroy({ where: { id: createdCompanyIds } });
  }

  await getSequelize().close();
});

beforeEach(() => {
  tokenExchangeStatus = 200;
  tokenExchangeBody = { access_token: "provider-access-token" };
});

async function trackUserByEmail(email: string): Promise<User | null> {
  const user = await User.findOne({ where: { email } });
  if (user) {
    createdUserIds.push(user.id);
  }
  return user;
}

// ─── First sign-in creates the account ────────────────────────────────────────

describe("first Google sign-in for an unknown account", () => {
  const email = suffixed("oauth-newcomer", suffix);

  beforeAll(() => {
    nextProfile = {
      sub: `google-sub-newcomer-${suffix}`,
      email,
      email_verified: true,
      name: "Newcomer Person",
    };
  });

  it("creates the user, links the identity, and leaves the role unanswered", async () => {
    const res = await callback({ code: "auth-code", state: statePair() });

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.pathname).toBe("/auth/callback");
    expect(location.searchParams.get("status")).toBe("new");

    const user = await trackUserByEmail(email);
    expect(user).not.toBeNull();
    expect(user!.roleSelectionPending).toBe(true);

    const identity = await OAuthIdentity.findOne({
      where: { provider: "google", providerUserId: nextProfile.sub },
    });
    expect(identity).not.toBeNull();
    expect(identity!.userId).toBe(user!.id);
    expect(identity!.email).toBe(email);
  });

  it("issues a session that /auth/me accepts", async () => {
    const res = await callback({ code: "auth-code", state: statePair() });

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", [accessCookieFrom(res)]);

    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
    expect(me.body.data.roleSelectionPending).toBe(true);
  });

  it("signs the same person in again without a second identity row", async () => {
    const before = await OAuthIdentity.count({
      where: { provider: "google", providerUserId: nextProfile.sub },
    });

    const res = await callback({ code: "auth-code-2", state: statePair() });

    const location = new URL(res.headers.location);
    // No status=new: a returning user must not be re-asked for their role.
    expect(location.searchParams.get("status")).toBeNull();

    const after = await OAuthIdentity.count({
      where: { provider: "google", providerUserId: nextProfile.sub },
    });
    expect(after).toBe(before);
  });

  it("will not let the same provider account link to a second user", async () => {
    const other = await User.create({
      email: suffixed("oauth-other", suffix),
      passwordHash: "unused-in-these-tests",
      name: "Other Person",
    });
    createdUserIds.push(other.id);

    await expect(
      OAuthIdentity.create({
        userId: other.id,
        provider: "google",
        providerUserId: nextProfile.sub,
      }),
    ).rejects.toThrow();
  });
});

// ─── Role prompt, then the recruiter company gate ─────────────────────────────

describe("a new OAuth signup choosing recruiter", () => {
  const email = suffixed("oauth-recruiter", suffix);
  let sessionCookie: string;

  beforeAll(async () => {
    nextProfile = {
      sub: `google-sub-recruiter-${suffix}`,
      email,
      email_verified: true,
      name: "Recruiter Person",
    };

    const res = await callback({ code: "auth-code", state: statePair() });
    sessionCookie = accessCookieFrom(res);
    await trackUserByEmail(email);
  });

  it("records the choice and clears the pending flag", async () => {
    const res = await request(app)
      .post("/api/auth/role")
      .set("Cookie", [sessionCookie])
      .send({ role: "RECRUITER" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("RECRUITER");
    expect(res.body.data.roleSelectionPending).toBe(false);

    // The re-issued cookie is what carries the new role on the JWT.
    sessionCookie = accessCookieFrom(res);

    const user = await User.findOne({ where: { email } });
    expect(user!.role).toBe("RECRUITER");
    expect(user!.roleSelectionPending).toBe(false);
  });

  it("still has to complete a company profile, exactly like a password recruiter", async () => {
    const res = await request(app)
      .get("/api/companies/me")
      .set("Cookie", [sessionCookie]);

    // 404 is what the frontend reads as "company profile not set up yet" and
    // is the gate that blocks job creation. Arriving via Google grants no
    // shortcut past it.
    expect(res.status).toBe(404);
  });

  it("passes the gate only once a company profile exists", async () => {
    const created = await request(app)
      .post("/api/companies")
      .set("Cookie", [sessionCookie])
      .send({
        name: `OAuth Recruiter Co ${suffix}`,
        industry: "Software",
        size: "11-50 employees",
        location: "Beirut, Lebanon",
        contact: "hiring@example.com",
      });

    expect(created.status).toBe(201);
    createdCompanyIds.push(created.body.data.id);

    const profile = await request(app)
      .get("/api/companies/me")
      .set("Cookie", [sessionCookie]);

    expect(profile.status).toBe(200);
    expect(profile.body.data.profileComplete).toBe(true);
  });

  it("refuses to answer the role prompt a second time", async () => {
    const res = await request(app)
      .post("/api/auth/role")
      .set("Cookie", [sessionCookie])
      .send({ role: "CANDIDATE" });

    expect(res.status).toBe(409);

    const user = await User.findOne({ where: { email } });
    expect(user!.role).toBe("RECRUITER");
  });
});

// ─── Email collision with an existing password account ────────────────────────

describe("Google sign-in for an email that already has a password account", () => {
  const email = suffixed("oauth-collision", suffix);

  beforeAll(async () => {
    const existing = await User.create({
      email,
      passwordHash: "unused-in-these-tests",
      name: "Password Person",
      role: "CANDIDATE",
    });
    createdUserIds.push(existing.id);

    nextProfile = {
      sub: `google-sub-collision-${suffix}`,
      email,
      email_verified: true,
      name: "Password Person",
    };
  });

  it("refuses to link, issues no session, and says which door to use", async () => {
    const res = await callback({ code: "auth-code", state: statePair() });

    expect(res.status).toBe(302);
    expect(new URL(res.headers.location).pathname).toBe("/login");
    expect(errorCodeFrom(res)).toBe("email_exists");

    const jar = (res.headers["set-cookie"] as unknown as string[]) ?? [];
    expect(jar.some((entry) => entry.startsWith("accessToken="))).toBe(false);
  });

  it("leaves the password account untouched, with no identity attached", async () => {
    await callback({ code: "auth-code", state: statePair() });

    const identities = await OAuthIdentity.count({
      where: { provider: "google", providerUserId: nextProfile.sub },
    });
    expect(identities).toBe(0);

    const user = await User.findOne({ where: { email } });
    expect(user!.passwordHash).toBe("unused-in-these-tests");
    expect(user!.roleSelectionPending).toBe(false);
  });
});

// ─── Failure modes ────────────────────────────────────────────────────────────

describe("callbacks that cannot complete", () => {
  beforeEach(() => {
    nextProfile = {
      sub: `google-sub-unused-${suffix}`,
      email: suffixed("oauth-unused", suffix),
      email_verified: true,
      name: "Unused Person",
    };
  });

  it("returns a denied consent to login without creating anything", async () => {
    const res = await callback({
      state: statePair(),
      error: "access_denied",
    });

    expect(errorCodeFrom(res)).toBe("access_denied");
    expect(await User.count({ where: { email: nextProfile.email } })).toBe(0);
  });

  it("rejects a callback whose state was not the one we issued", async () => {
    const res = await request(app)
      .get("/api/auth/google/callback?code=auth-code&state=someone-elses-nonce")
      .set("Cookie", [`oauthState=${statePair().cookie}`]);

    expect(errorCodeFrom(res)).toBe("invalid_state");
    expect(await User.count({ where: { email: nextProfile.email } })).toBe(0);
  });

  it("reports bad client credentials instead of throwing deep in the handler", async () => {
    tokenExchangeStatus = 401;
    tokenExchangeBody = {
      error: "invalid_client",
      error_description: "Unauthorized",
    };

    const res = await callback({ code: "auth-code", state: statePair() });

    expect(res.status).toBe(302);
    expect(errorCodeFrom(res)).toBe("provider_error");
    // The provider's wording stays in the log, not in the user's URL bar.
    expect(res.headers.location).not.toContain("invalid_client");
  });

  it("will not create an account on an address Google has not verified", async () => {
    nextProfile = { ...nextProfile, email_verified: false };

    const res = await callback({ code: "auth-code", state: statePair() });

    expect(errorCodeFrom(res)).toBe("email_unverified");
    expect(await User.count({ where: { email: nextProfile.email } })).toBe(0);
  });
});

// ─── The start route ──────────────────────────────────────────────────────────

describe("GET /api/auth/google", () => {
  it("hands out a state that its own callback accepts", async () => {
    const start = await request(app).get("/api/auth/google?role=RECRUITER");

    expect(start.status).toBe(302);
    const nonce = new URL(start.headers.location).searchParams.get("state");
    const stateCookie = (start.headers["set-cookie"] as unknown as string[])
      .find((entry) => entry.startsWith("oauthState="))!
      .split(";")[0]
      .replace("oauthState=", "");

    nextProfile = {
      sub: `google-sub-roundtrip-${suffix}`,
      email: suffixed("oauth-roundtrip", suffix),
      email_verified: true,
      name: "Roundtrip Person",
    };

    const res = await callback({
      code: "auth-code",
      state: { cookie: stateCookie, param: nonce! },
    });

    expect(new URL(res.headers.location).pathname).toBe("/auth/callback");
    // The role picked before leaving comes back with them.
    expect(new URL(res.headers.location).searchParams.get("role")).toBe(
      "RECRUITER",
    );

    await trackUserByEmail(nextProfile.email);
  });
});
