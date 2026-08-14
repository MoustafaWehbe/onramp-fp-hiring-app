import { randomUUID } from "crypto";
import request from "supertest";
import { col, fn, where as sqlWhere } from "sequelize";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { signAccessToken } from "@starter-kit/shared/auth";
import { getSequelize, Skill, User } from "@starter-kit/shared/db";

function tokenFor(user: User): string {
  return signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: randomUUID(),
  });
}

function cookie(token: string): string[] {
  return [`accessToken=${token}`];
}

let candidate: User;
let recruiter: User;
let candidateToken: string;
let recruiterToken: string;
const createdSkillIds: string[] = [];

beforeAll(async () => {
  await initializeDatabase();
  const suffix = randomUUID();

  candidate = await User.create({
    email: `skill-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Skill Candidate",
    role: "CANDIDATE",
  });
  recruiter = await User.create({
    email: `skill-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Skill Recruiter",
    role: "RECRUITER",
  });
  candidateToken = tokenFor(candidate);
  recruiterToken = tokenFor(recruiter);
});

afterAll(async () => {
  await Skill.destroy({ where: { id: createdSkillIds } });
  await User.destroy({ where: { id: [candidate.id, recruiter.id] } });
  await getSequelize().close();
});

describe("GET/POST /api/skills", () => {
  it("creates an open-catalog skill and exposes it in another role's search", async () => {
    const name = `Distributed Tracing ${randomUUID()}`;
    const createRes = await request(app)
      .post("/api/skills")
      .set("Cookie", cookie(recruiterToken))
      .send({ name });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.name).toBe(name);
    createdSkillIds.push(createRes.body.data.id);

    const searchRes = await request(app)
      .get("/api/skills")
      .query({ q: "distributed trac" })
      .set("Cookie", cookie(candidateToken));

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data).toContainEqual({
      id: createRes.body.data.id,
      name,
    });
  });

  it("returns the existing row for a differently-cased create", async () => {
    const name = `Case Safe Skill ${randomUUID()}`;
    const first = await request(app)
      .post("/api/skills")
      .set("Cookie", cookie(candidateToken))
      .send({ name });
    expect(first.status).toBe(201);
    createdSkillIds.push(first.body.data.id);

    const second = await request(app)
      .post("/api/skills")
      .set("Cookie", cookie(recruiterToken))
      .send({ name: name.toUpperCase() });

    expect(second.status).toBe(200);
    expect(second.body.data).toEqual(first.body.data);
    expect(
      await Skill.count({
        where: sqlWhere(fn("LOWER", col("name")), name.toLowerCase()),
      }),
    ).toBe(1);
  });

  it("requires authentication and a non-noisy search query", async () => {
    const unauthenticated = await request(app)
      .get("/api/skills")
      .query({ q: "react" });
    expect(unauthenticated.status).toBe(401);

    const shortQuery = await request(app)
      .get("/api/skills")
      .query({ q: "r" })
      .set("Cookie", cookie(candidateToken));
    expect(shortQuery.status).toBe(422);

    const emptyQuery = await request(app)
      .get("/api/skills")
      .set("Cookie", cookie(candidateToken));
    expect(emptyQuery.status).toBe(422);
  });
});
