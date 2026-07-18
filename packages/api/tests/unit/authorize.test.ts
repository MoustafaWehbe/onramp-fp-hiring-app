import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import { authenticate } from "../../src/middleware/authenticate";
import { authorize } from "../../src/middleware/authorize";

function appWithProtectedRoute() {
  const app = express();
  app.use(cookieParser());
  app.get(
    "/recruiter-only",
    authenticate,
    authorize("RECRUITER", "ADMIN"),
    (_req, res) => {
      res.json({ data: "ok" });
    },
  );
  return app;
}

function tokenFor(role: "ADMIN" | "RECRUITER" | "INTERVIEWER" | "CANDIDATE") {
  return signAccessToken({
    userId: "user-1",
    email: "user@example.com",
    role,
    sessionId: "session-1",
  });
}

describe("authorize() wired after authenticate()", () => {
  it("returns 401 when no auth cookie is present (authenticate blocks first)", async () => {
    const res = await request(appWithProtectedRoute()).get("/recruiter-only");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication required");
  });

  it("returns 403 when the authenticated user's role is not in the allowed list", async () => {
    const res = await request(appWithProtectedRoute())
      .get("/recruiter-only")
      .set("Cookie", [`accessToken=${tokenFor("CANDIDATE")}`]);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });

  it("allows the request through when the role is in the allowed list", async () => {
    const res = await request(appWithProtectedRoute())
      .get("/recruiter-only")
      .set("Cookie", [`accessToken=${tokenFor("RECRUITER")}`]);

    expect(res.status).toBe(200);
    expect(res.body.data).toBe("ok");
  });

  it("also allows a second listed role (ADMIN)", async () => {
    const res = await request(appWithProtectedRoute())
      .get("/recruiter-only")
      .set("Cookie", [`accessToken=${tokenFor("ADMIN")}`]);

    expect(res.status).toBe(200);
  });

  it("rejects INTERVIEWER, which was not in the allowed list", async () => {
    const res = await request(appWithProtectedRoute())
      .get("/recruiter-only")
      .set("Cookie", [`accessToken=${tokenFor("INTERVIEWER")}`]);

    expect(res.status).toBe(403);
  });
});
