import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  JobSkill,
  Skill,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";

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

type PublicJobResponse = {
  id: string;
  title: string;
  description: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT";
  experienceMin: number;
  experienceMax: number;
  location: string | null;
  isRemote: boolean;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  status: string;
  createdAt: string;
  company: {
    id: string;
    name: string;
    website: string | null;
    logoUrl: string | null;
  };
  skills: Array<{
    id: string;
    name: string;
  }>;
};

const PUBLIC_JOB_KEYS = [
  "id",
  "title",
  "description",
  "employmentType",
  "experienceMin",
  "experienceMax",
  "location",
  "isRemote",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "status",
  "createdAt",
  "company",
  "skills",
].sort();

const PUBLIC_COMPANY_KEYS = ["id", "name", "website", "logoUrl"].sort();
const PUBLIC_SKILL_KEYS = ["id", "name"].sort();

let ownCompany: Company;
let otherCompany: Company;
let ownRecruiter: User;
let otherRecruiter: User;
let ownRecruiterToken: string;
let publicSkill: Skill;
let ownOpenJob: Job;
let ownClosedJob: Job;
let ownDraftJob: Job;
let otherOpenJob: Job;
let otherClosedJob: Job;
let ownUpdateJob: Job;
let otherMutationJob: Job;
let ownDeleteJob: Job;
let incompleteCompany: Company;
let incompleteCompanyRecruiter: User;
let incompleteCompanyRecruiterToken: string;

const createdJobIds: string[] = [];
const createdUserIds: string[] = [];
const createdCompanyIds: string[] = [];
const createdSkillIds: string[] = [];
const createdApplicationIds: string[] = [];
const createdCandidateProfileIds: string[] = [];
let databaseInitialized = false;

async function createTrackedJob(input: {
  companyId: string;
  createdById: string;
  title: string;
  description: string;
  location: string;
  status: "DRAFT" | "OPEN" | "CLOSED";
}): Promise<Job> {
  const job = await Job.create(input);
  createdJobIds.push(job.id);
  return job;
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  ownCompany = await Company.create({
    name: `Jobs Own Company ${suffix}`,
    industry: "Software",
    size: "51-200 employees",
    location: "Beirut, Lebanon",
    contact: "hiring@own-jobs.example.com",
    website: "https://own-jobs.example.com",
    description: "Internal company description must not leak through public jobs.",
    logoUrl: "https://own-jobs.example.com/logo.png",
  });
  createdCompanyIds.push(ownCompany.id);

  otherCompany = await Company.create({
    name: `Jobs Other Company ${suffix}`,
    industry: "Technology",
    size: "11-50 employees",
    location: "Lagos, Nigeria",
    contact: "hiring@other-jobs.example.com",
    website: "https://other-jobs.example.com",
    description: "Another internal company description.",
    logoUrl: "https://other-jobs.example.com/logo.png",
  });
  createdCompanyIds.push(otherCompany.id);

  incompleteCompany = await Company.create({
    name: `Incomplete Jobs Company ${suffix}`,
  });
  createdCompanyIds.push(incompleteCompany.id);

  ownRecruiter = await User.create({
    email: `jobs-own-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Jobs Own Recruiter",
    role: "RECRUITER",
    companyId: ownCompany.id,
  });
  createdUserIds.push(ownRecruiter.id);

  otherRecruiter = await User.create({
    email: `jobs-other-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Jobs Other Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  createdUserIds.push(otherRecruiter.id);

  incompleteCompanyRecruiter = await User.create({
    email: `jobs-incomplete-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Incomplete Company Recruiter",
    role: "RECRUITER",
    companyId: incompleteCompany.id,
  });
  createdUserIds.push(incompleteCompanyRecruiter.id);

  ownRecruiterToken = tokenFor(ownRecruiter);
  incompleteCompanyRecruiterToken = tokenFor(incompleteCompanyRecruiter);

  publicSkill = await Skill.create({ name: `Jobs Integration Skill ${suffix}` });
  createdSkillIds.push(publicSkill.id);

  ownOpenJob = await createTrackedJob({
    companyId: ownCompany.id,
    createdById: ownRecruiter.id,
    title: `Own Open Job ${suffix}`,
    description: "Public own-company role.",
    location: "Beirut",
    status: "OPEN",
  });
  await JobSkill.create({ jobId: ownOpenJob.id, skillId: publicSkill.id });

  ownClosedJob = await createTrackedJob({
    companyId: ownCompany.id,
    createdById: ownRecruiter.id,
    title: `Own Closed Job ${suffix}`,
    description: "Closed own-company role.",
    location: "Remote",
    status: "CLOSED",
  });

  ownDraftJob = await createTrackedJob({
    companyId: ownCompany.id,
    createdById: ownRecruiter.id,
    title: `Own Draft Job ${suffix}`,
    description: "Draft own-company role.",
    location: "Beirut",
    status: "DRAFT",
  });

  otherOpenJob = await createTrackedJob({
    companyId: otherCompany.id,
    createdById: otherRecruiter.id,
    title: `Other Open Job ${suffix}`,
    description: "Public other-company role.",
    location: "Lagos",
    status: "OPEN",
  });

  otherClosedJob = await createTrackedJob({
    companyId: otherCompany.id,
    createdById: otherRecruiter.id,
    title: `Other Closed Job ${suffix}`,
    description: "Closed other-company role.",
    location: "Accra",
    status: "CLOSED",
  });

  ownUpdateJob = await createTrackedJob({
    companyId: ownCompany.id,
    createdById: ownRecruiter.id,
    title: `Own Update Job ${suffix}`,
    description: "Job reserved for update tests.",
    location: "Beirut",
    status: "OPEN",
  });

  otherMutationJob = await createTrackedJob({
    companyId: otherCompany.id,
    createdById: otherRecruiter.id,
    title: `Other Mutation Job ${suffix}`,
    description: "Job reserved for cross-company mutation tests.",
    location: "Lagos",
    status: "OPEN",
  });

  ownDeleteJob = await createTrackedJob({
    companyId: ownCompany.id,
    createdById: ownRecruiter.id,
    title: `Own Delete Job ${suffix}`,
    description: "Job reserved for delete tests.",
    location: "Remote",
    status: "OPEN",
  });

  const candidate = await User.create({
    email: `jobs-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Jobs Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidate.id);

  const candidateProfile = await CandidateProfile.create({
    userId: candidate.id,
    headline: "Applicant count fixture",
  });
  createdCandidateProfileIds.push(candidateProfile.id);

  const submittedApplication = await Application.create({
    jobId: ownOpenJob.id,
    candidateProfileId: candidateProfile.id,
    stage: "APPLIED",
    submittedAt: new Date(),
  });
  createdApplicationIds.push(submittedApplication.id);

  const draftApplication = await Application.create({
    jobId: ownDraftJob.id,
    candidateProfileId: candidateProfile.id,
    stage: "DRAFT",
  });
  createdApplicationIds.push(draftApplication.id);
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  if (createdApplicationIds.length > 0) {
    await Application.destroy({ where: { id: createdApplicationIds } });
  }
  if (createdJobIds.length > 0) {
    await JobSkill.destroy({ where: { jobId: createdJobIds } });
    await Job.destroy({ where: { id: createdJobIds } });
  }
  if (createdSkillIds.length > 0) {
    await Skill.destroy({ where: { id: createdSkillIds } });
  }
  if (createdCandidateProfileIds.length > 0) {
    await CandidateProfile.destroy({
      where: { id: createdCandidateProfileIds },
    });
  }
  if (createdUserIds.length > 0) {
    await User.destroy({ where: { id: createdUserIds } });
  }
  if (createdCompanyIds.length > 0) {
    await Company.destroy({ where: { id: createdCompanyIds } });
  }

  await getSequelize().close();
});

describe("public jobs", () => {
  it("lists OPEN jobs without authentication and exposes only public fields", async () => {
    const res = await request(app).get("/api/jobs/public");

    expect(res.status).toBe(200);

    const jobs = res.body.data as PublicJobResponse[];
    const ids = jobs.map((job) => job.id);

    expect(ids).toEqual(expect.arrayContaining([ownOpenJob.id, otherOpenJob.id]));
    expect(ids).not.toEqual(
      expect.arrayContaining([
        ownClosedJob.id,
        ownDraftJob.id,
        otherClosedJob.id,
      ]),
    );
    expect(jobs.every((job) => job.status === "OPEN")).toBe(true);

    const ownPublicJob = jobs.find((job) => job.id === ownOpenJob.id);
    expect(ownPublicJob).toBeDefined();
    expect(Object.keys(ownPublicJob!).sort()).toEqual(PUBLIC_JOB_KEYS);
    expect(ownPublicJob).toMatchObject({
      id: ownOpenJob.id,
      title: ownOpenJob.title,
      description: ownOpenJob.description,
      employmentType: "FULL_TIME",
      experienceMin: 0,
      experienceMax: 0,
      location: ownOpenJob.location,
      isRemote: false,
      salaryMin: 0,
      salaryMax: 0,
      salaryCurrency: "USD",
      status: "OPEN",
      company: {
        id: ownCompany.id,
        name: ownCompany.name,
        website: ownCompany.website,
        logoUrl: ownCompany.logoUrl,
      },
      skills: [{ id: publicSkill.id, name: publicSkill.name }],
    });
    expect(Object.keys(ownPublicJob!.company).sort()).toEqual(
      PUBLIC_COMPANY_KEYS,
    );
    expect(Object.keys(ownPublicJob!.skills[0]).sort()).toEqual(
      PUBLIC_SKILL_KEYS,
    );
    expect(JSON.stringify(ownPublicJob)).not.toContain(ownRecruiter.email);
  });

  it("returns an OPEN job detail without authentication using the same safe shape", async () => {
    const res = await request(app).get(`/api/jobs/public/${ownOpenJob.id}`);

    expect(res.status).toBe(200);

    const job = res.body.data as PublicJobResponse;
    expect(Object.keys(job).sort()).toEqual(PUBLIC_JOB_KEYS);
    expect(Object.keys(job.company).sort()).toEqual(PUBLIC_COMPANY_KEYS);
    expect(job.skills).toEqual([{ id: publicSkill.id, name: publicSkill.name }]);
    expect(Object.keys(job.skills[0]).sort()).toEqual(PUBLIC_SKILL_KEYS);
    expect(job).toMatchObject({
      id: ownOpenJob.id,
      status: "OPEN",
      company: {
        id: ownCompany.id,
        name: ownCompany.name,
      },
    });
  });

  it("404s public detail for a CLOSED job", async () => {
    const res = await request(app).get(`/api/jobs/public/${ownClosedJob.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
  });

  it("returns validation errors instead of a database error for malformed ids", async () => {
    const res = await request(app).get("/api/jobs/public/not-a-uuid");

    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: "Validation failed",
      errors: [
        {
          field: "id",
          message: "id must be a valid UUID",
        },
      ],
    });
  });
});

describe("recruiter job reads", () => {
  it("scopes GET /api/jobs to the caller's company", async () => {
    const res = await request(app)
      .get("/api/jobs")
      .set("Cookie", cookie(ownRecruiterToken));

    expect(res.status).toBe(200);

    const jobs = res.body.data as Array<{
      id: string;
      companyId: string;
      applicantCount: number;
      skills: Array<{ id: string; name: string }>;
    }>;
    const ids = jobs.map((job) => job.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        ownOpenJob.id,
        ownClosedJob.id,
        ownDraftJob.id,
        ownUpdateJob.id,
        ownDeleteJob.id,
      ]),
    );
    expect(ids).not.toEqual(
      expect.arrayContaining([
        otherOpenJob.id,
        otherClosedJob.id,
        otherMutationJob.id,
      ]),
    );
    expect(jobs.every((job) => job.companyId === ownCompany.id)).toBe(true);

    const openJob = jobs.find((job) => job.id === ownOpenJob.id);
    expect(openJob).toMatchObject({
      applicantCount: 1,
      skills: [{ id: publicSkill.id, name: publicSkill.name }],
    });

    const draftJob = jobs.find((job) => job.id === ownDraftJob.id);
    expect(draftJob?.applicantCount).toBe(0);
  });

  it("returns skills and the submitted applicant count on owned detail", async () => {
    const res = await request(app)
      .get(`/api/jobs/${ownOpenJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: ownOpenJob.id,
      companyId: ownCompany.id,
      applicantCount: 1,
      skills: [{ id: publicSkill.id, name: publicSkill.name }],
    });
  });

  it("404s when a recruiter reads another company's internal job detail", async () => {
    const res = await request(app)
      .get(`/api/jobs/${otherOpenJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
  });
});

describe("structured job creation", () => {
  function validJobInput(skillName: string) {
    return {
      title: "Staff Product Engineer",
      description: "Build and operate the hiring workflow.",
      employmentType: "FULL_TIME",
      experienceMin: 5,
      experienceMax: 9,
      location: "Beirut, Lebanon",
      isRemote: false,
      salaryMin: 90000,
      salaryMax: 130000,
      salaryCurrency: "usd",
      skills: [skillName, skillName.toUpperCase()],
      status: "OPEN",
    };
  }

  it("persists structured fields and required skill names atomically", async () => {
    const skillName = `Structured Skill ${randomUUID()}`;
    const res = await request(app)
      .post("/api/jobs")
      .set("Cookie", cookie(ownRecruiterToken))
      .send(validJobInput(skillName));

    expect(res.status).toBe(201);
    createdJobIds.push(res.body.data.id);

    const createdSkill = await Skill.findOne({ where: { name: skillName } });
    expect(createdSkill).not.toBeNull();
    createdSkillIds.push(createdSkill!.id);

    expect(res.body.data).toMatchObject({
      title: "Staff Product Engineer",
      employmentType: "FULL_TIME",
      experienceMin: 5,
      experienceMax: 9,
      isRemote: false,
      salaryMin: 90000,
      salaryMax: 130000,
      salaryCurrency: "USD",
      status: "OPEN",
      applicantCount: 0,
      skills: [{ id: createdSkill!.id, name: skillName }],
    });
    expect(
      await JobSkill.count({
        where: {
          jobId: res.body.data.id,
          skillId: createdSkill!.id,
        },
      }),
    ).toBe(1);
  });

  it("rejects job creation until the caller's company profile is complete", async () => {
    const skillName = `Blocked Skill ${randomUUID()}`;
    const res = await request(app)
      .post("/api/jobs")
      .set("Cookie", cookie(incompleteCompanyRecruiterToken))
      .send(validJobInput(skillName));

    expect(res.status).toBe(409);
    expect(res.body.error).toBe(
      "Complete your company profile before creating a job",
    );
    expect(await Skill.findOne({ where: { name: skillName } })).toBeNull();
  });

  it("requires a location for a non-remote job and validates ranges", async () => {
    const base = validJobInput(`Validation Skill ${randomUUID()}`);
    const [locationRes, rangeRes] = await Promise.all([
      request(app)
        .post("/api/jobs")
        .set("Cookie", cookie(ownRecruiterToken))
        .send({ ...base, location: "" }),
      request(app)
        .post("/api/jobs")
        .set("Cookie", cookie(ownRecruiterToken))
        .send({ ...base, experienceMin: 10, experienceMax: 4 }),
    ]);

    expect(locationRes.status).toBe(422);
    expect(locationRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "location",
          message: "location is required when isRemote is false",
        }),
      ]),
    );
    expect(rangeRes.status).toBe(422);
    expect(rangeRes.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "experienceMax" }),
      ]),
    );
  });
});

describe("job update ownership and validation", () => {
  it("allows an owner update but strips protected mass-assignment fields", async () => {
    const res = await request(app)
      .put(`/api/jobs/${ownUpdateJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({
        title: "Safely Updated Job",
        companyId: otherCompany.id,
        createdById: otherRecruiter.id,
        status: "CLOSED",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Safely Updated Job");

    await ownUpdateJob.reload();
    expect(ownUpdateJob.title).toBe("Safely Updated Job");
    expect(ownUpdateJob.companyId).toBe(ownCompany.id);
    expect(ownUpdateJob.createdById).toBe(ownRecruiter.id);
    expect(ownUpdateJob.status).toBe("CLOSED");
  });

  it("returns 422 for an invalid allowed update field", async () => {
    const res = await request(app)
      .put(`/api/jobs/${ownUpdateJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({ title: "" });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Validation failed");

    await ownUpdateJob.reload();
    expect(ownUpdateJob.title).toBe("Safely Updated Job");
  });

  it("validates partial ranges against persisted values", async () => {
    const res = await request(app)
      .put(`/api/jobs/${ownUpdateJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({ experienceMin: 5 });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe(
      "experienceMax must be greater than or equal to experienceMin",
    );
  });

  it("replaces required skills by name on update", async () => {
    const skillName = `Replacement Skill ${randomUUID()}`;
    const res = await request(app)
      .put(`/api/jobs/${ownUpdateJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({ skills: [skillName] });

    expect(res.status).toBe(200);
    expect(res.body.data.skills).toHaveLength(1);
    expect(res.body.data.skills[0].name).toBe(skillName);

    const skill = await Skill.findOne({ where: { name: skillName } });
    expect(skill).not.toBeNull();
    createdSkillIds.push(skill!.id);
  });

  it("validates a partial remote toggle against the persisted location", async () => {
    const remoteJob = await Job.create({
      companyId: ownCompany.id,
      createdById: ownRecruiter.id,
      title: `Remote Toggle Job ${randomUUID()}`,
      description: "Starts remote without a location.",
      isRemote: true,
      status: "DRAFT",
    });
    createdJobIds.push(remoteJob.id);

    const res = await request(app)
      .put(`/api/jobs/${remoteJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({ isRemote: false });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe(
      "location is required when isRemote is false",
    );
  });

  it("404s when a recruiter updates another company's job", async () => {
    const originalTitle = otherMutationJob.title;
    const res = await request(app)
      .put(`/api/jobs/${otherMutationJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken))
      .send({ title: "Cross-company overwrite" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");

    await otherMutationJob.reload();
    expect(otherMutationJob.title).toBe(originalTitle);
  });
});

describe("job delete ownership", () => {
  it("allows a recruiter to delete their own company's job", async () => {
    const res = await request(app)
      .delete(`/api/jobs/${ownDeleteJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken));

    expect(res.status).toBe(204);
    expect(await Job.findByPk(ownDeleteJob.id)).toBeNull();
  });

  it("404s when a recruiter deletes another company's job", async () => {
    const res = await request(app)
      .delete(`/api/jobs/${otherMutationJob.id}`)
      .set("Cookie", cookie(ownRecruiterToken));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
    expect(await Job.findByPk(otherMutationJob.id)).not.toBeNull();
  });
});
