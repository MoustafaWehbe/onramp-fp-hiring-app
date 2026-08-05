import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { getSequelize, Company, Job, User } from "@starter-kit/shared/db";

/**
 * GET /api/public/companies/:companyId/careers
 *
 * This endpoint is unauthenticated, so the two things worth pinning are what
 * it will show (only OPEN jobs, for this company) and what it will never show
 * (the private half of the company record).
 */

const CAREERS_PATH = (companyId: string) =>
  `/api/public/companies/${companyId}/careers`;

let company: Company;
let otherCompany: Company;
let emptyCompany: Company;
let recruiter: User;
let openJob: Job;
let secondOpenJob: Job;
let draftJob: Job;
let closedJob: Job;
let otherCompanyJob: Job;

const createdJobIds: string[] = [];

async function createTrackedJob(input: {
  companyId: string;
  createdById: string;
  title: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
}): Promise<Job> {
  const job = await Job.create({
    description: "Role description used by the public careers page tests.",
    location: "Remote",
    ...input,
  });
  createdJobIds.push(job.id);
  return job;
}

beforeAll(async () => {
  await initializeDatabase();

  const suffix = randomUUID();

  // Every private field is populated, so a leak would show up as a value
  // rather than as a null that happens to look harmless.
  company = await Company.create({
    name: `Careers Company ${suffix}`,
    industry: "Software",
    size: "51-200 employees",
    location: "Beirut, Lebanon",
    contact: "private-hiring@careers-test.example.com",
    website: "https://careers-test.example.com",
    description: "We build things.",
    logoUrl: "https://careers-test.example.com/logo.png",
  });

  otherCompany = await Company.create({
    name: `Careers Other Company ${suffix}`,
  });

  emptyCompany = await Company.create({
    name: `Careers Empty Company ${suffix}`,
  });

  recruiter = await User.create({
    email: `careers-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Careers Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });

  openJob = await createTrackedJob({
    companyId: company.id,
    createdById: recruiter.id,
    title: "Public Open Role",
    status: "OPEN",
  });
  secondOpenJob = await createTrackedJob({
    companyId: company.id,
    createdById: recruiter.id,
    title: "Second Public Open Role",
    status: "OPEN",
  });
  draftJob = await createTrackedJob({
    companyId: company.id,
    createdById: recruiter.id,
    title: "Unpublished Draft Role",
    status: "DRAFT",
  });
  closedJob = await createTrackedJob({
    companyId: company.id,
    createdById: recruiter.id,
    title: "Closed Role",
    status: "CLOSED",
  });
  otherCompanyJob = await createTrackedJob({
    companyId: otherCompany.id,
    createdById: recruiter.id,
    title: "Another Company's Open Role",
    status: "OPEN",
  });
});

afterAll(async () => {
  await Job.destroy({ where: { id: createdJobIds } });
  await User.destroy({ where: { id: recruiter.id } });
  await Company.destroy({
    where: { id: [company.id, otherCompany.id, emptyCompany.id] },
  });
  await getSequelize().close();
});

describe("GET /api/public/companies/:companyId/careers", () => {
  it("is reachable without authentication", async () => {
    const res = await request(app).get(CAREERS_PATH(company.id));

    expect(res.status).toBe(200);
    expect(res.body.data.company.id).toBe(company.id);
  });

  it("exposes only the public company allow-list", async () => {
    const res = await request(app).get(CAREERS_PATH(company.id));

    expect(res.status).toBe(200);
    // Asserted as an exact key set, not a subset: a field added to the
    // authenticated serializer must not silently reach this page.
    expect(Object.keys(res.body.data.company).sort()).toEqual([
      "description",
      "id",
      "logoUrl",
      "name",
      "website",
    ]);
    expect(res.body.data.company).toEqual({
      id: company.id,
      name: company.name,
      website: "https://careers-test.example.com",
      logoUrl: "https://careers-test.example.com/logo.png",
      description: "We build things.",
    });
  });

  it("never leaks the hiring contact or the internal completeness flag", async () => {
    const res = await request(app).get(CAREERS_PATH(company.id));

    const body = JSON.stringify(res.body);
    expect(body).not.toContain("private-hiring@careers-test.example.com");
    expect(body).not.toContain("profileComplete");
    expect(body).not.toContain("51-200 employees");
  });

  it("lists only this company's OPEN jobs", async () => {
    const res = await request(app).get(CAREERS_PATH(company.id));

    const ids = res.body.data.jobs.map((job: { id: string }) => job.id);

    expect(ids).toHaveLength(2);
    expect(ids).toEqual(
      expect.arrayContaining([openJob.id, secondOpenJob.id]),
    );
    expect(ids).not.toContain(draftJob.id);
    expect(ids).not.toContain(closedJob.id);
    expect(ids).not.toContain(otherCompanyJob.id);
  });

  it("returns jobs in the same shape as the public jobs feed", async () => {
    const [careersRes, feedRes] = await Promise.all([
      request(app).get(CAREERS_PATH(company.id)),
      request(app).get("/api/jobs/public"),
    ]);

    const fromCareers = careersRes.body.data.jobs.find(
      (job: { id: string }) => job.id === openJob.id,
    );
    const fromFeed = (feedRes.body.data as { id: string }[]).find(
      (job) => job.id === openJob.id,
    );

    expect(fromCareers).toBeDefined();
    expect(fromFeed).toBeDefined();
    // Both go through jobService.getPublic, so this stays true only as long as
    // nobody reintroduces a second hand-rolled query.
    expect(fromCareers).toEqual(fromFeed);
  });

  it("404s for a company that does not exist", async () => {
    const res = await request(app).get(CAREERS_PATH(randomUUID()));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Company not found");
  });

  it("404s rather than 500s for a malformed company id", async () => {
    const res = await request(app).get(CAREERS_PATH("not-a-uuid"));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Company not found");
  });

  it("returns an empty job list for a company with nothing open", async () => {
    const res = await request(app).get(CAREERS_PATH(emptyCompany.id));

    expect(res.status).toBe(200);
    expect(res.body.data.jobs).toEqual([]);
    expect(res.body.data.company.name).toBe(emptyCompany.name);
  });
});
