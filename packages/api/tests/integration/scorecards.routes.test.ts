import { randomUUID } from "crypto";
import request from "supertest";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  getSequelize,
  Application,
  CandidateProfile,
  Company,
  InterviewScorecard,
  Job,
  ScorecardCriterion,
  ScorecardRating,
  ScorecardTemplate,
  User,
} from "@starter-kit/shared/db";

/**
 * Scorecards end to end against a real database.
 *
 * The averages are the point of the feature, so they are asserted against
 * rows actually written by the endpoints rather than against fixtures — a
 * miscounted resubmission or a double-counted criterion has to show up here
 * as a wrong number.
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

const suffix = randomUUID().slice(0, 8);

let company: Company;
let otherCompany: Company;
let recruiterA: User;
let recruiterB: User;
let outsider: User;
let candidateUser: User;
let candidateProfile: CandidateProfile;
let unscoredCandidateUser: User;
let unscoredProfile: CandidateProfile;
let job: Job;
let application: Application;
let tokenA: string;
let tokenB: string;
let outsiderToken: string;

let templateId: string;
let criteria: { id: string; label: string }[] = [];

beforeAll(async () => {
  await initializeDatabase();

  company = await Company.create({ name: `Scorecard Co ${suffix}` });
  otherCompany = await Company.create({ name: `Rival Co ${suffix}` });

  recruiterA = await User.create({
    email: `sc-recruiter-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter A",
    role: "RECRUITER",
    companyId: company.id,
  });
  recruiterB = await User.create({
    email: `sc-recruiter-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter B",
    role: "RECRUITER",
    companyId: company.id,
  });
  outsider = await User.create({
    email: `sc-outsider-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Rival Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  candidateUser = await User.create({
    email: `sc-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Scorecard Candidate",
    role: "CANDIDATE",
  });

  candidateProfile = await CandidateProfile.create({
    userId: candidateUser.id,
    headline: "Engineer",
  });

  // A candidate may only apply to a job once, so the "nobody has scored this
  // one" case needs its own applicant rather than a second application from
  // the candidate above.
  unscoredCandidateUser = await User.create({
    email: `sc-candidate-2-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Unscored Candidate",
    role: "CANDIDATE",
  });
  unscoredProfile = await CandidateProfile.create({
    userId: unscoredCandidateUser.id,
    headline: "Engineer",
  });

  job = await Job.create({
    companyId: company.id,
    createdById: recruiterA.id,
    title: `Scorecard Engineer ${suffix}`,
    description: "Role used by the scorecard integration tests.",
    location: "Remote",
    employmentType: "FULL_TIME",
    status: "OPEN",
  });

  application = await Application.create({
    jobId: job.id,
    candidateProfileId: candidateProfile.id,
    stage: "INTERVIEWING",
    submittedAt: new Date(),
  });

  tokenA = tokenFor(recruiterA);
  tokenB = tokenFor(recruiterB);
  outsiderToken = tokenFor(outsider);
});

afterAll(async () => {
  await ScorecardRating.destroy({ where: {}, truncate: true, cascade: true });
  await InterviewScorecard.destroy({ where: { applicationId: application.id } });
  await ScorecardCriterion.destroy({ where: { templateId } });
  await ScorecardTemplate.destroy({ where: { companyId: company.id } });
  await ScorecardTemplate.destroy({ where: { companyId: otherCompany.id } });
  await Application.destroy({ where: { id: application.id } });
  await Job.destroy({ where: { id: job.id } });
  await CandidateProfile.destroy({
    where: { id: [candidateProfile.id, unscoredProfile.id] },
  });
  await User.destroy({
    where: {
      id: [
        recruiterA.id,
        recruiterB.id,
        outsider.id,
        candidateUser.id,
        unscoredCandidateUser.id,
      ],
    },
  });
  await Company.destroy({ where: { id: [company.id, otherCompany.id] } });

  await getSequelize().close();
});

// ─── Templates ────────────────────────────────────────────────────────────────

describe("scorecard templates", () => {
  it("reports no templates yet, and offers a starter set rather than inventing one", async () => {
    const res = await request(app)
      .get("/api/scorecard-templates")
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.data.templates).toEqual([]);
    expect(res.body.data.starterCriteria).toHaveLength(3);

    // The suggestion must not have been written to the company on read.
    expect(await ScorecardTemplate.count({ where: { companyId: company.id } })).toBe(
      0,
    );
  });

  it("creates a template with ordered criteria", async () => {
    const res = await request(app)
      .post("/api/scorecard-templates")
      .set("Cookie", cookie(tokenA))
      .send({
        title: "Engineering loop",
        criteria: [
          { label: "Technical", description: "Depth in the craft" },
          { label: "Communication" },
          { label: "Culture fit" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Engineering loop");
    expect(res.body.data.criteria.map((c: { label: string }) => c.label)).toEqual([
      "Technical",
      "Communication",
      "Culture fit",
    ]);
    expect(res.body.data.criteria[0].sortOrder).toBe(0);
    expect(res.body.data.criteria[2].sortOrder).toBe(2);

    templateId = res.body.data.id;
    criteria = res.body.data.criteria;
  });

  it("rejects a template with no criteria", async () => {
    const res = await request(app)
      .post("/api/scorecard-templates")
      .set("Cookie", cookie(tokenA))
      .send({ title: "Empty", criteria: [] });

    expect(res.status).toBe(422);
  });

  it("hides another company's template behind a 404", async () => {
    const rival = await ScorecardTemplate.create({
      companyId: otherCompany.id,
      createdBy: outsider.id,
      title: "Rival loop",
    });

    const res = await request(app)
      .put(`/api/scorecard-templates/${rival.id}`)
      .set("Cookie", cookie(tokenA))
      .send({ title: "Hijacked", criteria: [{ label: "Mine now" }] });

    expect(res.status).toBe(404);
    await rival.reload();
    expect(rival.title).toBe("Rival loop");
  });

  it("does not list another company's templates", async () => {
    const res = await request(app)
      .get("/api/scorecard-templates")
      .set("Cookie", cookie(outsiderToken));

    expect(res.status).toBe(200);
    expect(
      res.body.data.templates.some(
        (template: { id: string }) => template.id === templateId,
      ),
    ).toBe(false);
  });

  it("reorders and renames criteria while keeping their ids", async () => {
    const reversed = [...criteria].reverse();

    const res = await request(app)
      .put(`/api/scorecard-templates/${templateId}`)
      .set("Cookie", cookie(tokenA))
      .send({
        title: "Engineering loop v2",
        criteria: reversed.map((criterion) => ({
          id: criterion.id,
          label: criterion.label,
        })),
      });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("Engineering loop v2");
    expect(res.body.data.criteria.map((c: { id: string }) => c.id)).toEqual(
      reversed.map((criterion) => criterion.id),
    );
  });

  it("refuses a criterion id belonging to another template", async () => {
    const res = await request(app)
      .put(`/api/scorecard-templates/${templateId}`)
      .set("Cookie", cookie(tokenA))
      .send({
        title: "Engineering loop v2",
        criteria: [{ id: randomUUID(), label: "Smuggled" }],
      });

    expect(res.status).toBe(422);
  });
});

// ─── Submitting and aggregating ───────────────────────────────────────────────

describe("submitting scorecards", () => {
  it("returns an empty aggregate before anyone has scored, with no zero average", async () => {
    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      scorecardCount: 0,
      overallAverage: null,
      criteriaAverages: [],
      scorecards: [],
    });
  });

  it("accepts the first recruiter's scorecard", async () => {
    const res = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenA))
      .send({
        templateId,
        overallComment: "Strong hire.",
        ratings: [
          { criterionId: criteria[0].id, rating: 4, comment: "Solid depth" },
          { criterionId: criteria[1].id, rating: 5 },
          { criterionId: criteria[2].id, rating: 3 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.interviewerName).toBe("Recruiter A");
    expect(res.body.data.averageRating).toBe(4);
    expect(res.body.data.ratings).toHaveLength(3);
  });

  it("averages a single submission to that submission", async () => {
    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(tokenA));

    expect(res.body.data.scorecardCount).toBe(1);
    expect(res.body.data.overallAverage).toBe(4); // (4 + 5 + 3) / 3
    expect(res.body.data.criteriaAverages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ criterionLabel: "Technical", averageRating: 4 }),
        expect.objectContaining({
          criterionLabel: "Communication",
          averageRating: 5,
        }),
      ]),
    );
  });

  it("aggregates a second recruiter's scorecard alongside the first", async () => {
    const submit = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenB))
      .send({
        templateId,
        ratings: [
          { criterionId: criteria[0].id, rating: 2 },
          { criterionId: criteria[1].id, rating: 3 },
          { criterionId: criteria[2].id, rating: 1 },
        ],
      });

    expect(submit.status).toBe(200);

    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(tokenA));

    expect(res.body.data.scorecardCount).toBe(2);
    // (4+5+3 + 2+3+1) / 6 = 3
    expect(res.body.data.overallAverage).toBe(3);
    expect(
      res.body.data.scorecards.map((s: { interviewerName: string }) => s.interviewerName),
    ).toEqual(["Recruiter A", "Recruiter B"]);

    const technical = res.body.data.criteriaAverages.find(
      (c: { criterionLabel: string }) => c.criterionLabel === "Technical",
    );
    expect(technical).toMatchObject({ averageRating: 3, ratingCount: 2 });
  });

  it("overwrites a resubmission instead of counting it twice", async () => {
    const before = await InterviewScorecard.count({
      where: { applicationId: application.id },
    });
    expect(before).toBe(2);

    await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenA))
      .send({
        templateId,
        overallComment: "Revised after the debrief.",
        ratings: [
          { criterionId: criteria[0].id, rating: 1 },
          { criterionId: criteria[1].id, rating: 1 },
          { criterionId: criteria[2].id, rating: 1 },
        ],
      });

    const after = await InterviewScorecard.count({
      where: { applicationId: application.id },
    });
    expect(after).toBe(2);

    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(tokenA));

    expect(res.body.data.scorecardCount).toBe(2);
    // (1+1+1 + 2+3+1) / 6 = 1.5 — the old 4/5/3 is gone, not averaged in.
    expect(res.body.data.overallAverage).toBe(1.5);

    const mine = res.body.data.scorecards.find(
      (s: { interviewerId: string }) => s.interviewerId === recruiterA.id,
    );
    expect(mine.overallComment).toBe("Revised after the debrief.");
    expect(mine.ratings).toHaveLength(3);

    // Stale ratings must not linger behind the replaced scorecard.
    const ratingRows = await ScorecardRating.count({
      where: { scorecardId: mine.id },
    });
    expect(ratingRows).toBe(3);
  });

  it("rejects a rating for a criterion outside the template", async () => {
    const res = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenA))
      .send({
        templateId,
        ratings: [{ criterionId: randomUUID(), rating: 3 }],
      });

    expect(res.status).toBe(422);
  });

  it("rejects a rating outside the 1-5 scale", async () => {
    const res = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenA))
      .send({
        templateId,
        ratings: [{ criterionId: criteria[0].id, rating: 6 }],
      });

    expect(res.status).toBe(422);
  });

  it("rejects the same criterion scored twice in one submission", async () => {
    const res = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(tokenA))
      .send({
        templateId,
        ratings: [
          { criterionId: criteria[0].id, rating: 3 },
          { criterionId: criteria[0].id, rating: 5 },
        ],
      });

    expect(res.status).toBe(422);
  });
});

// ─── Cross-company access ─────────────────────────────────────────────────────

describe("cross-company access", () => {
  it("refuses to show another company's scorecards", async () => {
    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(outsiderToken));

    expect(res.status).toBe(404);
  });

  it("refuses to accept a scorecard from another company's recruiter", async () => {
    const res = await request(app)
      .put(`/api/applications/${application.id}/scorecard`)
      .set("Cookie", cookie(outsiderToken))
      .send({
        templateId,
        ratings: [{ criterionId: criteria[0].id, rating: 5 }],
      });

    expect(res.status).toBe(404);
    expect(
      await InterviewScorecard.count({
        where: { applicationId: application.id, interviewerId: outsider.id },
      }),
    ).toBe(0);
  });

  it("refuses a candidate outright", async () => {
    const res = await request(app)
      .get(`/api/applications/${application.id}/scorecards`)
      .set("Cookie", cookie(tokenFor(candidateUser)));

    expect(res.status).toBe(403);
  });
});

// ─── Protecting submitted history ─────────────────────────────────────────────

describe("editing a template that has been scored against", () => {
  it("blocks removing a criterion that already has ratings", async () => {
    const res = await request(app)
      .put(`/api/scorecard-templates/${templateId}`)
      .set("Cookie", cookie(tokenA))
      .send({
        title: "Engineering loop v3",
        criteria: [
          { id: criteria[0].id, label: "Technical" },
          { id: criteria[1].id, label: "Communication" },
        ],
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("Culture fit");

    // Refused as a whole: the title must not have changed either.
    const template = await ScorecardTemplate.findByPk(templateId);
    expect(template!.title).not.toBe("Engineering loop v3");
    expect(await ScorecardCriterion.count({ where: { templateId } })).toBe(3);
  });

  it("still allows adding a criterion alongside the scored ones", async () => {
    const res = await request(app)
      .put(`/api/scorecard-templates/${templateId}`)
      .set("Cookie", cookie(tokenA))
      .send({
        title: "Engineering loop v3",
        criteria: [
          ...criteria.map((criterion) => ({
            id: criterion.id,
            label: criterion.label,
          })),
          { label: "Ownership" },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.criteria).toHaveLength(4);
    expect(res.body.data.criteria[3].label).toBe("Ownership");
  });

  it("blocks deleting a template that has submitted scorecards", async () => {
    const res = await request(app)
      .delete(`/api/scorecard-templates/${templateId}`)
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(409);
    expect(await ScorecardTemplate.findByPk(templateId)).not.toBeNull();
  });
});

// ─── Pipeline badge data ──────────────────────────────────────────────────────

describe("pipeline summary", () => {
  it("carries the aggregate onto each application in the job's pipeline", async () => {
    const res = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(tokenA));

    expect(res.status).toBe(200);
    const card = res.body.data.find(
      (item: { id: string }) => item.id === application.id,
    );

    expect(card.scorecardSummary).toEqual({
      scorecardCount: 2,
      averageRating: 1.5,
    });
  });

  it("reports an unscored application as zero submissions and no average", async () => {
    const fresh = await Application.create({
      jobId: job.id,
      candidateProfileId: unscoredProfile.id,
      stage: "APPLIED",
      submittedAt: new Date(),
    });

    const res = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(tokenA));

    const card = res.body.data.find(
      (item: { id: string }) => item.id === fresh.id,
    );
    expect(card.scorecardSummary).toEqual({
      scorecardCount: 0,
      averageRating: null,
    });

    await fresh.destroy();
  });
});
