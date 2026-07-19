import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { signAccessToken } from "@starter-kit/shared/auth";
import { getSequelize, Company, User } from "@starter-kit/shared/db";

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

let ownCompany: Company;
let otherCompany: Company;
let recruiter: User;
let otherRecruiter: User;
let recruiterWithoutCompany: User;
let candidate: User;
let admin: User;
let creatorRecruiter: User;
let recruiterToken: string;
let otherRecruiterToken: string;
let recruiterWithoutCompanyToken: string;
let candidateToken: string;
let adminToken: string;
let creatorRecruiterToken: string;
let createdCompanyId: string | undefined;

beforeAll(async () => {
  await initializeDatabase();

  const suffix = randomUUID();

  ownCompany = await Company.create({ name: `Own Company ${suffix}` });
  otherCompany = await Company.create({ name: `Other Company ${suffix}` });

  recruiter = await User.create({
    email: `company-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Company Recruiter",
    role: "RECRUITER",
    companyId: ownCompany.id,
  });
  otherRecruiter = await User.create({
    email: `company-other-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Other Company Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  recruiterWithoutCompany = await User.create({
    email: `company-no-company-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "No Company Recruiter",
    role: "RECRUITER",
  });
  candidate = await User.create({
    email: `company-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Company Candidate",
    role: "CANDIDATE",
  });
  admin = await User.create({
    email: `company-admin-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Company Admin",
    role: "ADMIN",
  });
  creatorRecruiter = await User.create({
    email: `company-creator-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Company Creator",
    role: "RECRUITER",
  });

  recruiterToken = tokenFor(recruiter);
  otherRecruiterToken = tokenFor(otherRecruiter);
  recruiterWithoutCompanyToken = tokenFor(recruiterWithoutCompany);
  candidateToken = tokenFor(candidate);
  adminToken = tokenFor(admin);
  creatorRecruiterToken = tokenFor(creatorRecruiter);
});

afterAll(async () => {
  await User.destroy({
    where: {
      id: [
        recruiter.id,
        otherRecruiter.id,
        recruiterWithoutCompany.id,
        candidate.id,
        admin.id,
        creatorRecruiter.id,
      ],
    },
  });

  const companyIds = [
    ownCompany.id,
    otherCompany.id,
    ...(createdCompanyId ? [createdCompanyId] : []),
  ];

  await Company.destroy({ where: { id: companyIds } });
  await getSequelize().close();
});

describe("GET /api/companies/me", () => {
  it("returns the caller's company for a recruiter", async () => {
    const res = await request(app)
      .get("/api/companies/me")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ownCompany.id,
      name: ownCompany.name,
    });
  });

  it("returns 404 when a recruiter has no company", async () => {
    const res = await request(app)
      .get("/api/companies/me")
      .set("Cookie", cookie(recruiterWithoutCompanyToken));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Company not found for caller");
  });

  it("returns 401 without authentication", async () => {
    const res = await request(app).get("/api/companies/me");

    expect(res.status).toBe(401);
  });
});

describe("GET /api/companies/:id", () => {
  it("returns a recruiter's own company", async () => {
    const res = await request(app)
      .get(`/api/companies/${ownCompany.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ownCompany.id,
      name: ownCompany.name,
    });
  });

  it("404s when a recruiter reads another company", async () => {
    const res = await request(app)
      .get(`/api/companies/${otherCompany.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(404);
  });

  it("allows an admin to read any company", async () => {
    const res = await request(app)
      .get(`/api/companies/${otherCompany.id}`)
      .set("Cookie", cookie(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: otherCompany.id,
      name: otherCompany.name,
    });
  });

  it("403s for a candidate", async () => {
    const res = await request(app)
      .get(`/api/companies/${ownCompany.id}`)
      .set("Cookie", cookie(candidateToken));

    expect(res.status).toBe(403);
  });

  it("returns the other recruiter's own company", async () => {
    const res = await request(app)
      .get(`/api/companies/${otherCompany.id}`)
      .set("Cookie", cookie(otherRecruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(otherCompany.id);
  });
});

describe("POST /api/companies duplicate create", () => {
  it("409s on the second POST for a recruiter who already has a company", async () => {
    const createRes = await request(app)
      .post("/api/companies")
      .set("Cookie", cookie(creatorRecruiterToken))
      .send({ name: "First Created Company" });

    expect(createRes.status).toBe(201);
    createdCompanyId = createRes.body.data.id;

    const duplicateRes = await request(app)
      .post("/api/companies")
      .set("Cookie", cookie(creatorRecruiterToken))
      .send({ name: "Second Created Company" });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toBe("Company already exists");
  });
});
