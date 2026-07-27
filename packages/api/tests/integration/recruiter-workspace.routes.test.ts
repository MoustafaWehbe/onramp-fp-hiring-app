import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  InterviewAssignment,
  Job,
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

const companyIds: string[] = [];
const userIds: string[] = [];
const profileIds: string[] = [];
const jobIds: string[] = [];
const applicationIds: string[] = [];
const assignmentIds: string[] = [];

let companyA: Company;
let companyB: Company;
let recruiterA: User;
let recruiterB: User;
let recruiterWithoutCompany: User;
let interviewerA: User;
let interviewerB: User;
let candidateUser: User;
let candidateProfile: CandidateProfile;
let secondCandidateUser: User;
let secondCandidateProfile: CandidateProfile;
let openJobA: Job;
let closedJobA: Job;
let openJobB: Job;
let interviewingApplication: Application;
let offerApplication: Application;
let otherCompanyApplication: Application;
let recruiterAToken: string;
let recruiterBToken: string;
let recruiterWithoutCompanyToken: string;
let interviewerAToken: string;
let candidateToken: string;
let databaseInitialized = false;

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();
  companyA = await Company.create({
    name: `Workspace Company A ${suffix}`,
    industry: "Software",
    size: "51-200 employees",
    location: "Remote",
    contact: `a-${suffix}@example.com`,
  });
  companyB = await Company.create({
    name: `Workspace Company B ${suffix}`,
    industry: "Fintech",
    size: "11-50 employees",
    location: "Lagos",
    contact: `b-${suffix}@example.com`,
  });
  companyIds.push(companyA.id, companyB.id);

  recruiterA = await User.create({
    email: `workspace-recruiter-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter A",
    role: "RECRUITER",
    companyId: companyA.id,
  });
  recruiterB = await User.create({
    email: `workspace-recruiter-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter B",
    role: "RECRUITER",
    companyId: companyB.id,
  });
  recruiterWithoutCompany = await User.create({
    email: `workspace-recruiter-none-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Recruiter Without Company",
    role: "RECRUITER",
  });
  interviewerA = await User.create({
    email: `workspace-interviewer-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Interviewer A",
    role: "INTERVIEWER",
    companyId: companyA.id,
  });
  interviewerB = await User.create({
    email: `workspace-interviewer-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Interviewer B",
    role: "INTERVIEWER",
    companyId: companyB.id,
  });
  candidateUser = await User.create({
    email: `workspace-candidate-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Amara Workspace",
    role: "CANDIDATE",
  });
  secondCandidateUser = await User.create({
    email: `workspace-candidate-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Second Workspace Candidate",
    role: "CANDIDATE",
  });
  userIds.push(
    recruiterA.id,
    recruiterB.id,
    recruiterWithoutCompany.id,
    interviewerA.id,
    interviewerB.id,
    candidateUser.id,
    secondCandidateUser.id,
  );

  candidateProfile = await CandidateProfile.create({
    userId: candidateUser.id,
    headline: "Senior Product Engineer",
    location: "Lagos, Nigeria",
    resumeUrl: "https://files.example.com/amara-workspace.pdf",
  });
  secondCandidateProfile = await CandidateProfile.create({
    userId: secondCandidateUser.id,
    headline: "Platform Engineer",
    location: "Beirut, Lebanon",
  });
  profileIds.push(candidateProfile.id, secondCandidateProfile.id);

  openJobA = await Job.create({
    companyId: companyA.id,
    createdById: recruiterA.id,
    title: `Open Workspace Job ${suffix}`,
    description: "Company A open role.",
    location: "Remote",
    isRemote: true,
    status: "OPEN",
  });
  closedJobA = await Job.create({
    companyId: companyA.id,
    createdById: recruiterA.id,
    title: `Closed Workspace Job ${suffix}`,
    description: "Company A closed role.",
    location: "Beirut",
    status: "CLOSED",
  });
  openJobB = await Job.create({
    companyId: companyB.id,
    createdById: recruiterB.id,
    title: `Other Workspace Job ${suffix}`,
    description: "Company B role.",
    location: "Lagos",
    status: "OPEN",
  });
  jobIds.push(openJobA.id, closedJobA.id, openJobB.id);

  interviewingApplication = await Application.create({
    jobId: openJobA.id,
    candidateProfileId: candidateProfile.id,
    stage: "INTERVIEWING",
    coverLetter: "Strong fit for the open role.",
    resumeUrl: candidateProfile.resumeUrl,
    submittedAt: new Date("2026-07-25T10:00:00.000Z"),
  });
  offerApplication = await Application.create({
    jobId: closedJobA.id,
    candidateProfileId: candidateProfile.id,
    stage: "OFFER",
    submittedAt: new Date("2026-07-20T10:00:00.000Z"),
  });
  const draftApplication = await Application.create({
    jobId: openJobA.id,
    candidateProfileId: secondCandidateProfile.id,
    stage: "DRAFT",
  });
  otherCompanyApplication = await Application.create({
    jobId: openJobB.id,
    candidateProfileId: secondCandidateProfile.id,
    stage: "HIRED",
    submittedAt: new Date("2026-07-26T10:00:00.000Z"),
  });
  applicationIds.push(
    interviewingApplication.id,
    offerApplication.id,
    draftApplication.id,
    otherCompanyApplication.id,
  );

  const otherAssignment = await InterviewAssignment.create({
    applicationId: otherCompanyApplication.id,
    interviewerId: interviewerB.id,
  });
  assignmentIds.push(otherAssignment.id);

  recruiterAToken = tokenFor(recruiterA);
  recruiterBToken = tokenFor(recruiterB);
  recruiterWithoutCompanyToken = tokenFor(recruiterWithoutCompany);
  interviewerAToken = tokenFor(interviewerA);
  candidateToken = tokenFor(candidateUser);
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  await InterviewAssignment.destroy({ where: { id: assignmentIds } });
  await Application.destroy({ where: { id: applicationIds } });
  await Job.destroy({ where: { id: jobIds } });
  await CandidateProfile.destroy({ where: { id: profileIds } });
  await User.destroy({ where: { id: userIds } });
  await Company.destroy({ where: { id: companyIds } });
  await getSequelize().close();
});

describe("GET /api/recruiter/dashboard", () => {
  it("returns company-scoped submitted metrics, stages, and recent applicants", async () => {
    const res = await request(app)
      .get("/api/recruiter/dashboard")
      .set("Cookie", cookie(recruiterAToken));

    expect(res.status).toBe(200);
    expect(res.body.data.metrics).toEqual({
      totalJobs: 2,
      openJobs: 1,
      totalApplications: 2,
      interviewing: 1,
      offers: 1,
      hires: 0,
    });
    expect(res.body.data.stageCounts).toEqual({
      APPLIED: 0,
      REVIEWED: 0,
      INTERVIEWING: 1,
      OFFER: 1,
      HIRED: 0,
      REJECTED: 0,
    });

    const recentIds = res.body.data.recentApplicants.map(
      (application: { id: string }) => application.id,
    );
    expect(recentIds).toEqual([
      interviewingApplication.id,
      offerApplication.id,
    ]);
    expect(recentIds).not.toContain(otherCompanyApplication.id);
    expect(res.body.data.recentApplicants[0]).toMatchObject({
      id: interviewingApplication.id,
      jobId: openJobA.id,
      jobTitle: openJobA.title,
      stage: "INTERVIEWING",
      candidateProfile: {
        id: candidateProfile.id,
        headline: candidateProfile.headline,
        location: candidateProfile.location,
        resumeUrl: candidateProfile.resumeUrl,
        user: {
          id: candidateUser.id,
          name: candidateUser.name,
          email: candidateUser.email,
        },
      },
    });
  });

  it("does not expose another company's dashboard data", async () => {
    const res = await request(app)
      .get("/api/recruiter/dashboard")
      .set("Cookie", cookie(recruiterBToken));

    expect(res.status).toBe(200);
    expect(res.body.data.metrics).toMatchObject({
      totalJobs: 1,
      openJobs: 1,
      totalApplications: 1,
      hires: 1,
    });
    expect(res.body.data.recentApplicants).toHaveLength(1);
    expect(res.body.data.recentApplicants[0].id).toBe(
      otherCompanyApplication.id,
    );
  });

  it("returns an empty workspace for a recruiter without a company", async () => {
    const res = await request(app)
      .get("/api/recruiter/dashboard")
      .set("Cookie", cookie(recruiterWithoutCompanyToken));

    expect(res.status).toBe(200);
    expect(res.body.data.metrics.totalJobs).toBe(0);
    expect(res.body.data.metrics.totalApplications).toBe(0);
    expect(res.body.data.recentApplicants).toEqual([]);
  });

  it("rejects candidates", async () => {
    const res = await request(app)
      .get("/api/recruiter/dashboard")
      .set("Cookie", cookie(candidateToken));

    expect(res.status).toBe(403);
  });
});

describe("company-scoped candidate details", () => {
  it("keeps an applicant detail usable for the owning company", async () => {
    const res = await request(app)
      .get(`/api/candidate-profiles/${candidateProfile.id}`)
      .set("Cookie", cookie(recruiterAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: candidateProfile.id,
      headline: candidateProfile.headline,
      user: {
        id: candidateUser.id,
        name: candidateUser.name,
        email: candidateUser.email,
      },
    });
  });

  it("404s the same candidate detail for another company", async () => {
    const res = await request(app)
      .get(`/api/candidate-profiles/${candidateProfile.id}`)
      .set("Cookie", cookie(recruiterBToken));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Candidate profile not found");
  });
});

describe("company-safe interviewer assignments", () => {
  it("404s when a recruiter assigns an interviewer from another company", async () => {
    const res = await request(app)
      .post(
        `/api/applications/${interviewingApplication.id}/assign-interviewer`,
      )
      .set("Cookie", cookie(recruiterAToken))
      .send({ interviewerId: interviewerB.id });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Interviewer not found");
    expect(
      await InterviewAssignment.count({
        where: {
          applicationId: interviewingApplication.id,
          interviewerId: interviewerB.id,
        },
      }),
    ).toBe(0);
  });

  it("assigns a same-company interviewer idempotently", async () => {
    const first = await request(app)
      .post(
        `/api/applications/${interviewingApplication.id}/assign-interviewer`,
      )
      .set("Cookie", cookie(recruiterAToken))
      .send({ interviewerId: interviewerA.id });
    const duplicate = await request(app)
      .post(
        `/api/applications/${interviewingApplication.id}/assign-interviewer`,
      )
      .set("Cookie", cookie(recruiterAToken))
      .send({ interviewerId: interviewerA.id });

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.data.id).toBe(first.body.data.id);
    assignmentIds.push(first.body.data.id);
    expect(
      await InterviewAssignment.count({
        where: {
          applicationId: interviewingApplication.id,
          interviewerId: interviewerA.id,
        },
      }),
    ).toBe(1);
  });

  it("returns only the caller's real assigned applications", async () => {
    const res = await request(app)
      .get("/api/interviewer/assignments/me")
      .set("Cookie", cookie(interviewerAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      application: {
        id: interviewingApplication.id,
        stage: "INTERVIEWING",
        coverLetter: interviewingApplication.coverLetter,
        resumeUrl: interviewingApplication.resumeUrl,
        job: {
          id: openJobA.id,
          title: openJobA.title,
          location: openJobA.location,
          status: "OPEN",
        },
        candidateProfile: {
          id: candidateProfile.id,
          headline: candidateProfile.headline,
          location: candidateProfile.location,
          resumeUrl: candidateProfile.resumeUrl,
          user: {
            id: candidateUser.id,
            name: candidateUser.name,
            email: candidateUser.email,
          },
        },
      },
    });
    expect(
      res.body.data.map(
        (assignment: { application: { id: string } }) =>
          assignment.application.id,
      ),
    ).not.toContain(otherCompanyApplication.id);
  });

  it("rejects recruiters from the interviewer endpoint", async () => {
    const res = await request(app)
      .get("/api/interviewer/assignments/me")
      .set("Cookie", cookie(recruiterAToken));

    expect(res.status).toBe(403);
  });
});
