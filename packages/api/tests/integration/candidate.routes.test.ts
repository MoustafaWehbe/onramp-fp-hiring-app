import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  getSequelize,
  User,
  CandidateProfile,
  WorkExperience,
  Skill,
  CandidateSkill,
} from "@starter-kit/shared/db";

/**
 * Runs against a real Postgres test database (DATABASE_URL from
 * tests/setup.ts, migrated separately) rather than mocking the DB, because
 * what's under test here is the ownership check itself — a mocked service
 * would just assert "the mock returned what I told it to return" and prove
 * nothing about cross-candidate isolation.
 */

function cookie(token: string): string[] {
  return [`accessToken=${token}`];
}

function tokenFor(user: User): string {
  return signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: randomUUID(),
  });
}

let candidateA: User;
let candidateB: User;
let recruiter: User;
let tokenA: string;
let tokenB: string;
let recruiterToken: string;
let skillReact: Skill;
let skillNode: Skill;

beforeAll(async () => {
  await initializeDatabase();

  const suffix = randomUUID();
  candidateA = await User.create({
    email: `candidate-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Candidate A",
    role: "CANDIDATE",
  });
  candidateB = await User.create({
    email: `candidate-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Candidate B",
    role: "CANDIDATE",
  });
  recruiter = await User.create({
    email: `recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter",
    role: "RECRUITER",
  });

  skillReact = await Skill.create({ name: `React-${suffix}` });
  skillNode = await Skill.create({ name: `Node-${suffix}` });

  tokenA = tokenFor(candidateA);
  tokenB = tokenFor(candidateB);
  recruiterToken = tokenFor(recruiter);
});

afterAll(async () => {
  const profileIds = (
    await CandidateProfile.findAll({
      where: { userId: [candidateA.id, candidateB.id] },
      attributes: ["id"],
    })
  ).map((p) => p.id);

  if (profileIds.length > 0) {
    await WorkExperience.destroy({ where: { candidateProfileId: profileIds } });
    await CandidateSkill.destroy({ where: { candidateProfileId: profileIds } });
    await CandidateProfile.destroy({ where: { id: profileIds } });
  }

  await Skill.destroy({ where: { id: [skillReact.id, skillNode.id] } });
  await User.destroy({ where: { id: [candidateA.id, candidateB.id, recruiter.id] } });

  await getSequelize().close();
});

// ─── Authn/authz gate, checked once here rather than on every route below ─────

describe("candidate routes: authentication and role gating", () => {
  it("returns 401 with no auth cookie", async () => {
    const res = await request(app).get("/api/candidate/profile");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a RECRUITER hitting a candidate-only route", async () => {
    const res = await request(app)
      .get("/api/candidate/profile")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Insufficient permissions");
  });
});

// ─── Profile: create-fails-if-exists, self-scoped GET/PATCH ───────────────────

describe("GET/POST/PATCH /api/candidate/profile", () => {
  it("404s before the candidate has created a profile", async () => {
    const res = await request(app)
      .get("/api/candidate/profile")
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(404);
  });

  it("creates the profile on first POST", async () => {
    const res = await request(app)
      .post("/api/candidate/profile")
      .set("Cookie", cookie(tokenA))
      .send({ headline: "Full-Stack Engineer", location: "Remote" });

    expect(res.status).toBe(201);
    expect(res.body.data.headline).toBe("Full-Stack Engineer");
    expect(res.body.data.userId).toBe(candidateA.id);
  });

  it("409s on a second POST — profile already exists", async () => {
    const res = await request(app)
      .post("/api/candidate/profile")
      .set("Cookie", cookie(tokenA))
      .send({ headline: "Second attempt" });

    expect(res.status).toBe(409);
  });

  it("GET now returns the created profile", async () => {
    const res = await request(app)
      .get("/api/candidate/profile")
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.data.headline).toBe("Full-Stack Engineer");
  });

  it("PATCH updates only the fields provided", async () => {
    const res = await request(app)
      .patch("/api/candidate/profile")
      .set("Cookie", cookie(tokenA))
      .send({ bio: "Nine years shipping web products." });

    expect(res.status).toBe(200);
    expect(res.body.data.bio).toBe("Nine years shipping web products.");
    expect(res.body.data.headline).toBe("Full-Stack Engineer");
  });

  it("422s on an invalid body", async () => {
    const res = await request(app)
      .patch("/api/candidate/profile")
      .set("Cookie", cookie(tokenA))
      .send({ headline: 12345 });

    expect(res.status).toBe(422);
  });

  // There's no :id on this route — "own profile" is resolved from the JWT,
  // not a client-supplied identifier — so isolation here means "candidate B
  // only ever sees candidate B's data", not "candidate B is denied access to
  // a specific id". This is what proves that structurally.
  it("isolation: candidate B's own profile is independent of candidate A's", async () => {
    const createB = await request(app)
      .post("/api/candidate/profile")
      .set("Cookie", cookie(tokenB))
      .send({ headline: "Backend Engineer" });
    expect(createB.status).toBe(201);

    const getB = await request(app)
      .get("/api/candidate/profile")
      .set("Cookie", cookie(tokenB));

    expect(getB.status).toBe(200);
    expect(getB.body.data.userId).toBe(candidateB.id);
    expect(getB.body.data.headline).toBe("Backend Engineer");
    expect(getB.body.data.headline).not.toBe("Full-Stack Engineer");
  });
});

// ─── Work experience: the cross-candidate-access centerpiece ──────────────────

describe("work experience: cross-candidate ownership", () => {
  let experienceIdOfA: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/candidate/experience")
      .set("Cookie", cookie(tokenA))
      .send({
        company: "Paystack",
        title: "Senior Software Engineer",
        startDate: "2021-03-01",
        description: "Led a team of four.",
      });

    expect(res.status).toBe(201);
    experienceIdOfA = res.body.data.id;
  });

  it("candidate A can list their own experience", async () => {
    const res = await request(app)
      .get("/api/candidate/experience")
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.data.some((e: { id: string }) => e.id === experienceIdOfA)).toBe(true);
  });

  it("candidate A can PATCH their own experience", async () => {
    const res = await request(app)
      .patch(`/api/candidate/experience/${experienceIdOfA}`)
      .set("Cookie", cookie(tokenA))
      .send({ title: "Staff Software Engineer" });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Staff Software Engineer");
  });

  it("candidate B does NOT see candidate A's experience in their own list", async () => {
    const res = await request(app)
      .get("/api/candidate/experience")
      .set("Cookie", cookie(tokenB));

    expect(res.status).toBe(200);
    expect(res.body.data.some((e: { id: string }) => e.id === experienceIdOfA)).toBe(false);
  });

  it("candidate B gets 404 (not 403) PATCHing candidate A's experience by id", async () => {
    const res = await request(app)
      .patch(`/api/candidate/experience/${experienceIdOfA}`)
      .set("Cookie", cookie(tokenB))
      .send({ title: "Hijacked title" });

    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
  });

  it("candidate B gets 404 DELETEing candidate A's experience by id", async () => {
    const res = await request(app)
      .delete(`/api/candidate/experience/${experienceIdOfA}`)
      .set("Cookie", cookie(tokenB));

    expect(res.status).toBe(404);
  });

  it("the attack did not mutate or delete candidate A's data", async () => {
    const res = await request(app)
      .get("/api/candidate/experience")
      .set("Cookie", cookie(tokenA));

    const experience = res.body.data.find((e: { id: string }) => e.id === experienceIdOfA);
    expect(experience).toBeDefined();
    expect(experience.title).toBe("Staff Software Engineer");
  });

  it("404s (not a 500) for a well-formed but nonexistent experience id", async () => {
    const res = await request(app)
      .patch(`/api/candidate/experience/${randomUUID()}`)
      .set("Cookie", cookie(tokenA))
      .send({ title: "Does not matter" });

    expect(res.status).toBe(404);
  });

  it("422s for a malformed experience id instead of hitting the database", async () => {
    const res = await request(app)
      .patch("/api/candidate/experience/not-a-uuid")
      .set("Cookie", cookie(tokenA))
      .send({ title: "Does not matter" });

    expect(res.status).toBe(422);
  });

  it("candidate A can DELETE their own experience", async () => {
    const res = await request(app)
      .delete(`/api/candidate/experience/${experienceIdOfA}`)
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(204);

    const listRes = await request(app)
      .get("/api/candidate/experience")
      .set("Cookie", cookie(tokenA));
    expect(listRes.body.data.some((e: { id: string }) => e.id === experienceIdOfA)).toBe(false);
  });
});

// ─── Work experience: date rules wired through the live route (schema-level ───
// coverage lives in tests/unit/candidate.schemas.test.ts; this just proves
// validate(createExperienceSchema)/validate(updateExperienceSchema) are
// actually attached to these routes) ────────────────────────────────────────

describe("work experience: date validation on the live routes", () => {
  it("POST rejects a future startDate with 422", async () => {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const res = await request(app)
      .post("/api/candidate/experience")
      .set("Cookie", cookie(tokenA))
      .send({
        company: "Future Co",
        title: "Time Traveler",
        startDate: tomorrow.toISOString().slice(0, 10),
      });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e: { message: string }) => e.message === "date cannot be in the future")).toBe(true);
  });

  it("PATCH rejects endDate before startDate with 422", async () => {
    const created = await request(app)
      .post("/api/candidate/experience")
      .set("Cookie", cookie(tokenA))
      .send({
        company: "Date Rules Co",
        title: "Engineer",
        startDate: "2020-01-01",
      });
    expect(created.status).toBe(201);

    const res = await request(app)
      .patch(`/api/candidate/experience/${created.body.data.id}`)
      .set("Cookie", cookie(tokenA))
      .send({ startDate: "2020-06-01", endDate: "2020-01-01" });

    expect(res.status).toBe(422);
    expect(
      res.body.errors.some(
        (e: { message: string }) => e.message === "endDate must be after startDate",
      ),
    ).toBe(true);

    await request(app)
      .delete(`/api/candidate/experience/${created.body.data.id}`)
      .set("Cookie", cookie(tokenA));
  });
});

// ─── Skills: own list, validated against real skill ids ───────────────────────

describe("GET/PUT /api/candidate/skills", () => {
  it("sets and returns the candidate's own skill list", async () => {
    const putRes = await request(app)
      .put("/api/candidate/skills")
      .set("Cookie", cookie(tokenA))
      .send({ skillIds: [skillReact.id, skillNode.id] });

    expect(putRes.status).toBe(200);
    expect(putRes.body.data.map((s: { id: string }) => s.id).sort()).toEqual(
      [skillReact.id, skillNode.id].sort(),
    );

    const getRes = await request(app)
      .get("/api/candidate/skills")
      .set("Cookie", cookie(tokenA));
    expect(getRes.body.data).toHaveLength(2);
  });

  it("422s when a skillId does not exist", async () => {
    const res = await request(app)
      .put("/api/candidate/skills")
      .set("Cookie", cookie(tokenA))
      .send({ skillIds: [randomUUID()] });

    expect(res.status).toBe(422);
  });

  it("candidate B's skill list is independent of candidate A's", async () => {
    const res = await request(app)
      .get("/api/candidate/skills")
      .set("Cookie", cookie(tokenB));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── Resume upload: local disk storage, validated type/size ───────────────────

describe("POST /api/candidate/resume", () => {
  it("uploads a PDF and sets resumeUrl on the candidate's own profile", async () => {
    const res = await request(app)
      .post("/api/candidate/resume")
      .set("Cookie", cookie(tokenA))
      .attach("resume", Buffer.from("%PDF-1.4 fake resume content"), "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.data.resumeUrl).toMatch(/^\/uploads\/resumes\//);
    expect(res.body.data.userId).toBe(candidateA.id);
  });

  it("422s for a disallowed file type", async () => {
    const res = await request(app)
      .post("/api/candidate/resume")
      .set("Cookie", cookie(tokenA))
      .attach("resume", Buffer.from("not a resume"), "resume.exe");

    expect(res.status).toBe(422);
  });

  it("422s when no file is attached", async () => {
    const res = await request(app)
      .post("/api/candidate/resume")
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(422);
  });

  it("413s for a file over the size limit", async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1, 1);
    const res = await request(app)
      .post("/api/candidate/resume")
      .set("Cookie", cookie(tokenA))
      .attach("resume", oversized, "resume.pdf");

    expect(res.status).toBe(413);
  });

  it("candidate B's upload only sets candidate B's resumeUrl, not candidate A's", async () => {
    const res = await request(app)
      .post("/api/candidate/resume")
      .set("Cookie", cookie(tokenB))
      .attach("resume", Buffer.from("%PDF-1.4 candidate B resume"), "resume.pdf");

    expect(res.status).toBe(200);
    expect(res.body.data.userId).toBe(candidateB.id);

    const profileA = await request(app)
      .get("/api/candidate/profile")
      .set("Cookie", cookie(tokenA));
    expect(profileA.body.data.resumeUrl).not.toBe(res.body.data.resumeUrl);
  });
});
