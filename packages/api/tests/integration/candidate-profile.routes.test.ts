import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  ApplicationStageHistory,
  CandidateEducation,
  CandidateJobRecommendation,
  CandidateProfile,
  CandidateSkill,
  Company,
  Job,
  Skill,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import { computeCandidateRecommendations } from "@starter-kit/shared/ai";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { candidateProfileSeedService } from "../../src/services/candidate-profile-seed.service";

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

let company: Company;
let recruiter: User;
let candidate: User;
let otherCandidate: User;
let profile: CandidateProfile;
let otherProfile: CandidateProfile;
let candidateToken: string;
let otherCandidateToken: string;
let recruiterToken: string;

const createdCompanyIds: string[] = [];
const createdUserIds: string[] = [];
const createdProfileIds: string[] = [];
const createdJobIds: string[] = [];
const createdSkillIds: string[] = [];
let databaseInitialized = false;

async function createJob(
  title: string,
  status: "OPEN" | "CLOSED" = "OPEN",
): Promise<Job> {
  const job = await Job.create({
    companyId: company.id,
    createdById: recruiter.id,
    title,
    description: `${title} integration-test description`,
    location: "Remote",
    status,
    experienceMin: 2,
    experienceMax: 8,
  });
  createdJobIds.push(job.id);
  return job;
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  company = await Company.create({
    name: `Profile Company ${suffix}`,
    website: "https://profile.example.com",
  });
  createdCompanyIds.push(company.id);

  recruiter = await User.create({
    email: `profile-recruiter-${suffix}@example.com`,
    passwordHash: "unused",
    name: "Profile Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(recruiter.id);

  candidate = await User.create({
    email: `profile-candidate-${suffix}@example.com`,
    passwordHash: "unused",
    name: "Profile Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidate.id);

  otherCandidate = await User.create({
    email: `profile-other-${suffix}@example.com`,
    passwordHash: "unused",
    name: "Other Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(otherCandidate.id);

  profile = await CandidateProfile.create({ userId: candidate.id });
  createdProfileIds.push(profile.id);

  otherProfile = await CandidateProfile.create({
    userId: otherCandidate.id,
    headline: "Other candidate headline",
  });
  createdProfileIds.push(otherProfile.id);

  candidateToken = tokenFor(candidate);
  otherCandidateToken = tokenFor(otherCandidate);
  recruiterToken = tokenFor(recruiter);
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  try {
    await CandidateJobRecommendation.destroy({
      where: { candidateProfileId: createdProfileIds },
    });
    await CandidateEducation.destroy({
      where: { candidateProfileId: createdProfileIds },
    });
    if (createdJobIds.length > 0) {
      const applications = await Application.findAll({
        attributes: ["id"],
        where: { jobId: createdJobIds },
      });
      await ApplicationStageHistory.destroy({
        where: { applicationId: applications.map((a) => a.id) },
      });
      await Application.destroy({ where: { jobId: createdJobIds } });
      await Job.destroy({ where: { id: createdJobIds } });
    }
    await CandidateSkill.destroy({
      where: { candidateProfileId: createdProfileIds },
    });
    if (createdSkillIds.length > 0) {
      await Skill.destroy({ where: { id: createdSkillIds } });
    }
    await CandidateProfile.destroy({ where: { id: createdProfileIds } });
    await User.destroy({ where: { id: createdUserIds } });
    await Company.destroy({ where: { id: createdCompanyIds } });
  } finally {
    await getSequelize().close();
  }
});

describe("candidate education", () => {
  it("creates, lists, updates, and removes an entry", async () => {
    const created = await request(app)
      .post("/api/candidate/education")
      .set("Cookie", cookie(candidateToken))
      .send({
        institution: "University of Lagos",
        degree: "BSc",
        fieldOfStudy: "Computer Science",
        startDate: "2014-09-01",
        endDate: "2018-06-30",
      });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      institution: "University of Lagos",
      degree: "BSc",
      fieldOfStudy: "Computer Science",
    });

    const list = await request(app)
      .get("/api/candidate/education")
      .set("Cookie", cookie(candidateToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/candidate/education/${created.body.data.id}`)
      .set("Cookie", cookie(candidateToken))
      .send({ degree: "MSc" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.degree).toBe("MSc");

    const removed = await request(app)
      .delete(`/api/candidate/education/${created.body.data.id}`)
      .set("Cookie", cookie(candidateToken));
    expect(removed.status).toBe(204);

    expect(
      await CandidateEducation.count({
        where: { candidateProfileId: profile.id },
      }),
    ).toBe(0);
  });

  it("rejects an end date before the start date", async () => {
    const res = await request(app)
      .post("/api/candidate/education")
      .set("Cookie", cookie(candidateToken))
      .send({
        institution: "Backwards University",
        startDate: "2020-01-01",
        endDate: "2018-01-01",
      });

    expect(res.status).toBe(422);
  });

  it("refuses another candidate's entry and any recruiter", async () => {
    const mine = await CandidateEducation.create({
      candidateProfileId: profile.id,
      institution: "Mine",
      startDate: "2015-01-01",
    });

    const otherCandidateAttempt = await request(app)
      .patch(`/api/candidate/education/${mine.id}`)
      .set("Cookie", cookie(otherCandidateToken))
      .send({ institution: "Hijacked" });
    expect(otherCandidateAttempt.status).toBe(404);

    const recruiterAttempt = await request(app)
      .get("/api/candidate/education")
      .set("Cookie", cookie(recruiterToken));
    expect(recruiterAttempt.status).toBe(403);

    await mine.reload();
    expect(mine.institution).toBe("Mine");
    await mine.destroy();
  });
});

describe("profile seeding from parsed resume data", () => {
  it("seeds skills once and never overwrites a later edit", async () => {
    const job = await createJob(`Seed Job ${randomUUID()}`);
    await Application.create({
      jobId: job.id,
      candidateProfileId: profile.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      parsedSkills: ["Rust", "Kubernetes"],
      parsedYearsExperience: 6,
      resumeUploadedAt: new Date(),
      aiScoringStatus: "failed",
    });

    const first = await candidateProfileSeedService.seedFromResume(profile.id);
    expect(first.seeded).toBe(true);
    expect(first.skillsAdded).toBe(2);

    const seededSkills = await CandidateSkill.findAll({
      where: { candidateProfileId: profile.id },
    });
    expect(seededSkills).toHaveLength(2);
    for (const link of seededSkills) {
      createdSkillIds.push(link.skillId);
    }

    await profile.reload();
    expect(profile.profileSeededAt).toBeInstanceOf(Date);
    const seededHeadline = profile.headline;

    // The candidate edits, then a second seed is attempted.
    await profile.update({ headline: "My own headline" });
    const second = await candidateProfileSeedService.seedFromResume(profile.id);

    expect(second.seeded).toBe(false);
    await profile.reload();
    expect(profile.headline).toBe("My own headline");
    expect(profile.headline).not.toBe(seededHeadline);
  });
});

describe("Easy Apply", () => {
  it("applies from the profile and snapshots it onto the application", async () => {
    const job = await createJob(`Easy Apply Job ${randomUUID()}`);

    const res = await request(app)
      .post("/api/candidate/easy-apply")
      .set("Cookie", cookie(candidateToken))
      .send({ jobId: job.id, coverLetter: "From my profile." });

    expect(res.status).toBe(201);

    const application = await Application.findByPk(res.body.data.id);
    expect(application).not.toBeNull();
    expect(application!.stage).toBe("APPLIED");
    // The snapshot is what the fit scorer reads and what the record keeps.
    expect(application!.resumeText).toContain("My own headline");
    expect(application!.parsedSkills).toEqual(
      expect.arrayContaining(["Rust", "Kubernetes"]),
    );

    const snapshot = application!.resumeText;

    // Editing the profile afterwards must not rewrite a submitted application.
    await profile.update({ headline: "Changed after applying" });
    await application!.reload();
    expect(application!.resumeText).toBe(snapshot);
    expect(application!.resumeText).not.toContain("Changed after applying");

    // Submission is recorded on the same path as any other application.
    const history = await ApplicationStageHistory.findAll({
      where: { applicationId: application!.id },
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromStage: null, toStage: "APPLIED" });

    const duplicate = await request(app)
      .post("/api/candidate/easy-apply")
      .set("Cookie", cookie(candidateToken))
      .send({ jobId: job.id });
    expect(duplicate.status).toBe(409);
  });

  it("blocks a candidate with nothing to submit", async () => {
    const job = await createJob(`Blocked Easy Apply ${randomUUID()}`);

    const readiness = await request(app)
      .get("/api/candidate/easy-apply/readiness")
      .set("Cookie", cookie(otherCandidateToken));
    expect(readiness.status).toBe(200);
    expect(readiness.body.data.ready).toBe(false);
    expect(readiness.body.data.missing.length).toBeGreaterThan(0);

    const attempt = await request(app)
      .post("/api/candidate/easy-apply")
      .set("Cookie", cookie(otherCandidateToken))
      .send({ jobId: job.id });

    expect(attempt.status).toBe(422);
    expect(
      await Application.count({ where: { candidateProfileId: otherProfile.id } }),
    ).toBe(0);
  });

  it("refuses a recruiter outright", async () => {
    const job = await createJob(`Recruiter Easy Apply ${randomUUID()}`);

    const res = await request(app)
      .post("/api/candidate/easy-apply")
      .set("Cookie", cookie(recruiterToken))
      .send({ jobId: job.id });

    expect(res.status).toBe(403);
  });
});

describe("candidate application timeline", () => {
  it("returns stage history and never recruiter-only fields", async () => {
    const job = await createJob(`Timeline Job ${randomUUID()}`);
    const application = await Application.create({
      jobId: job.id,
      candidateProfileId: profile.id,
      stage: "INTERVIEWING",
      submittedAt: new Date("2026-07-20T09:00:00.000Z"),
      fitScore: 91,
      aiSummary: "Recruiter-only summary that must not leak.",
      aiStrengths: ["Recruiter-only strength"],
      recruiterNotes: "Recruiter-only note that must not leak.",
      aiScoringStatus: "completed",
    });
    await ApplicationStageHistory.bulkCreate([
      {
        applicationId: application.id,
        fromStage: null,
        toStage: "APPLIED",
        changedAt: new Date("2026-07-20T09:00:00.000Z"),
      },
      {
        applicationId: application.id,
        fromStage: "APPLIED",
        toStage: "INTERVIEWING",
        changedAt: new Date("2026-07-22T09:00:00.000Z"),
      },
    ]);

    const res = await request(app)
      .get(`/api/applications/${application.id}/timeline`)
      .set("Cookie", cookie(candidateToken));

    expect(res.status).toBe(200);
    expect(res.body.data.entries).toHaveLength(2);
    expect(res.body.data.entries[0]).toMatchObject({
      fromStage: null,
      toStage: "APPLIED",
    });
    expect(res.body.data.hasCompleteHistory).toBe(true);

    const serialized = JSON.stringify(res.body.data);
    expect(serialized).not.toContain("Recruiter-only summary");
    expect(serialized).not.toContain("Recruiter-only note");
    expect(serialized).not.toContain("Recruiter-only strength");
    expect(res.body.data).not.toHaveProperty("fitScore");
    expect(res.body.data).not.toHaveProperty("recruiterNotes");
    // Which recruiter moved the card is internal.
    expect(serialized).not.toContain("changedBy");
  });

  it("flags an application whose history predates this phase", async () => {
    const job = await createJob(`Legacy Timeline ${randomUUID()}`);
    const application = await Application.create({
      jobId: job.id,
      candidateProfileId: profile.id,
      stage: "OFFER",
      submittedAt: new Date("2026-06-01T09:00:00.000Z"),
      aiScoringStatus: "failed",
    });
    await ApplicationStageHistory.create({
      applicationId: application.id,
      fromStage: null,
      toStage: "APPLIED",
      changedAt: new Date("2026-06-01T09:00:00.000Z"),
    });

    const res = await request(app)
      .get(`/api/applications/${application.id}/timeline`)
      .set("Cookie", cookie(candidateToken));

    expect(res.status).toBe(200);
    // Current stage is still reported so the UI does not look stalled.
    expect(res.body.data.currentStage).toBe("OFFER");
    expect(res.body.data.hasCompleteHistory).toBe(false);
  });

  it("hides another candidate's timeline and refuses recruiters", async () => {
    const job = await createJob(`Private Timeline ${randomUUID()}`);
    const application = await Application.create({
      jobId: job.id,
      candidateProfileId: profile.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      aiScoringStatus: "failed",
    });

    const otherAttempt = await request(app)
      .get(`/api/applications/${application.id}/timeline`)
      .set("Cookie", cookie(otherCandidateToken));
    expect(otherAttempt.status).toBe(404);

    const recruiterAttempt = await request(app)
      .get(`/api/applications/${application.id}/timeline`)
      .set("Cookie", cookie(recruiterToken));
    expect(recruiterAttempt.status).toBe(403);
  });
});

describe("job recommendations", () => {
  it("excludes applied-to and closed jobs, and re-checks at serve time", async () => {
    const openJob = await createJob(`Recommendable ${randomUUID()}`);
    const closedJob = await createJob(`Closed Job ${randomUUID()}`, "CLOSED");
    const appliedJob = await createJob(`Applied Job ${randomUUID()}`);

    await Application.create({
      jobId: appliedJob.id,
      candidateProfileId: profile.id,
      stage: "APPLIED",
      submittedAt: new Date(),
      aiScoringStatus: "failed",
    });

    const result = await computeCandidateRecommendations(profile.id);
    expect(result.status).toBe("completed");

    const cachedJobIds = (
      await CandidateJobRecommendation.findAll({
        where: { candidateProfileId: profile.id },
      })
    ).map((row) => row.jobId);

    expect(cachedJobIds).toContain(openJob.id);
    expect(cachedJobIds).not.toContain(closedJob.id);
    expect(cachedJobIds).not.toContain(appliedJob.id);

    const served = await request(app)
      .get("/api/candidate/recommendations")
      .set("Cookie", cookie(candidateToken));

    expect(served.status).toBe(200);
    expect(served.body.data.status).toBe("ready");
    const servedIds = served.body.data.recommendations.map(
      (item: { jobId: string }) => item.jobId,
    );
    expect(servedIds).toContain(openJob.id);

    // A job closing after it was scored must drop out without a recompute.
    await openJob.update({ status: "CLOSED" });
    const afterClose = await request(app)
      .get("/api/candidate/recommendations")
      .set("Cookie", cookie(candidateToken));
    expect(
      afterClose.body.data.recommendations.map(
        (item: { jobId: string }) => item.jobId,
      ),
    ).not.toContain(openJob.id);
  });

  it("reports a sparse profile instead of a meaningless score", async () => {
    const res = await request(app)
      .get("/api/candidate/recommendations")
      .set("Cookie", cookie(otherCandidateToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("insufficient-profile");
    expect(res.body.data.recommendations).toEqual([]);
  });

  it("refuses a recruiter", async () => {
    const res = await request(app)
      .get("/api/candidate/recommendations")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(403);
  });
});
