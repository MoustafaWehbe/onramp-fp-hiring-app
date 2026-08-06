import { describe, expect, it } from "vitest";
import {
  buildOAuthStartUrl,
  getOAuthErrorMessage,
  isOAuthProvider,
} from "@/lib/oauth";

describe("buildOAuthStartUrl", () => {
  it("points at the API's start route for the provider", () => {
    expect(buildOAuthStartUrl("google")).toBe("/api/auth/google");
    expect(buildOAuthStartUrl("github")).toBe("/api/auth/github");
  });

  it("carries the picked role through in the canonical backend casing", () => {
    expect(buildOAuthStartUrl("google", { role: "recruiter" })).toBe(
      "/api/auth/google?role=RECRUITER",
    );
  });

  it("carries returnTo so the round-trip lands where the user was headed", () => {
    const url = new URL(
      buildOAuthStartUrl("google", { returnTo: "/recruiter/jobs" }),
      "http://localhost",
    );
    expect(url.searchParams.get("returnTo")).toBe("/recruiter/jobs");
  });

  it("omits empty params rather than sending blanks", () => {
    expect(buildOAuthStartUrl("google", { role: null, returnTo: null })).toBe(
      "/api/auth/google",
    );
  });
});

describe("getOAuthErrorMessage", () => {
  it("returns nothing when there is no error code", () => {
    expect(getOAuthErrorMessage(null, "google")).toBeNull();
  });

  it("tells a user with an existing password account exactly what to do", () => {
    const message = getOAuthErrorMessage("email_exists", "google");
    expect(message).toContain("already exists");
    expect(message).toContain("password");
  });

  it("keeps a cancelled consent non-alarming", () => {
    const message = getOAuthErrorMessage("access_denied", "google") ?? "";
    expect(message).toContain("cancelled");
    expect(message).not.toMatch(/error|failed/i);
  });

  it("names the provider in messages that are about the provider", () => {
    expect(getOAuthErrorMessage("provider_error", "github")).toContain(
      "GitHub",
    );
    expect(getOAuthErrorMessage("provider_not_configured", "google")).toContain(
      "Google",
    );
  });

  it("still says something useful for a code it does not recognise", () => {
    const message = getOAuthErrorMessage("something_new", "google");
    expect(message).toContain("Google");
    expect(message).toContain("email and password");
  });
});

describe("isOAuthProvider", () => {
  it("accepts the supported providers and nothing else", () => {
    expect(isOAuthProvider("google")).toBe(true);
    expect(isOAuthProvider("github")).toBe(true);
    expect(isOAuthProvider("facebook")).toBe(false);
    expect(isOAuthProvider(null)).toBe(false);
  });
});
