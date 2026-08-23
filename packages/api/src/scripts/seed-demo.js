"use strict";

const { Sequelize, QueryTypes } = require("sequelize");
const demoSeeder = require("../seeders/20260714110000-hireflow-demo-data");
const {
  assertDemoDatabaseTarget,
  resolveDemoDatabaseTarget,
} = require("./assert-demo-database");

function assertInvariant(condition, message) {
  if (!condition) {
    throw new Error(`Demo seed validation failed: ${message}`);
  }
}

async function rows(sequelize, sql, replacements = {}) {
  return sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
}

async function numberValue(sequelize, sql, replacements = {}) {
  const [row] = await rows(sequelize, sql, replacements);
  return Number(row.value);
}

async function validateDemoData(sequelize) {
  const { companyIds, candidateProfileIds, flagshipJobId } = demoSeeder.demo;
  const replacements = { companyIds, candidateProfileIds, flagshipJobId };
  const companyCount = await numberValue(
    sequelize,
    "SELECT COUNT(*) AS value FROM companies WHERE id IN (:companyIds)",
    replacements,
  );
  const incompleteCompanies = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM companies
      WHERE id IN (:companyIds)
        AND (
          NULLIF(BTRIM(name), '') IS NULL
          OR NULLIF(BTRIM(industry), '') IS NULL
          OR NULLIF(BTRIM(size), '') IS NULL
          OR NULLIF(BTRIM(location), '') IS NULL
          OR NULLIF(BTRIM(contact), '') IS NULL
          OR NULLIF(BTRIM(website), '') IS NULL
          OR NULLIF(BTRIM(description), '') IS NULL
          OR NULLIF(BTRIM(logo_url), '') IS NULL
        )`,
    replacements,
  );
  const invalidCompanyLogoUrls = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM companies
      WHERE id IN (:companyIds)
        AND logo_url !~ '^https?://'`,
    replacements,
  );
  const tiers = await rows(
    sequelize,
    `SELECT subscription_tier, COUNT(*)::int AS count
       FROM companies
      WHERE id IN (:companyIds)
      GROUP BY subscription_tier`,
    replacements,
  );
  const recruiterCounts = await rows(
    sequelize,
    `SELECT company_id, COUNT(*)::int AS count
       FROM users
      WHERE company_id IN (:companyIds) AND role = 'RECRUITER'
      GROUP BY company_id`,
    replacements,
  );
  const candidateCount = await numberValue(
    sequelize,
    "SELECT COUNT(*) AS value FROM candidate_profiles WHERE id IN (:candidateProfileIds)",
    replacements,
  );
  const jobSummary = await rows(
    sequelize,
    `SELECT status, COUNT(*)::int AS count
       FROM jobs
      WHERE company_id IN (:companyIds)
      GROUP BY status`,
    replacements,
  );
  const freeOpenViolations = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM (
         SELECT c.id
           FROM companies c
           JOIN jobs j ON j.company_id = c.id AND j.status = 'OPEN'
          WHERE c.id IN (:companyIds) AND c.subscription_tier = 'FREE'
          GROUP BY c.id
         HAVING COUNT(*) > 1
       ) violations`,
    replacements,
  );
  const applicationCount = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds) AND a.stage <> 'DRAFT'`,
    replacements,
  );
  const flagshipStages = await rows(
    sequelize,
    `SELECT stage, COUNT(*)::int AS count
       FROM applications
      WHERE job_id = :flagshipJobId
      GROUP BY stage`,
    replacements,
  );
  const missingHistory = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND NOT EXISTS (
          SELECT 1 FROM application_stage_history h
           WHERE h.application_id = a.id
        )`,
    replacements,
  );
  const mismatchedLatestHistory = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       LEFT JOIN LATERAL (
         SELECT h.to_stage
           FROM application_stage_history h
          WHERE h.application_id = a.id
          ORDER BY h.changed_at DESC, h.created_at DESC, h.id DESC
          LIMIT 1
       ) latest ON TRUE
      WHERE j.company_id IN (:companyIds)
        AND latest.to_stage IS DISTINCT FROM a.stage`,
    replacements,
  );
  const invalidHires = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND a.stage = 'HIRED'
        AND (a.hired_at IS NULL OR a.hired_at < COALESCE(a.submitted_at, a.created_at))`,
    replacements,
  );
  const hireMonths = await numberValue(
    sequelize,
    `SELECT COUNT(DISTINCT TO_CHAR(a.hired_at, 'YYYY-MM')) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id = :primaryCompanyId
        AND a.stage = 'HIRED' AND a.hired_at IS NOT NULL`,
    { primaryCompanyId: companyIds[0] },
  );
  const submittedSpanDays = await numberValue(
    sequelize,
    `SELECT EXTRACT(EPOCH FROM (MAX(a.submitted_at) - MIN(a.submitted_at))) / 86400 AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)`,
    replacements,
  );
  const futureSubmissions = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds) AND a.submitted_at > NOW()`,
    replacements,
  );
  const applicationsBeforeJobs = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND a.submitted_at < j.created_at`,
    replacements,
  );
  const scoreBuckets = await rows(
    sequelize,
    `SELECT bucket, COUNT(*)::int AS count
       FROM (
         SELECT CASE
           WHEN a.fit_score BETWEEN 0 AND 20 THEN '0-20'
           WHEN a.fit_score BETWEEN 21 AND 40 THEN '21-40'
           WHEN a.fit_score BETWEEN 41 AND 60 THEN '41-60'
           WHEN a.fit_score BETWEEN 61 AND 80 THEN '61-80'
           WHEN a.fit_score BETWEEN 81 AND 100 THEN '81-100'
         END AS bucket
         FROM applications a
         JOIN jobs j ON j.id = a.job_id
         WHERE j.company_id IN (:companyIds) AND a.fit_score IS NOT NULL
       ) scored
      GROUP BY bucket`,
    replacements,
  );
  const inconsistentScores = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND a.fit_score IS NOT NULL
        AND (
          a.ai_scoring_status <> 'completed'
          OR a.ai_scored_at IS NULL
          OR a.ai_summary IS NULL
        )`,
    replacements,
  );
  const implausibleFlagshipFinalists = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM applications a
      WHERE a.job_id = :flagshipJobId
        AND a.stage IN ('OFFER', 'HIRED')
        AND (
          a.fit_score IS NULL
          OR a.fit_score < 65
          OR NOT EXISTS (
            SELECT 1
              FROM candidate_skills cs
              JOIN job_skills js ON js.skill_id = cs.skill_id
             WHERE cs.candidate_profile_id = a.candidate_profile_id
               AND js.job_id = a.job_id
          )
        )`,
    replacements,
  );
  const invalidScorecardChronology = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM interview_scorecards s
       JOIN applications a ON a.id = s.application_id
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND (
          a.interview_date IS NULL
          OR s.submitted_at < a.interview_date
          OR (
            a.stage IN ('OFFER', 'HIRED')
            AND s.submitted_at > (
              SELECT MAX(h.changed_at)
                FROM application_stage_history h
               WHERE h.application_id = a.id
                 AND h.to_stage = a.stage
            )
          )
        )`,
    replacements,
  );
  const invalidScorecardActors = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM interview_scorecards s
       JOIN users u ON u.id = s.interviewer_id
       JOIN applications a ON a.id = s.application_id
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND u.role <> 'RECRUITER'`,
    replacements,
  );
  const inconsistentNotificationTimes = await numberValue(
    sequelize,
    `SELECT COUNT(*) AS value
       FROM notifications n
       JOIN applications a ON a.id = n.related_application_id
       JOIN jobs j ON j.id = a.job_id
      WHERE j.company_id IN (:companyIds)
        AND (
          (
            n.type = 'new_application'
            AND (
              n.created_at < COALESCE(a.submitted_at, a.created_at)
              OR n.created_at > COALESCE(a.submitted_at, a.created_at) + INTERVAL '1 day'
            )
          )
          OR (
            n.type = 'stage_change'
            AND (
              n.created_at < (
                SELECT MAX(h.changed_at)
                  FROM application_stage_history h
                 WHERE h.application_id = a.id
              )
              OR n.created_at > (
                SELECT MAX(h.changed_at) + INTERVAL '1 day'
                  FROM application_stage_history h
                 WHERE h.application_id = a.id
              )
            )
          )
        )`,
    replacements,
  );
  const supportingCounts = {};
  for (const [key, table] of [
    ["resumes", "applications"],
    ["interviews", "applications"],
    ["notifications", "notifications"],
    ["poolEntries", "candidate_pool_entries"],
    ["poolTags", "candidate_pool_tags"],
    ["scorecards", "interview_scorecards"],
    ["recommendations", "candidate_job_recommendations"],
    ["savedJobs", "saved_jobs"],
  ]) {
    let sql;
    if (key === "resumes") {
      sql = `SELECT COUNT(*) AS value FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id IN (:companyIds) AND a.resume_file_url IS NOT NULL AND a.resume_original_filename IS NOT NULL`;
    } else if (key === "interviews") {
      sql = `SELECT COUNT(*) AS value FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.company_id IN (:companyIds) AND a.interview_date IS NOT NULL AND a.interview_scheduled_at IS NOT NULL AND a.recruiter_notes IS NOT NULL`;
    } else if (key === "notifications") {
      sql = `SELECT COUNT(*) AS value FROM notifications n JOIN users u ON u.id = n.user_id WHERE u.company_id IN (:companyIds) OR u.id IN (SELECT user_id FROM candidate_profiles WHERE id IN (:candidateProfileIds))`;
    } else if (key === "poolEntries") {
      sql = `SELECT COUNT(*) AS value FROM candidate_pool_entries WHERE company_id IN (:companyIds)`;
    } else if (key === "poolTags") {
      sql = `SELECT COUNT(*) AS value FROM candidate_pool_tags pt JOIN candidate_pool_entries pe ON pe.id = pt.pool_entry_id WHERE pe.company_id IN (:companyIds)`;
    } else if (key === "scorecards") {
      sql = `SELECT COUNT(*) AS value FROM interview_scorecards s JOIN applications a ON a.id = s.application_id JOIN jobs j ON j.id = a.job_id WHERE j.company_id IN (:companyIds)`;
    } else if (key === "recommendations") {
      sql = `SELECT COUNT(*) AS value FROM candidate_job_recommendations WHERE candidate_profile_id IN (:candidateProfileIds)`;
    } else if (key === "savedJobs") {
      sql = `SELECT COUNT(*) AS value FROM saved_jobs WHERE candidate_profile_id IN (:candidateProfileIds)`;
    }
    supportingCounts[key] = await numberValue(sequelize, sql, replacements);
  }
  const disagreementSpread = await numberValue(
    sequelize,
    `SELECT COALESCE(MAX(spread), 0) AS value
       FROM (
         SELECT s.application_id, MAX(r.rating) - MIN(r.rating) AS spread
           FROM interview_scorecards s
           JOIN scorecard_ratings r ON r.scorecard_id = s.id
          GROUP BY s.application_id
         HAVING COUNT(DISTINCT s.interviewer_id) >= 2
       ) disagreements`,
  );

  const tierNames = new Set(tiers.map((row) => row.subscription_tier));
  const statusNames = new Set(jobSummary.map((row) => row.status));
  const flagshipByStage = Object.fromEntries(
    flagshipStages.map((row) => [row.stage, Number(row.count)]),
  );

  assertInvariant(companyCount === 5, `expected 5 companies, found ${companyCount}`);
  assertInvariant(incompleteCompanies === 0, `${incompleteCompanies} company profiles are incomplete`);
  assertInvariant(invalidCompanyLogoUrls === 0, "company logos must use editable absolute URLs");
  assertInvariant(tierNames.has("PRO") && tierNames.has("FREE"), "both PRO and FREE companies are required");
  assertInvariant(
    recruiterCounts.length === 5 && recruiterCounts.every((row) => row.count >= 2 && row.count <= 3),
    "every company must have two or three recruiters",
  );
  assertInvariant(candidateCount === 108, `expected 108 candidates, found ${candidateCount}`);
  assertInvariant(
    jobSummary.reduce((total, row) => total + Number(row.count), 0) === 20,
    "expected 20 demo jobs",
  );
  assertInvariant(
    ["OPEN", "CLOSED", "DRAFT"].every((status) => statusNames.has(status)),
    "OPEN, CLOSED, and DRAFT jobs must all be present",
  );
  assertInvariant(freeOpenViolations === 0, "a FREE company exceeds its one-open-job allowance");
  assertInvariant(applicationCount >= 200, "expected several hundred submitted applications");
  assertInvariant(
    Object.values(flagshipByStage).reduce((total, count) => total + count, 0) === 100,
    "flagship job must have exactly 100 applications",
  );
  assertInvariant(
    ["APPLIED", "REVIEWED", "INTERVIEWING", "OFFER", "HIRED", "REJECTED"].every(
      (stage) => (flagshipByStage[stage] ?? 0) > 0,
    ),
    "every flagship Kanban column must be populated",
  );
  assertInvariant(
    flagshipByStage.APPLIED >= 30 &&
      flagshipByStage.REVIEWED >= 20 &&
      flagshipByStage.INTERVIEWING > flagshipByStage.OFFER &&
      flagshipByStage.OFFER > flagshipByStage.HIRED &&
      flagshipByStage.REJECTED >= 15,
    "flagship stages do not form a realistic thinning funnel",
  );
  assertInvariant(missingHistory === 0, `${missingHistory} applications have no stage history`);
  assertInvariant(mismatchedLatestHistory === 0, `${mismatchedLatestHistory} timelines do not end at the current stage`);
  assertInvariant(invalidHires === 0, `${invalidHires} hired applications have invalid hired_at values`);
  assertInvariant(hireMonths >= 2, "time-to-hire trend needs hires across at least two months");
  assertInvariant(submittedSpanDays >= 60, "application timestamps span less than 60 days");
  assertInvariant(futureSubmissions === 0, "an application has a future submitted_at timestamp");
  assertInvariant(
    applicationsBeforeJobs === 0,
    `${applicationsBeforeJobs} applications predate their job posting`,
  );
  assertInvariant(scoreBuckets.length === 5, "fit scores do not cover all five dashboard buckets");
  assertInvariant(inconsistentScores === 0, `${inconsistentScores} fit scores have inconsistent AI metadata`);
  assertInvariant(
    implausibleFlagshipFinalists === 0,
    `${implausibleFlagshipFinalists} flagship finalists have weak profile/score evidence`,
  );
  assertInvariant(
    invalidScorecardChronology === 0,
    `${invalidScorecardChronology} scorecards conflict with interview/stage dates`,
  );
  assertInvariant(
    invalidScorecardActors === 0,
    `${invalidScorecardActors} scorecards are attributed to accounts that cannot submit them`,
  );
  assertInvariant(
    inconsistentNotificationTimes === 0,
    `${inconsistentNotificationTimes} notifications conflict with their source events`,
  );
  assertInvariant(supportingCounts.resumes >= 20, "too few downloadable application resumes");
  assertInvariant(supportingCounts.interviews >= 10, "too few scheduled interviews with notes");
  assertInvariant(supportingCounts.notifications >= 10, "notification bells would be empty");
  assertInvariant(supportingCounts.poolEntries >= 20 && supportingCounts.poolTags >= 20, "talent pool data is too sparse");
  assertInvariant(supportingCounts.scorecards >= 10, "multi-reviewer scorecards are too sparse");
  assertInvariant(disagreementSpread >= 3, "no visibly disagreeing interviewer scorecards were found");
  assertInvariant(supportingCounts.recommendations >= 4, "candidate recommendations are missing");
  assertInvariant(supportingCounts.savedJobs >= 2, "saved jobs are missing");

  console.info("Demo seed validation passed:");
  console.info(
    `  ${companyCount} companies, ${candidateCount} candidates, ` +
      `${jobSummary.reduce((total, row) => total + Number(row.count), 0)} jobs, ` +
      `${applicationCount} applications`,
  );
  console.info(
    `  Flagship stages: ${Object.entries(flagshipByStage)
      .map(([stage, count]) => `${stage}=${count}`)
      .join(", ")}`,
  );
  console.info(
    `  ${supportingCounts.resumes} attached CVs, ${supportingCounts.interviews} scheduled interviews, ` +
      `${supportingCounts.scorecards} scorecards, ${supportingCounts.notifications} notifications`,
  );
}

async function main() {
  const { config } = assertDemoDatabaseTarget(
    resolveDemoDatabaseTarget(),
  );

  const {
    database,
    username,
    password,
    migrationStorage: _migrationStorage,
    seederStorage: _seederStorage,
    ...options
  } = config;
  const sequelize = new Sequelize(database, username, password, {
    ...options,
    logging: false,
  });

  try {
    await sequelize.authenticate();
    await demoSeeder.up(sequelize.getQueryInterface(), Sequelize);
    await validateDemoData(sequelize);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
