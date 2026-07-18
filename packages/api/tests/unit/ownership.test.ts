import type { Request, Response } from "express";
import { isOwner, ownershipGuard } from "../../src/lib/ownership";

function mockReq(overrides: Partial<Request> = {}): Request {
  return { user: undefined, params: {}, ...overrides } as unknown as Request;
}

function mockRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
}

// ─── isOwner (pure check) ──────────────────────────────────────────────────────

describe("isOwner", () => {
  it("returns true when the resource's userId matches", () => {
    expect(isOwner({ userId: "user-1" }, "user-1")).toBe(true);
  });

  it("returns false when the resource's userId does not match", () => {
    expect(isOwner({ userId: "user-2" }, "user-1")).toBe(false);
  });

  it("returns false for a missing resource", () => {
    expect(isOwner(null, "user-1")).toBe(false);
    expect(isOwner(undefined, "user-1")).toBe(false);
  });

  it("supports a custom owner-id extractor for indirectly-owned resources", () => {
    // e.g. a WorkExperience owned via its parent CandidateProfile
    const workExperience = {
      id: "exp-1",
      candidateProfile: { userId: "user-1" },
    };
    const getOwnerId = (r: typeof workExperience) => r.candidateProfile.userId;

    expect(isOwner(workExperience, "user-1", getOwnerId)).toBe(true);
    expect(isOwner(workExperience, "user-2", getOwnerId)).toBe(false);
  });
});

// ─── ownershipGuard (Express middleware factory) ───────────────────────────────

describe("ownershipGuard", () => {
  it("returns 401 when req.user is missing (authenticate must run first)", async () => {
    const loadResource = jest.fn();
    const guard = ownershipGuard(loadResource);
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(loadResource).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 when the resource does not exist", async () => {
    const loadResource = jest.fn().mockResolvedValue(null);
    const guard = ownershipGuard(loadResource);
    const req = mockReq({
      user: { userId: "user-1", email: "a@a.com", role: "CANDIDATE", sessionId: "s1" },
    });
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 (not 403) when the resource exists but belongs to someone else", async () => {
    const loadResource = jest.fn().mockResolvedValue({ id: "r1", userId: "someone-else" });
    const guard = ownershipGuard(loadResource);
    const req = mockReq({
      user: { userId: "user-1", email: "a@a.com", role: "CANDIDATE", sessionId: "s1" },
    });
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches the resource to res.locals and calls next() when owned", async () => {
    const resource = { id: "r1", userId: "user-1" };
    const loadResource = jest.fn().mockResolvedValue(resource);
    const guard = ownershipGuard(loadResource);
    const req = mockReq({
      user: { userId: "user-1", email: "a@a.com", role: "CANDIDATE", sessionId: "s1" },
    });
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.resource).toBe(resource);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("supports a custom resultKey and a custom getOwnerId for indirect ownership", async () => {
    const resource = { id: "exp-1", candidateProfile: { userId: "user-1" } };
    const loadResource = jest.fn().mockResolvedValue(resource);
    const guard = ownershipGuard(loadResource, {
      getOwnerId: (r: typeof resource) => r.candidateProfile.userId,
      resultKey: "experience",
    });
    const req = mockReq({
      user: { userId: "user-1", email: "a@a.com", role: "CANDIDATE", sessionId: "s1" },
    });
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.experience).toBe(resource);
  });

  it("forwards loader errors to next() instead of throwing", async () => {
    const error = new Error("db down");
    const loadResource = jest.fn().mockRejectedValue(error);
    const guard = ownershipGuard(loadResource);
    const req = mockReq({
      user: { userId: "user-1", email: "a@a.com", role: "CANDIDATE", sessionId: "s1" },
    });
    const res = mockRes();
    const next = jest.fn();

    await guard(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
