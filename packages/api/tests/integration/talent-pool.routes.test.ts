import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  closeRealtime,
  subscribeRealtime,
  type RealtimeMessage,
} from "@starter-kit/shared/realtime";
import {
  Application,
  CandidatePoolEntry,
  CandidatePoolTag,
  CandidateProfile,
  CandidateSkill,
  CandidateTag,
  Company,
  InterviewScorecard,
  Job,
  Notification,
  ScorecardCriterion,
  ScorecardRating,
  ScorecardTemplate,
  Skill,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { closeRealtimeClients } from "../../src/services/realtime.service";

function cookie(token: string): string[] {
  return ["accessToken=" + token];
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
let otherCompany: Company;
let recruiter: User;
let otherRecruiter: User;
let candidate: User;
let secondCandidate: User;
let neverAppliedCandidate: User;
let profile: CandidateProfile;
let secondProfile: CandidateProfile;
let neverAppliedProfile: CandidateProfile;
let firstApplication: Application;
let inviteJob: Job;
let closedJob: Job;
let otherCompanyJob: Job;
let skill: Skill;
let recruiterToken: string;
let otherRecruiterToken: string;
let candidateToken: string;
let databaseInitialized = false;

const companyIds: string[] = [];
const userIds: string[] = [];
const profileIds: string[] = [];
const jobIds: string[] = [];
const applicationIds: string[] = [];
const templateIds: string[] = [];

async function createJob(
  owner: Company,
  creator: User,
  title: string,
  status: "OPEN" | "CLOSED" = "OPEN",
): Promise<Job> {
  const job = await Job.create({
    companyId: owner.id,
    createdById: creator.id,
    title,
    description: title + " description",
    status,
    location: "Remote",
  });
  jobIds.push(job.id);
  return job;
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;
  const suffix = randomUUID();

  company = await Company.create({
    name: "Talent Pool Company " + suffix,
    website: "https://talent-pool.example.com",
  });
  otherCompany = await Company.create({
    name: "Other Talent Pool Company " + suffix,
    website: "https://other-talent-pool.example.com",
  });
  companyIds.push(company.id, otherCompany.id);

  recruiter = await User.create({
    email: "talent-recruiter-" + suffix + "@example.com",
    passwordHash: "unused",
    name: "Talent Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  otherRecruiter = await User.create({
    email: "talent-other-recruiter-" + suffix + "@example.com",
    passwordHash: "unused",
    name: "Other Talent Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  candidate = await User.create({
    email: "talent-candidate-" + suffix + "@example.com",
    passwordHash: "unused",
    name: "Amara Talent",
    role: "CANDIDATE",
  });
  secondCandidate = await User.create({
    email: "talent-second-" + suffix + "@example.com",
    passwordHash: "unused",
    name: "Second Talent",
    role: "CANDIDATE",
  });
  neverAppliedCandidate = await User.create({
    email: "talent-never-" + suffix + "@example.com",
    passwordHash: "unused",
    name: "Never Applied",
    role: "CANDIDATE",
  });
  userIds.push(
    recruiter.id,
    otherRecruiter.id,
    candidate.id,
    secondCandidate.id,
    neverAppliedCandidate.id,
  );

  profile = await CandidateProfile.create({
    userId: candidate.id,
    headline: "Platform engineer",
    location: "Lagos",
  });
  secondProfile = await CandidateProfile.create({
    userId: secondCandidate.id,
    headline: "Product engineer",
  });
  neverAppliedProfile = await CandidateProfile.create({
    userId: neverAppliedCandidate.id,
  });
  profileIds.push(profile.id, secondProfile.id, neverAppliedProfile.id);

  skill = await Skill.create({ name: "TalentSkill-" + suffix });
  await CandidateSkill.create({
    candidateProfileId: profile.id,
    skillId: skill.id,
  });

  const firstJob = await createJob(company, recruiter, "First prior role");
  const secondJob = await createJob(company, recruiter, "Second prior role");
  const secondCandidateJob = await createJob(
    company,
    recruiter,
    "Second candidate role",
  );
  inviteJob = await createJob(company, recruiter, "Invited opening");
  closedJob = await createJob(
    company,
    recruiter,
    "Closed opening",
    "CLOSED",
  );
  otherCompanyJob = await createJob(
    otherCompany,
    otherRecruiter,
    "Other company role",
  );

  firstApplication = await Application.create({
    jobId: firstJob.id,
    candidateProfileId: profile.id,
    stage: "REJECTED",
    submittedAt: new Date("2026-07-01T09:00:00.000Z"),
    fitScore: 88,
    aiScoringStatus: "completed",
  });
  const secondApplication = await Application.create({
    jobId: secondJob.id,
    candidateProfileId: profile.id,
    stage: "APPLIED",
    submittedAt: new Date("2026-07-02T09:00:00.000Z"),
    fitScore: 62,
    aiScoringStatus: "completed",
  });
  const otherCandidateApplication = await Application.create({
    jobId: secondCandidateJob.id,
    candidateProfileId: secondProfile.id,
    stage: "APPLIED",
    submittedAt: new Date("2026-07-03T09:00:00.000Z"),
    aiScoringStatus: "failed",
  });
  const otherCompanyApplication = await Application.create({
    jobId: otherCompanyJob.id,
    candidateProfileId: profile.id,
    stage: "APPLIED",
    submittedAt: new Date("2026-07-04T09:00:00.000Z"),
    aiScoringStatus: "failed",
  });
  applicationIds.push(
    firstApplication.id,
    secondApplication.id,
    otherCandidateApplication.id,
    otherCompanyApplication.id,
  );

  const template = await ScorecardTemplate.create({
    companyId: company.id,
    title: "Talent pool scorecard",
    createdBy: recruiter.id,
  });
  templateIds.push(template.id);
  const criterion = await ScorecardCriterion.create({
    templateId: template.id,
    label: "Technical depth",
    sortOrder: 0,
  });
  const scorecard = await InterviewScorecard.create({
    applicationId: firstApplication.id,
    templateId: template.id,
    interviewerId: recruiter.id,
  });
  await ScorecardRating.create({
    scorecardId: scorecard.id,
    criterionId: criterion.id,
    rating: 4,
  });

  recruiterToken = tokenFor(recruiter);
  otherRecruiterToken = tokenFor(otherRecruiter);
  candidateToken = tokenFor(candidate);
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }
  try {
    await Notification.destroy({ where: { userId: userIds } });
    const poolEntries = await CandidatePoolEntry.findAll({
      attributes: ["id"],
      where: { companyId: companyIds },
    });
    await CandidatePoolTag.destroy({
      where: { poolEntryId: poolEntries.map((entry) => entry.id) },
    });
    await CandidatePoolEntry.destroy({ where: { companyId: companyIds } });
    await CandidateTag.destroy({ where: { companyId: companyIds } });
    const scorecards = await InterviewScorecard.findAll({
      attributes: ["id"],
      where: { applicationId: applicationIds },
    });
    await ScorecardRating.destroy({
      where: { scorecardId: scorecards.map((row) => row.id) },
    });
    await InterviewScorecard.destroy({
      where: { applicationId: applicationIds },
    });
    await ScorecardCriterion.destroy({ where: { templateId: templateIds } });
    await ScorecardTemplate.destroy({ where: { id: templateIds } });
    await Application.destroy({ where: { id: applicationIds } });
    await CandidateSkill.destroy({ where: { candidateProfileId: profileIds } });
    await Skill.destroy({ where: { id: skill.id } });
    await Job.destroy({ where: { id: jobIds } });
    await CandidateProfile.destroy({ where: { id: profileIds } });
    await User.destroy({ where: { id: userIds } });
    await Company.destroy({ where: { id: companyIds } });
  } finally {
    closeRealtimeClients();
    await closeRealtime();
    await getSequelize().close();
  }
});

describe("GET /api/recruiter/candidates", () => {
  it("lists every prior company candidate with history and supports filters", async () => {
    const all = await request(app)
      .get("/api/recruiter/candidates")
      .set("Cookie", cookie(recruiterToken));

    expect(all.status).toBe(200);
    expect(all.body.data.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([profile.id, secondProfile.id]),
    );
    const amara = all.body.data.find(
      (item: { id: string }) => item.id === profile.id,
    );
    expect(amara.applicationInsights).toHaveLength(2);
    expect(amara.metrics).toMatchObject({
      applicationCount: 2,
      bestFitScore: 88,
      scorecardAverage: 4,
    });

    const bySkill = await request(app)
      .get("/api/recruiter/candidates")
      .query({ skill: skill.name })
      .set("Cookie", cookie(recruiterToken));
    expect(bySkill.body.data.map((item: { id: string }) => item.id)).toEqual([
      profile.id,
    ]);

    const byFit = await request(app)
      .get("/api/recruiter/candidates")
      .query({ minFitScore: 80, maxFitScore: 90 })
      .set("Cookie", cookie(recruiterToken));
    expect(byFit.body.data.map((item: { id: string }) => item.id)).toEqual([
      profile.id,
    ]);

    const byScorecard = await request(app)
      .get("/api/recruiter/candidates")
      .query({ minScorecardAverage: 3.5 })
      .set("Cookie", cookie(recruiterToken));
    expect(
      byScorecard.body.data.map((item: { id: string }) => item.id),
    ).toEqual([profile.id]);
  });

  it("requires a recruiter and never exposes another company's pool metadata", async () => {
    const candidateAttempt = await request(app)
      .get("/api/recruiter/candidates")
      .set("Cookie", cookie(candidateToken));
    expect(candidateAttempt.status).toBe(403);

    const otherCompanyView = await request(app)
      .get("/api/recruiter/candidates/" + profile.id)
      .set("Cookie", cookie(otherRecruiterToken));
    expect(otherCompanyView.status).toBe(200);
    expect(otherCompanyView.body.data.applicationInsights).toHaveLength(1);
    expect(otherCompanyView.body.data.poolEntry).toBeNull();
  });
});

describe("company tags and pool membership", () => {
  let keepTagId: string;
  let deleteTagId: string;

  it("creates tags and idempotently adds a prior applicant with notes", async () => {
    const keepTag = await request(app)
      .post("/api/recruiter/tags")
      .set("Cookie", cookie(recruiterToken))
      .send({ label: "Revisit for senior roles" });
    const deleteTag = await request(app)
      .post("/api/recruiter/tags")
      .set("Cookie", cookie(recruiterToken))
      .send({ label: "Temporary tag" });
    expect(keepTag.status).toBe(201);
    keepTagId = keepTag.body.data.id;
    deleteTagId = deleteTag.body.data.id;

    const first = await request(app)
      .post("/api/recruiter/candidates/" + profile.id + "/pool")
      .set("Cookie", cookie(recruiterToken))
      .send({
        notes: "Strong systems background.",
        tagIds: [keepTagId, deleteTagId],
      });
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/recruiter/candidates/" + profile.id + "/pool")
      .set("Cookie", cookie(recruiterToken))
      .send({ notes: "Updated without a duplicate row." });
    expect(duplicate.status).toBe(200);
    expect(
      await CandidatePoolEntry.count({
        where: { companyId: company.id, candidateId: profile.id },
      }),
    ).toBe(1);

    const byTag = await request(app)
      .get("/api/recruiter/candidates")
      .query({ tagId: keepTagId })
      .set("Cookie", cookie(recruiterToken));
    expect(byTag.body.data.map((item: { id: string }) => item.id)).toEqual([
      profile.id,
    ]);
  });

  it("cascades a deleted tag while preserving the entry and its other tags", async () => {
    const removed = await request(app)
      .delete("/api/recruiter/tags/" + deleteTagId)
      .set("Cookie", cookie(recruiterToken));
    expect(removed.status).toBe(204);

    const detail = await request(app)
      .get("/api/recruiter/candidates/" + profile.id)
      .set("Cookie", cookie(recruiterToken));
    expect(detail.body.data.poolEntry.tags).toEqual([
      expect.objectContaining({ id: keepTagId }),
    ]);
  });

  it("rejects never-applied candidates and hides company-owned tags from outsiders", async () => {
    const neverApplied = await request(app)
      .post("/api/recruiter/candidates/" + neverAppliedProfile.id + "/pool")
      .set("Cookie", cookie(recruiterToken))
      .send({});
    expect(neverApplied.status).toBe(422);
    expect(neverApplied.body.error).toMatch(/never applied/i);

    const outsiderDelete = await request(app)
      .delete("/api/recruiter/tags/" + keepTagId)
      .set("Cookie", cookie(otherRecruiterToken));
    expect(outsiderDelete.status).toBe(404);
    expect(await CandidateTag.findByPk(keepTagId)).not.toBeNull();
  });

  it("degrades cleanly when a pooled candidate account is deleted", async () => {
    const suffix = randomUUID();
    const deletedCandidate = await User.create({
      email: "deleted-pooled-" + suffix + "@example.com",
      passwordHash: "unused",
      name: "Deleted Pooled Candidate",
      role: "CANDIDATE",
    });
    const deletedProfile = await CandidateProfile.create({
      userId: deletedCandidate.id,
    });
    const deletedApplication = await Application.create({
      jobId: closedJob.id,
      candidateProfileId: deletedProfile.id,
      stage: "REJECTED",
      submittedAt: new Date(),
      aiScoringStatus: "failed",
    });

    const pooled = await request(app)
      .post("/api/recruiter/candidates/" + deletedProfile.id + "/pool")
      .set("Cookie", cookie(recruiterToken))
      .send({ notes: "Safe to cascade." });
    expect(pooled.status).toBe(201);

    await deletedCandidate.destroy();
    expect(await CandidateProfile.findByPk(deletedProfile.id)).toBeNull();
    expect(
      await CandidatePoolEntry.count({
        where: { companyId: company.id, candidateId: deletedProfile.id },
      }),
    ).toBe(0);

    const list = await request(app)
      .get("/api/recruiter/candidates")
      .set("Cookie", cookie(recruiterToken));
    expect(list.status).toBe(200);
    expect(
      list.body.data.some(
        (item: { id: string }) => item.id === deletedProfile.id,
      ),
    ).toBe(false);

    // The account cascade already removed all three rows; these references
    // simply document what the test intentionally exercised.
    expect(await Application.findByPk(deletedApplication.id)).toBeNull();
  });
});

describe("POST /api/recruiter/candidates/:candidateId/invite", () => {
  it("creates a real candidate notification and no application", async () => {
    const messages: RealtimeMessage[] = [];
    const unsubscribe = subscribeRealtime((message) => {
      if (
        message.event.name === "notification" &&
        message.event.payload.relatedJobId === inviteJob.id
      ) {
        messages.push(message);
      }
    });
    const before = await Application.count({
      where: { jobId: inviteJob.id, candidateProfileId: profile.id },
    });
    const invited = await request(app)
      .post("/api/recruiter/candidates/" + profile.id + "/invite")
      .set("Cookie", cookie(recruiterToken))
      .send({ jobId: inviteJob.id });
    await new Promise((resolve) => setTimeout(resolve, 300));
    unsubscribe();

    expect(invited.status).toBe(201);
    expect(invited.body.data).toMatchObject({
      type: "invite_to_apply",
      relatedApplicationId: null,
      relatedJobId: inviteJob.id,
    });
    expect(
      await Notification.count({
        where: {
          userId: candidate.id,
          type: "invite_to_apply",
          relatedJobId: inviteJob.id,
        },
      }),
    ).toBe(1);
    expect(
      await Application.count({
        where: { jobId: inviteJob.id, candidateProfileId: profile.id },
      }),
    ).toBe(before);
    expect(messages).toHaveLength(1);
    expect(messages[0].userIds).toEqual([candidate.id]);
    expect(messages[0].event.payload).toMatchObject({
      type: "invite_to_apply",
      relatedJobId: inviteJob.id,
    });
  });

  it("clearly rejects a job that closed or belongs to another company", async () => {
    const closed = await request(app)
      .post("/api/recruiter/candidates/" + profile.id + "/invite")
      .set("Cookie", cookie(recruiterToken))
      .send({ jobId: closedJob.id });
    expect(closed.status).toBe(409);
    expect(closed.body.error).toMatch(/no longer open/i);

    const otherCompany = await request(app)
      .post("/api/recruiter/candidates/" + profile.id + "/invite")
      .set("Cookie", cookie(recruiterToken))
      .send({ jobId: otherCompanyJob.id });
    expect(otherCompany.status).toBe(404);
  });
});
