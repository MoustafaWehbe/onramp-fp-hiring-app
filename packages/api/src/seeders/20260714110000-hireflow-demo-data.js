"use strict";

const bcrypt = require("bcryptjs");

/**
 * Demo-ready HireFlow dataset: one company, internal users, candidates with
 * profiles/experience/skills, jobs with tech stacks, and applications spread
 * across pipeline stages so the Kanban board has content.
 *
 * All rows use fixed UUIDs (namespaced by leading octet) so the seeder is
 * predictable and re-runnable: `up` removes any previous copy of the demo
 * data before inserting.
 */

const COMPANY_ID = "10000000-0000-4000-8000-000000000001";

const USERS = {
  recruiter: "20000000-0000-4000-8000-000000000001",
  interviewer: "20000000-0000-4000-8000-000000000002",
  candidate1: "20000000-0000-4000-8000-000000000101",
  candidate2: "20000000-0000-4000-8000-000000000102",
  candidate3: "20000000-0000-4000-8000-000000000103",
  candidate4: "20000000-0000-4000-8000-000000000104",
};

const PROFILES = {
  candidate1: "30000000-0000-4000-8000-000000000001",
  candidate2: "30000000-0000-4000-8000-000000000002",
  candidate3: "30000000-0000-4000-8000-000000000003",
  candidate4: "30000000-0000-4000-8000-000000000004",
};

const EXPERIENCES = [
  "40000000-0000-4000-8000-000000000001",
  "40000000-0000-4000-8000-000000000002",
  "40000000-0000-4000-8000-000000000003",
  "40000000-0000-4000-8000-000000000004",
  "40000000-0000-4000-8000-000000000005",
  "40000000-0000-4000-8000-000000000006",
  "40000000-0000-4000-8000-000000000007",
  "40000000-0000-4000-8000-000000000008",
];

const SKILLS = {
  react: "50000000-0000-4000-8000-000000000001",
  typescript: "50000000-0000-4000-8000-000000000002",
  postgresql: "50000000-0000-4000-8000-000000000003",
  nodejs: "50000000-0000-4000-8000-000000000004",
  docker: "50000000-0000-4000-8000-000000000005",
  graphql: "50000000-0000-4000-8000-000000000006",
  aws: "50000000-0000-4000-8000-000000000007",
  redis: "50000000-0000-4000-8000-000000000008",
  python: "50000000-0000-4000-8000-000000000009",
  kubernetes: "50000000-0000-4000-8000-000000000010",
};

const JOBS = {
  fullstack: "60000000-0000-4000-8000-000000000001",
  platform: "60000000-0000-4000-8000-000000000002",
  frontend: "60000000-0000-4000-8000-000000000003",
};

const APPLICATIONS = [
  "70000000-0000-4000-8000-000000000001",
  "70000000-0000-4000-8000-000000000002",
  "70000000-0000-4000-8000-000000000003",
  "70000000-0000-4000-8000-000000000004",
  "70000000-0000-4000-8000-000000000005",
  "70000000-0000-4000-8000-000000000006",
];

const NOTES = [
  "80000000-0000-4000-8000-000000000001",
  "80000000-0000-4000-8000-000000000002",
  "80000000-0000-4000-8000-000000000003",
];

const INTERVIEW_ASSIGNMENT_ID = "90000000-0000-4000-8000-000000000001";
const AI_SCREENING_ID = "a0000000-0000-4000-8000-000000000001";
const SAVED_JOBS = [
  "b0000000-0000-4000-8000-000000000001",
  "b0000000-0000-4000-8000-000000000002",
];

/**
 * Remove every demo row by its fixed ID, children before parents so no FK
 * (CASCADE or NO ACTION) gets in the way. Shared by `up` (idempotency) and
 * `down`.
 */
async function removeDemoData(queryInterface) {
  const profileIds = Object.values(PROFILES);
  const jobIds = Object.values(JOBS);

  await queryInterface.bulkDelete("saved_jobs", { id: SAVED_JOBS });
  await queryInterface.bulkDelete("ai_screenings", { id: [AI_SCREENING_ID] });
  await queryInterface.bulkDelete("interview_assignments", {
    id: [INTERVIEW_ASSIGNMENT_ID],
  });
  await queryInterface.bulkDelete("application_notes", { id: NOTES });
  await queryInterface.bulkDelete("applications", { id: APPLICATIONS });
  await queryInterface.bulkDelete("job_skills", { job_id: jobIds });
  await queryInterface.bulkDelete("candidate_skills", {
    candidate_profile_id: profileIds,
  });
  await queryInterface.bulkDelete("work_experiences", { id: EXPERIENCES });
  await queryInterface.bulkDelete("jobs", { id: jobIds });
  await queryInterface.bulkDelete("candidate_profiles", { id: profileIds });
  await queryInterface.bulkDelete("skills", { id: Object.values(SKILLS) });
  await queryInterface.bulkDelete("users", { id: Object.values(USERS) });
  await queryInterface.bulkDelete("companies", { id: [COMPANY_ID] });
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Idempotency: clear any previous copy of the demo data first.
    await removeDemoData(queryInterface);

    const now = new Date();
    const stamp = { created_at: now, updated_at: now };
    const passwordHash = await bcrypt.hash("Password123!", 12);

    await queryInterface.bulkInsert("companies", [
      {
        id: COMPANY_ID,
        name: "Northwind Labs",
        website: "https://northwindlabs.example.com",
        description:
          "Northwind Labs builds developer tooling for data-intensive teams.",
        logo_url: "https://northwindlabs.example.com/logo.png",
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("users", [
      {
        id: USERS.recruiter,
        email: "recruiter@northwindlabs.example.com",
        password_hash: passwordHash,
        name: "Rae Cruter",
        role: "RECRUITER",
        email_verified: true,
        company_id: COMPANY_ID,
        ...stamp,
      },
      {
        id: USERS.interviewer,
        email: "interviewer@northwindlabs.example.com",
        password_hash: passwordHash,
        name: "Ivan Terview",
        role: "INTERVIEWER",
        email_verified: true,
        company_id: COMPANY_ID,
        ...stamp,
      },
      {
        id: USERS.candidate1,
        email: "amara.okafor@example.com",
        password_hash: passwordHash,
        name: "Amara Okafor",
        role: "CANDIDATE",
        email_verified: true,
        company_id: null,
        ...stamp,
      },
      {
        id: USERS.candidate2,
        email: "liu.wei@example.com",
        password_hash: passwordHash,
        name: "Liu Wei",
        role: "CANDIDATE",
        email_verified: true,
        company_id: null,
        ...stamp,
      },
      {
        id: USERS.candidate3,
        email: "sofia.marino@example.com",
        password_hash: passwordHash,
        name: "Sofia Marino",
        role: "CANDIDATE",
        email_verified: true,
        company_id: null,
        ...stamp,
      },
      {
        id: USERS.candidate4,
        email: "dev.patel@example.com",
        password_hash: passwordHash,
        name: "Dev Patel",
        role: "CANDIDATE",
        email_verified: false,
        company_id: null,
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("candidate_profiles", [
      {
        id: PROFILES.candidate1,
        user_id: USERS.candidate1,
        headline: "Senior Full-Stack Engineer",
        bio: "Nine years shipping web products end to end, from schema design to CSS.",
        phone: "+1-555-0101",
        location: "Lagos, Nigeria (remote)",
        resume_url: "https://files.example.com/resumes/amara-okafor.pdf",
        ...stamp,
      },
      {
        id: PROFILES.candidate2,
        user_id: USERS.candidate2,
        headline: "Backend Engineer, distributed systems",
        bio: "I like queues, idempotency keys, and boring technology.",
        phone: "+86-555-0102",
        location: "Shanghai, China",
        resume_url: "https://files.example.com/resumes/liu-wei.pdf",
        ...stamp,
      },
      {
        id: PROFILES.candidate3,
        user_id: USERS.candidate3,
        headline: "Frontend Developer, design-systems nerd",
        bio: "Accessibility first. React since 2017.",
        phone: null,
        location: "Milan, Italy",
        resume_url: "https://files.example.com/resumes/sofia-marino.pdf",
        ...stamp,
      },
      {
        id: PROFILES.candidate4,
        user_id: USERS.candidate4,
        headline: "Platform / DevOps Engineer",
        bio: "Kubernetes wrangler. I automate myself out of every job.",
        phone: "+91-555-0104",
        location: "Pune, India",
        resume_url: null,
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("work_experiences", [
      {
        id: EXPERIENCES[0],
        candidate_profile_id: PROFILES.candidate1,
        company: "Paystack",
        title: "Senior Software Engineer",
        start_date: "2021-03-01",
        end_date: null,
        description: "Payments dashboard; React/Node, led a team of four.",
        ...stamp,
      },
      {
        id: EXPERIENCES[1],
        candidate_profile_id: PROFILES.candidate1,
        company: "Andela",
        title: "Software Engineer",
        start_date: "2017-06-01",
        end_date: "2021-02-28",
        description: "Full-stack client work across fintech and logistics.",
        ...stamp,
      },
      {
        id: EXPERIENCES[2],
        candidate_profile_id: PROFILES.candidate2,
        company: "ByteDance",
        title: "Backend Engineer",
        start_date: "2019-09-01",
        end_date: null,
        description: "High-throughput ingestion pipelines in Node and Go.",
        ...stamp,
      },
      {
        id: EXPERIENCES[3],
        candidate_profile_id: PROFILES.candidate3,
        company: "Satispay",
        title: "Frontend Developer",
        start_date: "2022-01-10",
        end_date: null,
        description: "Design system and consumer app UI.",
        ...stamp,
      },
      {
        id: EXPERIENCES[4],
        candidate_profile_id: PROFILES.candidate3,
        company: "Freelance",
        title: "Web Developer",
        start_date: "2019-05-01",
        end_date: "2021-12-31",
        description: "Client sites and small SPAs.",
        ...stamp,
      },
      {
        id: EXPERIENCES[5],
        candidate_profile_id: PROFILES.candidate3,
        company: "Politecnico di Milano",
        title: "Research Assistant",
        start_date: "2017-10-01",
        end_date: "2019-04-30",
        description: "HCI lab tooling.",
        ...stamp,
      },
      {
        id: EXPERIENCES[6],
        candidate_profile_id: PROFILES.candidate4,
        company: "Infosys",
        title: "DevOps Engineer",
        start_date: "2020-02-01",
        end_date: null,
        description: "EKS clusters, Terraform, CI/CD for 40+ services.",
        ...stamp,
      },
      {
        id: EXPERIENCES[7],
        candidate_profile_id: PROFILES.candidate4,
        company: "TCS",
        title: "Systems Engineer",
        start_date: "2018-07-01",
        end_date: "2020-01-31",
        description: "Linux administration and release automation.",
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert(
      "skills",
      [
        { id: SKILLS.react, name: "React", ...stamp },
        { id: SKILLS.typescript, name: "TypeScript", ...stamp },
        { id: SKILLS.postgresql, name: "PostgreSQL", ...stamp },
        { id: SKILLS.nodejs, name: "Node.js", ...stamp },
        { id: SKILLS.docker, name: "Docker", ...stamp },
        { id: SKILLS.graphql, name: "GraphQL", ...stamp },
        { id: SKILLS.aws, name: "AWS", ...stamp },
        { id: SKILLS.redis, name: "Redis", ...stamp },
        { id: SKILLS.python, name: "Python", ...stamp },
        { id: SKILLS.kubernetes, name: "Kubernetes", ...stamp },
      ],
    );

    await queryInterface.bulkInsert("candidate_skills", [
      // Amara: full-stack
      { candidate_profile_id: PROFILES.candidate1, skill_id: SKILLS.react, ...stamp },
      { candidate_profile_id: PROFILES.candidate1, skill_id: SKILLS.typescript, ...stamp },
      { candidate_profile_id: PROFILES.candidate1, skill_id: SKILLS.nodejs, ...stamp },
      { candidate_profile_id: PROFILES.candidate1, skill_id: SKILLS.postgresql, ...stamp },
      // Liu: backend
      { candidate_profile_id: PROFILES.candidate2, skill_id: SKILLS.nodejs, ...stamp },
      { candidate_profile_id: PROFILES.candidate2, skill_id: SKILLS.postgresql, ...stamp },
      { candidate_profile_id: PROFILES.candidate2, skill_id: SKILLS.redis, ...stamp },
      { candidate_profile_id: PROFILES.candidate2, skill_id: SKILLS.python, ...stamp },
      // Sofia: frontend
      { candidate_profile_id: PROFILES.candidate3, skill_id: SKILLS.react, ...stamp },
      { candidate_profile_id: PROFILES.candidate3, skill_id: SKILLS.typescript, ...stamp },
      { candidate_profile_id: PROFILES.candidate3, skill_id: SKILLS.graphql, ...stamp },
      // Dev: platform
      { candidate_profile_id: PROFILES.candidate4, skill_id: SKILLS.docker, ...stamp },
      { candidate_profile_id: PROFILES.candidate4, skill_id: SKILLS.kubernetes, ...stamp },
      { candidate_profile_id: PROFILES.candidate4, skill_id: SKILLS.aws, ...stamp },
    ]);

    await queryInterface.bulkInsert("jobs", [
      {
        id: JOBS.fullstack,
        company_id: COMPANY_ID,
        created_by_id: USERS.recruiter,
        title: "Senior Full-Stack Engineer",
        description:
          "Own features end to end across our React/Node stack. You will design schemas, build APIs, and ship UI.",
        location: "Remote (EMEA)",
        status: "OPEN",
        ...stamp,
      },
      {
        id: JOBS.platform,
        company_id: COMPANY_ID,
        created_by_id: USERS.recruiter,
        title: "Platform Engineer",
        description:
          "Keep our data plane fast and our deploys boring: Postgres, Redis, Docker, AWS.",
        location: "Remote (global)",
        status: "OPEN",
        ...stamp,
      },
      {
        id: JOBS.frontend,
        company_id: COMPANY_ID,
        created_by_id: USERS.recruiter,
        title: "Frontend Developer",
        description:
          "Build accessible, fast UI in React and TypeScript on top of our GraphQL API.",
        location: "Milan, Italy (hybrid)",
        status: "CLOSED",
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("job_skills", [
      { job_id: JOBS.fullstack, skill_id: SKILLS.react, ...stamp },
      { job_id: JOBS.fullstack, skill_id: SKILLS.typescript, ...stamp },
      { job_id: JOBS.fullstack, skill_id: SKILLS.nodejs, ...stamp },
      { job_id: JOBS.fullstack, skill_id: SKILLS.postgresql, ...stamp },
      { job_id: JOBS.platform, skill_id: SKILLS.postgresql, ...stamp },
      { job_id: JOBS.platform, skill_id: SKILLS.redis, ...stamp },
      { job_id: JOBS.platform, skill_id: SKILLS.docker, ...stamp },
      { job_id: JOBS.platform, skill_id: SKILLS.aws, ...stamp },
      { job_id: JOBS.frontend, skill_id: SKILLS.react, ...stamp },
      { job_id: JOBS.frontend, skill_id: SKILLS.typescript, ...stamp },
      { job_id: JOBS.frontend, skill_id: SKILLS.graphql, ...stamp },
    ]);

    const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

    await queryInterface.bulkInsert("applications", [
      {
        id: APPLICATIONS[0],
        job_id: JOBS.fullstack,
        candidate_profile_id: PROFILES.candidate1,
        stage: "INTERVIEWING",
        cover_letter:
          "I have shipped exactly this stack at Paystack and would love to do it again at Northwind.",
        resume_url: "https://files.example.com/resumes/amara-okafor.pdf",
        submitted_at: daysAgo(14),
        ...stamp,
      },
      {
        id: APPLICATIONS[1],
        job_id: JOBS.fullstack,
        candidate_profile_id: PROFILES.candidate2,
        stage: "APPLIED",
        cover_letter:
          "Mostly backend, but I am comfortable across the stack and deep on Postgres.",
        resume_url: "https://files.example.com/resumes/liu-wei.pdf",
        submitted_at: daysAgo(3),
        ...stamp,
      },
      {
        id: APPLICATIONS[2],
        job_id: JOBS.fullstack,
        candidate_profile_id: PROFILES.candidate3,
        stage: "REVIEWED",
        cover_letter: "Frontend-leaning full-stack; strong on the React side.",
        resume_url: "https://files.example.com/resumes/sofia-marino.pdf",
        submitted_at: daysAgo(7),
        ...stamp,
      },
      {
        id: APPLICATIONS[3],
        job_id: JOBS.platform,
        candidate_profile_id: PROFILES.candidate4,
        stage: "OFFER",
        cover_letter:
          "Your stack is my day job: EKS, Terraform, Postgres, Redis.",
        resume_url: "https://files.example.com/resumes/dev-patel.pdf",
        submitted_at: daysAgo(21),
        ...stamp,
      },
      {
        // DRAFT: candidate-only "save your progress" state — no submitted_at,
        // must never appear in a recruiter pipeline.
        id: APPLICATIONS[4],
        job_id: JOBS.platform,
        candidate_profile_id: PROFILES.candidate2,
        stage: "DRAFT",
        cover_letter: "TODO: tailor this before submitting…",
        resume_url: null,
        submitted_at: null,
        ...stamp,
      },
      {
        id: APPLICATIONS[5],
        job_id: JOBS.frontend,
        candidate_profile_id: PROFILES.candidate3,
        stage: "REJECTED",
        cover_letter: "Applying for the Milan frontend opening.",
        resume_url: "https://files.example.com/resumes/sofia-marino.pdf",
        submitted_at: daysAgo(40),
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("application_notes", [
      {
        id: NOTES[0],
        application_id: APPLICATIONS[0],
        author_id: USERS.recruiter,
        content:
          "Phone screen went very well — deep Postgres knowledge, clear communicator. Moving to technical interview.",
        rating: 5,
        ...stamp,
      },
      {
        id: NOTES[1],
        application_id: APPLICATIONS[0],
        author_id: USERS.interviewer,
        content:
          "Strong system design round. Minor gaps in frontend testing practices.",
        rating: 4,
        ...stamp,
      },
      {
        id: NOTES[2],
        application_id: APPLICATIONS[2],
        author_id: USERS.recruiter,
        content:
          "Portfolio is excellent but experience skews frontend; may be a better fit for the frontend req if it reopens.",
        rating: 3,
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("interview_assignments", [
      {
        id: INTERVIEW_ASSIGNMENT_ID,
        application_id: APPLICATIONS[0],
        interviewer_id: USERS.interviewer,
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("ai_screenings", [
      {
        id: AI_SCREENING_ID,
        application_id: APPLICATIONS[0],
        generated_by_id: USERS.recruiter,
        core_alignment:
          "Nine years of full-stack experience with direct overlap on React, TypeScript, Node.js and PostgreSQL. Prior fintech scale work maps well to Northwind's data-intensive product.",
        strengths: [
          "Deep PostgreSQL schema-design experience",
          "Led a four-person product team",
          "Full ownership from API to UI",
        ],
        skills_gaps: [
          "No production GraphQL exposure",
          "Limited infrastructure/DevOps background",
        ],
        interview_questions: [
          "Walk us through a schema migration you executed with zero downtime.",
          "How do you decide what lives in the database versus the application layer?",
          "Describe a time you had to unwind a bad architectural decision.",
        ],
        fit_score: 87,
        model: "claude-sonnet-5",
        tokens_used: 4231,
        cost_usd: "0.0412",
        ...stamp,
      },
    ]);

    await queryInterface.bulkInsert("saved_jobs", [
      {
        id: SAVED_JOBS[0],
        candidate_profile_id: PROFILES.candidate3,
        job_id: JOBS.platform,
        ...stamp,
      },
      {
        id: SAVED_JOBS[1],
        candidate_profile_id: PROFILES.candidate4,
        job_id: JOBS.fullstack,
        ...stamp,
      },
    ]);
  },

  async down(queryInterface) {
    await removeDemoData(queryInterface);
  },
};
