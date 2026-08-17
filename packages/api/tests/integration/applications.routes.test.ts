import { randomUUID } from "crypto";
import { PDFDocument, StandardFonts } from "pdf-lib";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import type { ApplicationStage } from "@starter-kit/shared/db";
import {
  applicationFitScoreQueue,
  getRedisConnection,
  type ApplicationFitScoreJobData,
  type ApplicationFitScoreJobResult,
} from "@starter-kit/shared/queue";
import type { Job as QueueJob } from "bullmq";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import {
  applicationResumeService,
  extractResumeText,
} from "../../src/services/application-resume.service";
import { processApplicationFitScoreJobWithScorer } from "../../../workers/src/jobs/application-fit-score.job";

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

const APPLICATION_KEYS = [
  "id",
  "jobId",
  "stage",
  "coverLetter",
  "parsedSkills",
  "parsedYearsExperience",
  "resumeDownloadUrl",
  "resumeOriginalFilename",
  "resumeParseSucceeded",
  "resumeUploadedAt",
  "resumeUrl",
  "submittedAt",
  "createdAt",
  "updatedAt",
  "job",
].sort();

const JOB_KEYS = [
  "id",
  "title",
  "description",
  "location",
  "status",
  "createdAt",
  "company",
].sort();

const COMPANY_KEYS = ["id", "name", "website", "logoUrl"].sort();

let company: Company;
let recruiter: User;
let otherCompanyRecruiter: User;
let candidateA: User;
let candidateB: User;
let draftOnlyCandidate: User;
let candidateWithoutProfile: User;
let candidateProfileA: CandidateProfile;
let candidateProfileB: CandidateProfile;
let draftOnlyCandidateProfile: CandidateProfile;
let recruiterToken: string;
let otherCompanyRecruiterToken: string;
let candidateAToken: string;
let candidateBToken: string;
let candidateWithoutProfileToken: string;

let ownDraftApplication: Application;
let ownHistoricalApplication: Application;
let otherCandidateApplication: Application;
let transitionDraftApplication: Application;
let submittedDuplicateApplication: Application;
let concurrentDraftApplication: Application;
let pipelineDraftApplication: Application;
let pipelineSubmittedApplication: Application;
let draftOnlyProfileApplication: Application;

let historicalClosedJob: Job;
let newApplicationJob: Job;
let transitionDraftJob: Job;
let submittedDuplicateJob: Job;
let closedApplicationJob: Job;
let concurrentApplicationJob: Job;
let concurrentDraftJob: Job;
let pipelineJob: Job;
let draftOnlyProfileJob: Job;
let resumeUploadJob: Job;
let corruptResumeJob: Job;

const createdCompanyIds: string[] = [];
const createdUserIds: string[] = [];
const createdCandidateProfileIds: string[] = [];
const createdJobIds: string[] = [];
let databaseInitialized = false;

async function createTrackedJob(input: {
  title: string;
  status?: "OPEN" | "CLOSED";
}): Promise<Job> {
  const job = await Job.create({
    companyId: company.id,
    createdById: recruiter.id,
    title: input.title,
    description: `${input.title} integration-test description`,
    location: "Remote",
    status: input.status ?? "OPEN",
  });
  createdJobIds.push(job.id);
  return job;
}

async function createApplication(input: {
  jobId: string;
  candidateProfileId: string;
  stage: ApplicationStage;
  coverLetter?: string;
  resumeUrl?: string;
  submittedAt?: Date;
  resumeText?: string | null;
  parsedSkills?: string[] | null;
  parsedYearsExperience?: number | null;
  resumeUploadedAt?: Date | null;
  fitScore?: number | null;
  aiSummary?: string | null;
  aiStrengths?: string[] | null;
  aiGaps?: string[] | null;
  aiScoredAt?: Date | null;
  aiScoringStatus?: "pending" | "completed" | "failed";
  interviewDate?: Date | null;
  recruiterNotes?: string | null;
  interviewScheduledAt?: Date | null;
}): Promise<Application> {
  return Application.create(input);
}

async function createTextPdf(text: string): Promise<Buffer> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const page = document.addPage([612, 792]);
  page.drawText(text, { x: 72, y: 720, size: 9, font });

  return Buffer.from(await document.save());
}

function fitScoreQueueJob(
  application: Application,
  attemptsMade = 0,
  resumeUploadedAt = application.resumeUploadedAt?.toISOString() ?? null,
): QueueJob<ApplicationFitScoreJobData, ApplicationFitScoreJobResult> {
  return {
    data: {
      applicationId: application.id,
      resumeUploadedAt,
    },
    opts: { attempts: 3 },
    attemptsMade,
  } as unknown as QueueJob<
    ApplicationFitScoreJobData,
    ApplicationFitScoreJobResult
  >;
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  // Pro, so the existing rescore/AI-scoring assertions below (predating
  // subscription tiers) keep exercising that behavior now that it's gated.
  // A dedicated FREE fixture covers the gate itself further down.
  company = await Company.create({
    name: `Applications Company ${suffix}`,
    website: "https://applications.example.com",
    description: "Internal company description",
    logoUrl: "https://applications.example.com/logo.png",
    subscriptionTier: "PRO",
  });
  createdCompanyIds.push(company.id);

  // Also Pro: the cross-company rescore test expects a 404 from the
  // ownership guard specifically, not a 403 from the tier gate.
  const otherCompany = await Company.create({
    name: `Other Applications Company ${suffix}`,
    industry: "Security",
    size: "1-10 employees",
    location: "Remote",
    contact: `other-applications-${suffix}@example.com`,
    subscriptionTier: "PRO",
  });
  createdCompanyIds.push(otherCompany.id);

  recruiter = await User.create({
    email: `applications-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(recruiter.id);

  otherCompanyRecruiter = await User.create({
    email: `other-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Other Applications Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  createdUserIds.push(otherCompanyRecruiter.id);

  candidateA = await User.create({
    email: `applications-candidate-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate A",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateA.id);

  candidateB = await User.create({
    email: `applications-candidate-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate B",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateB.id);

  draftOnlyCandidate = await User.create({
    email: `applications-draft-only-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Draft-Only Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(draftOnlyCandidate.id);

  candidateWithoutProfile = await User.create({
    email: `applications-no-profile-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate Without Profile",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateWithoutProfile.id);

  candidateProfileA = await CandidateProfile.create({
    userId: candidateA.id,
    headline: "Candidate A",
    resumeUrl: "/uploads/resumes/candidate-a.pdf",
  });
  createdCandidateProfileIds.push(candidateProfileA.id);

  candidateProfileB = await CandidateProfile.create({
    userId: candidateB.id,
    headline: "Candidate B",
    resumeUrl: "/uploads/resumes/candidate-b.pdf",
  });
  createdCandidateProfileIds.push(candidateProfileB.id);

  draftOnlyCandidateProfile = await CandidateProfile.create({
    userId: draftOnlyCandidate.id,
    headline: "Draft-only candidate",
  });
  createdCandidateProfileIds.push(draftOnlyCandidateProfile.id);

  recruiterToken = tokenFor(recruiter);
  otherCompanyRecruiterToken = tokenFor(otherCompanyRecruiter);
  candidateAToken = tokenFor(candidateA);
  candidateBToken = tokenFor(candidateB);
  candidateWithoutProfileToken = tokenFor(candidateWithoutProfile);

  historicalClosedJob = await createTrackedJob({
    title: `Historical Closed Job ${suffix}`,
    status: "CLOSED",
  });
  const ownDraftJob = await createTrackedJob({
    title: `Own Draft Job ${suffix}`,
  });
  const otherCandidateJob = await createTrackedJob({
    title: `Other Candidate Job ${suffix}`,
  });
  newApplicationJob = await createTrackedJob({
    title: `New Application Job ${suffix}`,
  });
  transitionDraftJob = await createTrackedJob({
    title: `Transition Draft Job ${suffix}`,
  });
  submittedDuplicateJob = await createTrackedJob({
    title: `Submitted Duplicate Job ${suffix}`,
  });
  closedApplicationJob = await createTrackedJob({
    title: `Closed Application Job ${suffix}`,
    status: "CLOSED",
  });
  concurrentApplicationJob = await createTrackedJob({
    title: `Concurrent Application Job ${suffix}`,
  });
  concurrentDraftJob = await createTrackedJob({
    title: `Concurrent Draft Job ${suffix}`,
  });
  pipelineJob = await createTrackedJob({
    title: `Pipeline Job ${suffix}`,
  });
  draftOnlyProfileJob = await createTrackedJob({
    title: `Draft-Only Profile Job ${suffix}`,
  });
  resumeUploadJob = await createTrackedJob({
    title: `Resume Upload Job ${suffix}`,
  });
  corruptResumeJob = await createTrackedJob({
    title: `Corrupt Resume Job ${suffix}`,
  });

  ownDraftApplication = await createApplication({
    jobId: ownDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Candidate-only draft",
  });
  ownHistoricalApplication = await createApplication({
    jobId: historicalClosedJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "APPLIED",
    coverLetter: "Historical submitted application",
    resumeUrl: candidateProfileA.resumeUrl,
    submittedAt: new Date("2025-01-02T03:04:05.000Z"),
  });
  otherCandidateApplication = await createApplication({
    jobId: otherCandidateJob.id,
    candidateProfileId: candidateProfileB.id,
    stage: "APPLIED",
    coverLetter: "Candidate B application",
    resumeUrl: candidateProfileB.resumeUrl,
    submittedAt: new Date("2025-02-03T04:05:06.000Z"),
  });
  transitionDraftApplication = await createApplication({
    jobId: transitionDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Original draft cover letter",
    resumeUrl: "/uploads/resumes/stale-draft.pdf",
  });
  submittedDuplicateApplication = await createApplication({
    jobId: submittedDuplicateJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "REVIEWED",
    coverLetter: "Already submitted",
    resumeUrl: candidateProfileA.resumeUrl,
    submittedAt: new Date("2025-03-04T05:06:07.000Z"),
  });
  concurrentDraftApplication = await createApplication({
    jobId: concurrentDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Concurrent draft",
  });
  pipelineDraftApplication = await createApplication({
    jobId: pipelineJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Must remain candidate-only",
  });
  pipelineSubmittedApplication = await createApplication({
    jobId: pipelineJob.id,
    candidateProfileId: candidateProfileB.id,
    stage: "APPLIED",
    coverLetter: "Visible pipeline application",
    resumeUrl: candidateProfileB.resumeUrl,
    submittedAt: new Date("2025-04-05T06:07:08.000Z"),
  });
  draftOnlyProfileApplication = await createApplication({
    jobId: draftOnlyProfileJob.id,
    candidateProfileId: draftOnlyCandidateProfile.id,
    stage: "DRAFT",
    coverLetter: "This must not expose the candidate to recruiters",
  });
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  try {
    if (createdJobIds.length > 0) {
      const storedResumes = await Application.findAll({
        attributes: ["resumeFileUrl"],
        where: { jobId: createdJobIds },
      });
      await Promise.all(
        storedResumes
          .map((application) => application.resumeFileUrl)
          .filter((key): key is string => Boolean(key))
          .map((key) => applicationResumeService.delete(key)),
      );
      await Application.destroy({ where: { jobId: createdJobIds } });
      await Job.destroy({ where: { id: createdJobIds } });
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
  } finally {
    await applicationFitScoreQueue.obliterate({ force: true });
    await applicationFitScoreQueue.close();
    await getRedisConnection().quit();
    await getSequelize().close();
  }
});

describe("GET /api/applications/me", () => {
  it("requires authentication and the CANDIDATE role", async () => {
    const unauthenticated = await request(app).get("/api/applications/me");
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(recruiterToken));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe("Insufficient permissions");

    const missingProfile = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateWithoutProfileToken));
    expect(missingProfile.status).toBe(404);
    expect(missingProfile.body.error).toBe("Candidate profile not found");
  });

  it("returns only the caller's applications, including DRAFT and historical CLOSED jobs", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateAToken));

    expect(res.status).toBe(200);

    const applications = res.body.data as Array<{
      id: string;
      stage: string;
      job: {
        id: string;
        status: string;
        company: { id: string };
      };
    }>;
    const ids = applications.map((application) => application.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        ownDraftApplication.id,
        ownHistoricalApplication.id,
      ]),
    );
    expect(ids).not.toContain(otherCandidateApplication.id);

    expect(
      applications.find(
        (application) => application.id === ownDraftApplication.id,
      )?.stage,
    ).toBe("DRAFT");
    expect(
      applications.find(
        (application) => application.id === ownHistoricalApplication.id,
      )?.job.status,
    ).toBe("CLOSED");
  });

  it("uses the candidate-safe application, job, and company response shape", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateAToken));

    expect(res.status).toBe(200);

    const application = res.body.data.find(
      (item: { id: string }) => item.id === ownHistoricalApplication.id,
    );
    expect(application).toBeDefined();
    expect(Object.keys(application).sort()).toEqual(APPLICATION_KEYS);
    expect(Object.keys(application.job).sort()).toEqual(JOB_KEYS);
    expect(Object.keys(application.job.company).sort()).toEqual(COMPANY_KEYS);
    expect(application).toMatchObject({
      id: ownHistoricalApplication.id,
      jobId: historicalClosedJob.id,
      stage: "APPLIED",
      job: {
        id: historicalClosedJob.id,
        title: historicalClosedJob.title,
        status: "CLOSED",
        company: {
          id: company.id,
          name: company.name,
          website: company.website,
          logoUrl: company.logoUrl,
        },
      },
    });
    expect(application).not.toHaveProperty("candidateProfileId");
    expect(application.job).not.toHaveProperty("companyId");
    expect(application.job).not.toHaveProperty("createdById");
    expect(application.job.company).not.toHaveProperty("description");
  });

  it("resolves scope independently for another candidate", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateBToken));

    expect(res.status).toBe(200);

    const ids = res.body.data.map((application: { id: string }) => application.id);
    expect(ids).toContain(otherCandidateApplication.id);
    expect(ids).toContain(pipelineSubmittedApplication.id);
    expect(ids).not.toContain(ownDraftApplication.id);
    expect(ids).not.toContain(ownHistoricalApplication.id);
  });
});

describe("POST /api/applications", () => {
  it("creates an APPLIED application for an OPEN job with server-controlled fields", async () => {
    const beforeSubmission = Date.now();
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: newApplicationJob.id,
        coverLetter: "A newly submitted application",
        candidateProfileId: candidateProfileB.id,
        stage: "HIRED",
        resumeUrl: "/uploads/resumes/client-controlled.pdf",
        submittedAt: "2000-01-01T00:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      jobId: newApplicationJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "A newly submitted application",
      resumeUrl: candidateProfileA.resumeUrl,
    });

    const submittedAt = Date.parse(res.body.data.submittedAt);
    expect(submittedAt).toBeGreaterThanOrEqual(beforeSubmission);
    expect(submittedAt).toBeLessThanOrEqual(Date.now());

    const persisted = await Application.findByPk(res.body.data.id);
    expect(persisted).not.toBeNull();
    expect(persisted).toMatchObject({
      jobId: newApplicationJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      resumeUrl: candidateProfileA.resumeUrl,
      aiScoringStatus: "pending",
      fitScore: null,
    });
    expect(persisted!.submittedAt!.getTime()).toBe(submittedAt);
    expect(res.body.data).not.toHaveProperty("fitScore");
    expect(res.body.data).not.toHaveProperty("aiSummary");
    expect(res.body.data).not.toHaveProperty("aiScoringStatus");
  });

  it("submits an existing DRAFT in place and returns 200", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: transitionDraftJob.id,
        coverLetter: "Final cover letter",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: transitionDraftApplication.id,
      jobId: transitionDraftJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "Final cover letter",
      resumeUrl: "/uploads/resumes/stale-draft.pdf",
    });
    expect(res.body.data.submittedAt).toBeTruthy();

    const rows = await Application.findAll({
      where: {
        jobId: transitionDraftJob.id,
        candidateProfileId: candidateProfileA.id,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(transitionDraftApplication.id);
    expect(rows[0].stage).toBe("APPLIED");
    expect(rows[0].aiScoringStatus).toBe("pending");
  });

  it("returns 409 when the candidate already submitted for the job", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: submittedDuplicateJob.id,
        coverLetter: "Duplicate submission",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("You have already applied for this job");

    await submittedDuplicateApplication.reload();
    expect(submittedDuplicateApplication.stage).toBe("REVIEWED");
    expect(submittedDuplicateApplication.coverLetter).toBe("Already submitted");
  });

  it("returns 404 when applying to a CLOSED job", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({ jobId: closedApplicationJob.id });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
    expect(
      await Application.count({
        where: {
          jobId: closedApplicationJob.id,
          candidateProfileId: candidateProfileA.id,
        },
      }),
    ).toBe(0);
  });

  it("allows exactly one create under concurrent duplicate submissions", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({ jobId: concurrentApplicationJob.id }),
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({ jobId: concurrentApplicationJob.id }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);

    const created = responses.find((response) => response.status === 201)!;
    const duplicate = responses.find((response) => response.status === 409)!;
    expect(created.body.data.stage).toBe("APPLIED");
    expect(duplicate.body.error).toBe(
      "You have already applied for this job",
    );

    const rows = await Application.findAll({
      where: {
        jobId: concurrentApplicationJob.id,
        candidateProfileId: candidateProfileA.id,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.body.data.id);
    expect(rows[0].stage).toBe("APPLIED");
  });

  it("allows exactly one submission of an existing DRAFT", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({
          jobId: concurrentDraftJob.id,
          coverLetter: "First concurrent draft submission",
        }),
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({
          jobId: concurrentDraftJob.id,
          coverLetter: "Second concurrent draft submission",
        }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);

    await concurrentDraftApplication.reload();
    expect(concurrentDraftApplication.stage).toBe("APPLIED");
    expect(concurrentDraftApplication.submittedAt).toBeDefined();
    expect(
      await Application.count({
        where: {
          jobId: concurrentDraftJob.id,
          candidateProfileId: candidateProfileA.id,
        },
      }),
    ).toBe(1);
  });
});

describe("application CV upload, parsing, replacement, and access", () => {
  it("stores and parses a real PDF and serves it only to authorized users", async () => {
    const pdf = await createTextPdf(
      "Amara has 6+ years of professional experience with React, TypeScript, Node.js, PostgreSQL, Docker, and AWS.",
    );
    expect(await extractResumeText(pdf, "application/pdf")).toContain(
      "6+ years of professional experience",
    );
    const submission = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .field("jobId", resumeUploadJob.id)
      .field("coverLetter", "Application with a real CV")
      .attach("resume", pdf, {
        filename: "Amara Okafor CV.pdf",
        contentType: "application/pdf",
      });

    expect(submission.status).toBe(201);
    expect(submission.body.data).toMatchObject({
      jobId: resumeUploadJob.id,
      candidateProfileId: candidateProfileA.id,
      resumeOriginalFilename: "Amara Okafor CV.pdf",
      parsedYearsExperience: 6,
      resumeParseSucceeded: true,
    });
    expect(submission.body.data.parsedSkills).toEqual(
      expect.arrayContaining([
        "React",
        "TypeScript",
        "Node.js",
        "PostgreSQL",
        "Docker",
        "AWS",
      ]),
    );
    expect(submission.body.data.resumeDownloadUrl).toBe(
      `/api/applications/${submission.body.data.id}/resume`,
    );
    expect(submission.body.data).not.toHaveProperty("resumeFileUrl");
    expect(submission.body.data).not.toHaveProperty("resumeText");

    const persisted = await Application.findByPk(submission.body.data.id);
    expect(persisted).not.toBeNull();
    expect(persisted!.resumeFileUrl).toMatch(
      /^application-resumes\/.+\.pdf$/,
    );
    expect(persisted!.resumeText).toContain("6+ years");
    expect(persisted!.parsedYearsExperience).toBe(6);
    expect(persisted!.parsedSkills).toEqual(
      expect.arrayContaining(["React", "TypeScript", "PostgreSQL"]),
    );
    expect(persisted!.resumeUploadedAt).toBeInstanceOf(Date);

    const candidateDownload = await request(app)
      .get(`/api/applications/${persisted!.id}/resume`)
      .set("Cookie", cookie(candidateAToken));
    expect(candidateDownload.status).toBe(200);
    expect(candidateDownload.headers["content-type"]).toContain(
      "application/pdf",
    );
    expect(candidateDownload.headers["content-disposition"]).toContain(
      "Amara%20Okafor%20CV.pdf",
    );
    expect(Buffer.compare(candidateDownload.body as Buffer, pdf)).toBe(0);

    const recruiterDownload = await request(app)
      .get(`/api/applications/${persisted!.id}/resume`)
      .set("Cookie", cookie(recruiterToken));
    expect(recruiterDownload.status).toBe(200);

    const otherCompanyDownload = await request(app)
      .get(`/api/applications/${persisted!.id}/resume`)
      .set("Cookie", cookie(otherCompanyRecruiterToken));
    expect(otherCompanyDownload.status).toBe(403);
    expect(otherCompanyDownload.body.error).toBe(
      "You cannot access this application's CV",
    );

    const otherCandidateDownload = await request(app)
      .get(`/api/applications/${persisted!.id}/resume`)
      .set("Cookie", cookie(candidateBToken));
    expect(otherCandidateDownload.status).toBe(403);

    const pipeline = await request(app)
      .get(`/api/applications/job/${resumeUploadJob.id}`)
      .set("Cookie", cookie(recruiterToken));
    expect(pipeline.status).toBe(200);
    expect(pipeline.body.data[0]).toMatchObject({
      id: persisted!.id,
      resumeOriginalFilename: "Amara Okafor CV.pdf",
      resumeDownloadUrl: `/api/applications/${persisted!.id}/resume`,
      resumeParseSucceeded: true,
    });

    const candidateDetail = await request(app)
      .get(`/api/candidate-profiles/${candidateProfileA.id}`)
      .set("Cookie", cookie(recruiterToken));
    expect(candidateDetail.status).toBe(200);
    expect(candidateDetail.body.data.applicationResumes).toContainEqual(
      expect.objectContaining({
        applicationId: persisted!.id,
        jobId: resumeUploadJob.id,
        jobTitle: resumeUploadJob.title,
        resumeOriginalFilename: "Amara Okafor CV.pdf",
        resumeDownloadUrl: `/api/applications/${persisted!.id}/resume`,
      }),
    );
    expect(candidateDetail.body.data.applicationInsights).toContainEqual(
      expect.objectContaining({
        applicationId: persisted!.id,
        jobId: resumeUploadJob.id,
        aiScoringStatus: "pending",
        fitScore: null,
      }),
    );
  });

  it("replaces a CV, clears stale parsing, and keeps an unreadable file downloadable", async () => {
    const application = await Application.findOne({
      where: {
        jobId: resumeUploadJob.id,
        candidateProfileId: candidateProfileA.id,
      },
    });
    expect(application?.resumeFileUrl).toBeTruthy();
    await application!.update({
      fitScore: 84,
      aiSummary: "This score must be invalidated by the replacement CV.",
      aiStrengths: ["Previous resume strength"],
      aiGaps: ["Previous resume gap"],
      aiScoredAt: new Date(),
      aiScoringStatus: "completed",
    });
    const previousStorageKey = application!.resumeFileUrl as string;
    const corruptedPdf = Buffer.from("%PDF-1.4\nthis is not a readable PDF");

    const replacement = await request(app)
      .put(`/api/applications/${application!.id}/resume`)
      .set("Cookie", cookie(candidateAToken))
      .attach("resume", corruptedPdf, {
        filename: "replacement.pdf",
        contentType: "application/pdf",
      });

    expect(replacement.status).toBe(200);
    expect(replacement.body.data).toMatchObject({
      id: application!.id,
      resumeOriginalFilename: "replacement.pdf",
      resumeParseSucceeded: false,
      parsedYearsExperience: null,
      parsedSkills: [],
    });

    await application!.reload();
    expect(application!.resumeText).toBeNull();
    expect(application!.parsedYearsExperience).toBeNull();
    expect(application!.parsedSkills).toEqual([]);
    expect(application!.resumeFileUrl).not.toBe(previousStorageKey);
    expect(application!.fitScore).toBeNull();
    expect(application!.aiSummary).toBeNull();
    expect(application!.aiStrengths).toBeNull();
    expect(application!.aiGaps).toBeNull();
    expect(application!.aiScoredAt).toBeNull();
    expect(application!.aiScoringStatus).toBe("pending");
    await expect(
      applicationResumeService.read(previousStorageKey),
    ).rejects.toMatchObject({ code: "ENOENT" });

    const download = await request(app)
      .get(`/api/applications/${application!.id}/resume`)
      .set("Cookie", cookie(recruiterToken));
    expect(download.status).toBe(200);
    expect(Buffer.compare(download.body as Buffer, corruptedPdf)).toBe(0);
  });

  it("submits a corrupted PDF without crashing and leaves parsing fields empty", async () => {
    const submission = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .field("jobId", corruptResumeJob.id)
      .attach("resume", Buffer.from("%PDF-corrupted"), {
        filename: "corrupted.pdf",
        contentType: "application/pdf",
      });

    expect(submission.status).toBe(201);
    expect(submission.body.data).toMatchObject({
      jobId: corruptResumeJob.id,
      resumeOriginalFilename: "corrupted.pdf",
      resumeParseSucceeded: false,
      parsedYearsExperience: null,
      parsedSkills: [],
    });

    const persisted = await Application.findByPk(submission.body.data.id);
    expect(persisted!.resumeFileUrl).toBeTruthy();
    expect(persisted!.resumeText).toBeNull();
  });

  it("rejects unsupported and oversized files without creating an application", async () => {
    const validationJob = await createTrackedJob({
      title: `CV Validation ${randomUUID()}`,
    });
    const unsupported = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .field("jobId", validationJob.id)
      .attach("resume", Buffer.from("not a CV"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(unsupported.status).toBe(422);
    expect(unsupported.body.error).toBe("Only PDF or DOCX files are allowed");

    const oversized = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .field("jobId", validationJob.id)
      .attach("resume", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "too-large.pdf",
        contentType: "application/pdf",
      });

    expect(oversized.status).toBe(413);
    expect(oversized.body.error).toBe("CV must be 5MB or smaller");
    expect(
      await Application.count({
        where: {
          jobId: validationJob.id,
          candidateProfileId: candidateProfileA.id,
        },
      }),
    ).toBe(0);
  });
});

describe("recruiter application pipeline", () => {
  it("shows a newly submitted application in the owning recruiter's pipeline", async () => {
    const job = await createTrackedJob({
      title: `New Pipeline Submission ${randomUUID()}`,
    });

    const submission = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: job.id,
        coverLetter: "Ready for recruiter review",
      });

    expect(submission.status).toBe(201);
    expect(submission.body.data).toMatchObject({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
    });

    const pipeline = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(pipeline.status).toBe(200);

    const application = pipeline.body.data.find(
      (item: { id: string }) => item.id === submission.body.data.id,
    );
    expect(application).toMatchObject({
      id: submission.body.data.id,
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "Ready for recruiter review",
      fitScore: null,
      aiSummary: null,
      aiStrengths: [],
      aiGaps: [],
      aiScoredAt: null,
      aiScoringStatus: "pending",
      candidateProfile: {
        id: candidateProfileA.id,
        user: {
          id: candidateA.id,
          name: candidateA.name,
          email: candidateA.email,
        },
      },
    });
  });

  it("sorts completed scores highest-first and blocks another company", async () => {
    const job = await createTrackedJob({
      title: `Score Sorting ${randomUUID()}`,
    });
    const lowerScore = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date("2026-07-01T10:00:00.000Z"),
      fitScore: 58,
      aiSummary: "Relevant experience with several role-specific gaps.",
      aiStrengths: ["Relevant product delivery"],
      aiGaps: ["Less experience than requested"],
      aiScoredAt: new Date("2026-07-01T10:01:00.000Z"),
      aiScoringStatus: "completed",
    });
    const higherScore = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileB.id,
      stage: "APPLIED",
      submittedAt: new Date("2026-07-01T10:02:00.000Z"),
      fitScore: 92,
      aiSummary: "Strong evidence across the role's core requirements.",
      aiStrengths: ["Direct role experience"],
      aiGaps: [],
      aiScoredAt: new Date("2026-07-01T10:03:00.000Z"),
      aiScoringStatus: "completed",
    });

    const pipeline = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(pipeline.status).toBe(200);
    expect(
      pipeline.body.data.map((application: { id: string }) => application.id),
    ).toEqual([higherScore.id, lowerScore.id]);
    expect(pipeline.body.data[0]).toMatchObject({
      fitScore: 92,
      aiScoringStatus: "completed",
      aiStrengths: ["Direct role experience"],
    });

    const crossCompany = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(otherCompanyRecruiterToken));
    expect(crossCompany.status).toBe(404);
  });

  it("allows only the owning recruiter to rescore and resets stale values", async () => {
    await pipelineSubmittedApplication.update({
      fitScore: 44,
      aiSummary: "A stale result that must be cleared.",
      aiStrengths: ["Stale strength"],
      aiGaps: ["Stale gap"],
      aiScoredAt: new Date(),
      aiScoringStatus: "failed",
    });

    const crossCompany = await request(app)
      .post(
        `/api/applications/${pipelineSubmittedApplication.id}/rescore`,
      )
      .set("Cookie", cookie(otherCompanyRecruiterToken));
    expect(crossCompany.status).toBe(404);

    const candidate = await request(app)
      .post(
        `/api/applications/${pipelineSubmittedApplication.id}/rescore`,
      )
      .set("Cookie", cookie(candidateBToken));
    expect(candidate.status).toBe(403);

    const rescore = await request(app)
      .post(
        `/api/applications/${pipelineSubmittedApplication.id}/rescore`,
      )
      .set("Cookie", cookie(recruiterToken));
    expect(rescore.status).toBe(202);
    expect(rescore.body.data).toMatchObject({
      id: pipelineSubmittedApplication.id,
      fitScore: null,
      aiSummary: null,
      aiStrengths: [],
      aiGaps: [],
      aiScoredAt: null,
      aiScoringStatus: "pending",
    });

    await pipelineSubmittedApplication.reload();
    expect(pipelineSubmittedApplication.fitScore).toBeNull();
    expect(pipelineSubmittedApplication.aiSummary).toBeNull();
    expect(pipelineSubmittedApplication.aiScoringStatus).toBe("pending");

    const duplicate = await request(app)
      .post(
        `/api/applications/${pipelineSubmittedApplication.id}/rescore`,
      )
      .set("Cookie", cookie(recruiterToken));
    expect(duplicate.status).toBe(409);
  });

  it("403s a rescore for a Free-tier company with an UPGRADE_REQUIRED code", async () => {
    const suffix = randomUUID();
    const freeCompany = await Company.create({
      name: `Free Rescore Company ${suffix}`,
      subscriptionTier: "FREE",
    });
    createdCompanyIds.push(freeCompany.id);

    const freeRecruiter = await User.create({
      email: `free-rescore-recruiter-${suffix}@example.com`,
      passwordHash: "unused-in-these-tests",
      name: "Free Rescore Recruiter",
      role: "RECRUITER",
      companyId: freeCompany.id,
    });
    createdUserIds.push(freeRecruiter.id);

    const freeJob = await Job.create({
      companyId: freeCompany.id,
      createdById: freeRecruiter.id,
      title: `Free Rescore Job ${suffix}`,
      description: "Free-tier rescore gate fixture.",
      location: "Remote",
      status: "OPEN",
    });
    createdJobIds.push(freeJob.id);

    const freeApplication = await createApplication({
      jobId: freeJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/applications/${freeApplication.id}/rescore`)
      .set("Cookie", cookie(tokenFor(freeRecruiter)));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("UPGRADE_REQUIRED");
  });

  it("excludes DRAFT applications from the job pipeline", async () => {
    const res = await request(app)
      .get(`/api/applications/job/${pipelineJob.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);

    const ids = res.body.data.map((application: { id: string }) => application.id);
    expect(ids).toContain(pipelineSubmittedApplication.id);
    expect(ids).not.toContain(pipelineDraftApplication.id);
    expect(
      res.body.data.every(
        (application: { stage: string }) => application.stage !== "DRAFT",
      ),
    ).toBe(true);
  });

  it("404s when a recruiter attempts to mutate a DRAFT application", async () => {
    const res = await request(app)
      .patch(`/api/applications/${pipelineDraftApplication.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "REVIEWED" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Application not found");

    await pipelineDraftApplication.reload();
    expect(pipelineDraftApplication.stage).toBe("DRAFT");
  });

  it("refuses a move back into APPLIED, however it is requested", async () => {
    const job = await createTrackedJob({
      title: `Stage Rule ${randomUUID()}`,
    });
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "INTERVIEWING",
      submittedAt: new Date("2026-07-20T09:00:00.000Z"),
    });

    // The Kanban board declines to offer this drop, but the rule that makes
    // it invalid lives on the server — a direct call is refused too.
    const res = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "APPLIED" });

    expect(res.status).toBe(422);

    await application.reload();
    expect(application.stage).toBe("INTERVIEWING");

    const toDraft = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "DRAFT" });
    expect(toDraft.status).toBe(422);

    await application.reload();
    expect(application.stage).toBe("INTERVIEWING");
  });

  it("allows a stage jump, because the product has no required order", async () => {
    const job = await createTrackedJob({
      title: `Stage Jump ${randomUUID()}`,
    });
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date("2026-07-20T09:00:00.000Z"),
    });

    // Straight from APPLIED to OFFER, and back down again. The board must not
    // invent an ordering the endpoint does not enforce.
    const forward = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "OFFER" });
    expect(forward.status).toBe(200);

    const backward = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "REVIEWED" });
    expect(backward.status).toBe(200);

    await application.reload();
    expect(application.stage).toBe("REVIEWED");
  });

  it("stamps hiredAt on entry to HIRED and leaves it alone afterwards", async () => {
    const job = await createTrackedJob({
      title: `Hired Stamp ${randomUUID()}`,
    });
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "OFFER",
      submittedAt: new Date("2026-07-20T09:00:00.000Z"),
    });
    expect(application.hiredAt ?? null).toBeNull();

    const beforeHire = Date.now();
    await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "HIRED" });

    await application.reload();
    expect(application.hiredAt).toBeInstanceOf(Date);
    expect(application.hiredAt!.getTime()).toBeGreaterThanOrEqual(beforeHire);
    const stampedAt = application.hiredAt!.getTime();

    // Editing notes on a hired candidate must not move the measured hire
    // date — the reason this is a column rather than updatedAt.
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ recruiterNotes: "Contract signed." });

    await application.reload();
    expect(application.hiredAt!.getTime()).toBe(stampedAt);
  });

  it("does not expose a candidate whose only application is a DRAFT", async () => {
    const list = await request(app)
      .get("/api/candidate-profiles")
      .set("Cookie", cookie(recruiterToken));

    expect(list.status).toBe(200);
    expect(
      list.body.data.map((profile: { id: string }) => profile.id),
    ).not.toContain(draftOnlyCandidateProfile.id);

    const detail = await request(app)
      .get(`/api/candidate-profiles/${draftOnlyCandidateProfile.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(detail.status).toBe(404);
    expect(detail.body.error).toBe("Candidate profile not found");

    await draftOnlyProfileApplication.reload();
    expect(draftOnlyProfileApplication.stage).toBe("DRAFT");
  });
});

describe("interview scheduling and recruiter notes", () => {
  async function pipelineApplication(input: {
    title: string;
    stage: ApplicationStage;
    interviewDate?: Date | null;
    interviewScheduledAt?: Date | null;
    recruiterNotes?: string | null;
  }): Promise<Application> {
    const job = await createTrackedJob({ title: input.title });

    return createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: input.stage,
      submittedAt: new Date("2026-07-20T09:00:00.000Z"),
      interviewDate: input.interviewDate ?? null,
      interviewScheduledAt: input.interviewScheduledAt ?? null,
      recruiterNotes: input.recruiterNotes ?? null,
    });
  }

  it("schedules a date while moving a candidate to INTERVIEWING", async () => {
    const application = await pipelineApplication({
      title: `Schedule On Move ${randomUUID()}`,
      stage: "REVIEWED",
    });
    const interviewDate = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const beforeUpdate = Date.now();

    const res = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "INTERVIEWING", interviewDate });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: application.id,
      stage: "INTERVIEWING",
      interviewDate,
      recruiterNotes: null,
    });

    await application.reload();
    expect(application.stage).toBe("INTERVIEWING");
    expect(application.interviewDate?.toISOString()).toBe(interviewDate);
    // Stamped for auditing the first time a date is set.
    expect(application.interviewScheduledAt).toBeInstanceOf(Date);
    expect(
      application.interviewScheduledAt!.getTime(),
    ).toBeGreaterThanOrEqual(beforeUpdate);
  });

  it("moves a candidate to INTERVIEWING with no date and leaves it null", async () => {
    const application = await pipelineApplication({
      title: `Move Without Date ${randomUUID()}`,
      stage: "APPLIED",
    });

    const res = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "INTERVIEWING" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      stage: "INTERVIEWING",
      interviewDate: null,
      interviewScheduledAt: null,
    });

    await application.reload();
    expect(application.stage).toBe("INTERVIEWING");
    expect(application.interviewDate).toBeNull();
    expect(application.interviewScheduledAt).toBeNull();
  });

  it("edits notes at any stage without touching a scheduled date", async () => {
    const scheduledAt = new Date("2026-07-25T08:00:00.000Z");
    const interviewDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const applied = await pipelineApplication({
      title: `Notes While Applied ${randomUUID()}`,
      stage: "APPLIED",
    });
    const rejected = await pipelineApplication({
      title: `Notes After Rejection ${randomUUID()}`,
      stage: "REJECTED",
      interviewDate,
      interviewScheduledAt: scheduledAt,
    });

    const earlyStage = await request(app)
      .patch(`/api/applications/${applied.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ recruiterNotes: "Worth a screen before the team commits." });

    expect(earlyStage.status).toBe(200);
    expect(earlyStage.body.data).toMatchObject({
      stage: "APPLIED",
      recruiterNotes: "Worth a screen before the team commits.",
      interviewDate: null,
    });

    const lateStage = await request(app)
      .patch(`/api/applications/${rejected.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ recruiterNotes: "Rejected for level, revisit for a senior req." });

    expect(lateStage.status).toBe(200);
    expect(lateStage.body.data).toMatchObject({
      stage: "REJECTED",
      recruiterNotes: "Rejected for level, revisit for a senior req.",
    });

    await rejected.reload();
    // Writing only notes must leave the date and its audit stamp intact.
    expect(rejected.interviewDate?.toISOString()).toBe(
      interviewDate.toISOString(),
    );
    expect(rejected.interviewScheduledAt?.toISOString()).toBe(
      scheduledAt.toISOString(),
    );
  });

  it("clears a scheduled date to null and keeps the audit stamp and notes", async () => {
    const scheduledAt = new Date("2026-07-26T08:00:00.000Z");
    const application = await pipelineApplication({
      title: `Clear Date ${randomUUID()}`,
      stage: "INTERVIEWING",
      interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      interviewScheduledAt: scheduledAt,
      recruiterNotes: "Panel scheduled with the platform team.",
    });

    const res = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ interviewDate: null });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      interviewDate: null,
      recruiterNotes: "Panel scheduled with the platform team.",
    });

    await application.reload();
    expect(application.interviewDate).toBeNull();
    expect(application.interviewScheduledAt?.toISOString()).toBe(
      scheduledAt.toISOString(),
    );
  });

  it("stores blank notes as null rather than an empty string", async () => {
    const application = await pipelineApplication({
      title: `Blank Notes ${randomUUID()}`,
      stage: "REVIEWED",
      recruiterNotes: "Something to erase.",
    });

    const res = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ recruiterNotes: "   " });

    expect(res.status).toBe(200);
    expect(res.body.data.recruiterNotes).toBeNull();

    await application.reload();
    expect(application.recruiterNotes).toBeNull();
  });

  it("resolves concurrent note edits as last-write-wins", async () => {
    const application = await pipelineApplication({
      title: `Concurrent Notes ${randomUUID()}`,
      stage: "INTERVIEWING",
    });

    const responses = await Promise.all([
      request(app)
        .patch(`/api/applications/${application.id}/interview`)
        .set("Cookie", cookie(recruiterToken))
        .send({ recruiterNotes: "First recruiter note." }),
      request(app)
        .patch(`/api/applications/${application.id}/interview`)
        .set("Cookie", cookie(recruiterToken))
        .send({ recruiterNotes: "Second recruiter note." }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);

    await application.reload();
    expect([
      "First recruiter note.",
      "Second recruiter note.",
    ]).toContain(application.recruiterNotes);
  });

  it("rejects nonsensical dates and an empty update", async () => {
    const application = await pipelineApplication({
      title: `Date Validation ${randomUUID()}`,
      stage: "INTERVIEWING",
    });

    const notADate = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ interviewDate: "next tuesday" });
    expect(notADate.status).toBe(422);
    expect(notADate.body.errors[0].message).toBe(
      "interviewDate must be an ISO 8601 datetime",
    );

    const farPast = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ interviewDate: "1999-01-01T09:00:00.000Z" });
    expect(farPast.status).toBe(422);
    expect(farPast.body.errors[0].message).toBe(
      "interviewDate is too far in the past",
    );

    const farFuture = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({ interviewDate: "2099-01-01T09:00:00.000Z" });
    expect(farFuture.status).toBe(422);
    expect(farFuture.body.errors[0].message).toBe(
      "interviewDate is too far in the future",
    );

    const empty = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiterToken))
      .send({});
    expect(empty.status).toBe(422);

    await application.reload();
    expect(application.interviewDate).toBeNull();
    expect(application.recruiterNotes).toBeNull();
  });

  it("refuses a recruiter from another company and a candidate", async () => {
    const application = await pipelineApplication({
      title: `Cross Company Interview ${randomUUID()}`,
      stage: "INTERVIEWING",
      recruiterNotes: "Only the owning company may read or edit this.",
    });

    // The ownership guard reports 404 rather than 403 so an outside caller
    // cannot confirm the application id exists — the same response the
    // phase-2 rescore endpoint gives.
    const crossCompany = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(otherCompanyRecruiterToken))
      .send({ recruiterNotes: "Injected by another company." });
    expect(crossCompany.status).toBe(404);

    const candidate = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(candidateAToken))
      .send({ recruiterNotes: "Injected by the candidate." });
    expect(candidate.status).toBe(403);

    const unauthenticated = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .send({ recruiterNotes: "Injected anonymously." });
    expect(unauthenticated.status).toBe(401);

    await application.reload();
    expect(application.recruiterNotes).toBe(
      "Only the owning company may read or edit this.",
    );
  });

  it("keeps recruiter notes out of the candidate's own application view", async () => {
    const job = await createTrackedJob({
      title: `Candidate Visibility ${randomUUID()}`,
    });
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "INTERVIEWING",
      submittedAt: new Date("2026-07-21T09:00:00.000Z"),
      interviewDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      interviewScheduledAt: new Date("2026-07-27T09:00:00.000Z"),
      recruiterNotes: "Internal-only hiring context.",
    });

    const mine = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateAToken));

    expect(mine.status).toBe(200);

    const own = mine.body.data.find(
      (item: { id: string }) => item.id === application.id,
    );
    expect(own).toBeDefined();
    expect(Object.keys(own).sort()).toEqual(APPLICATION_KEYS);
    expect(own).not.toHaveProperty("recruiterNotes");
    expect(own).not.toHaveProperty("interviewDate");
    expect(own).not.toHaveProperty("interviewScheduledAt");
  });

  it("surfaces the fields on both recruiter read paths", async () => {
    const job = await createTrackedJob({
      title: `Interview Read Paths ${randomUUID()}`,
    });
    const interviewDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const scheduledAt = new Date("2026-07-28T09:00:00.000Z");
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileB.id,
      stage: "INTERVIEWING",
      submittedAt: new Date("2026-07-22T09:00:00.000Z"),
      interviewDate,
      interviewScheduledAt: scheduledAt,
      recruiterNotes: "Loop confirmed with the hiring manager.",
    });

    const pipeline = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(pipeline.status).toBe(200);
    expect(pipeline.body.data[0]).toMatchObject({
      id: application.id,
      interviewDate: interviewDate.toISOString(),
      interviewScheduledAt: scheduledAt.toISOString(),
      recruiterNotes: "Loop confirmed with the hiring manager.",
    });

    const detail = await request(app)
      .get(`/api/candidate-profiles/${candidateProfileB.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(detail.status).toBe(200);
    expect(detail.body.data.applicationInsights).toContainEqual(
      expect.objectContaining({
        applicationId: application.id,
        stage: "INTERVIEWING",
        interviewDate: interviewDate.toISOString(),
        interviewScheduledAt: scheduledAt.toISOString(),
        recruiterNotes: "Loop confirmed with the hiring manager.",
      }),
    );
  });
});

describe("application fit-score worker", () => {
  it("persists a strictly shaped completed score", async () => {
    const job = await createTrackedJob({
      title: `Worker Completion ${randomUUID()}`,
    });
    const uploadedAt = new Date("2026-07-28T10:00:00.000Z");
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      resumeText:
        "Senior product engineer with 7 years using TypeScript and React.",
      parsedSkills: ["TypeScript", "React"],
      parsedYearsExperience: 7,
      resumeUploadedAt: uploadedAt,
      aiScoringStatus: "pending",
    });

    const result = await processApplicationFitScoreJobWithScorer(
      fitScoreQueueJob(application),
      async () => ({
        fit_score: 89,
        summary:
          "The candidate's experience aligns strongly with the role. Their resume provides direct evidence for the core requirements.",
        strengths: ["Relevant seniority", "Direct TypeScript evidence"],
        gaps: ["No explicit domain experience"],
      }),
    );

    expect(result).toEqual({ status: "completed", fitScore: 89 });
    await application.reload();
    expect(application).toMatchObject({
      fitScore: 89,
      aiScoringStatus: "completed",
      aiStrengths: ["Relevant seniority", "Direct TypeScript evidence"],
      aiGaps: ["No explicit domain experience"],
    });
    expect(application.aiScoredAt).toBeInstanceOf(Date);
  });

  it("marks a final LLM failure without persisting partial score data", async () => {
    const job = await createTrackedJob({
      title: `Worker Failure ${randomUUID()}`,
    });
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      resumeText: "Candidate resume evidence.",
      aiScoringStatus: "pending",
    });
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    await expect(
      processApplicationFitScoreJobWithScorer(
        fitScoreQueueJob(application, 2),
        async () => {
          throw new Error("Simulated LLM timeout");
        },
      ),
    ).rejects.toThrow("Simulated LLM timeout");

    await application.reload();
    expect(application).toMatchObject({
      fitScore: null,
      aiSummary: null,
      aiStrengths: null,
      aiGaps: null,
      aiScoredAt: null,
      aiScoringStatus: "failed",
    });
    consoleError.mockRestore();
  });

  it("does not let a stale pre-replacement job overwrite the current CV", async () => {
    const job = await createTrackedJob({
      title: `Worker Stale CV ${randomUUID()}`,
    });
    const currentUpload = new Date("2026-07-28T12:00:00.000Z");
    const application = await createApplication({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      resumeText: "Current replacement CV.",
      resumeUploadedAt: currentUpload,
      aiScoringStatus: "pending",
    });
    const score = jest.fn();

    await expect(
      processApplicationFitScoreJobWithScorer(
        fitScoreQueueJob(
          application,
          0,
          "2026-07-27T12:00:00.000Z",
        ),
        score,
      ),
    ).resolves.toEqual({ status: "stale" });
    expect(score).not.toHaveBeenCalled();

    await application.reload();
    expect(application.aiScoringStatus).toBe("pending");
    expect(application.fitScore).toBeNull();
  });
});
