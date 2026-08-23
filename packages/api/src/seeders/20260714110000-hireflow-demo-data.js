"use strict";

const path = require("path");
const { promises: fs } = require("fs");
const bcrypt = require("bcryptjs");
const { Op, QueryTypes } = require("sequelize");
const {
  DEMO_PASSWORD,
  IDENTITIES,
  LEGACY_HEX_SKILL_IDS,
  SKILLS,
  buildDemoData,
} = require("./demo-data/build-demo-data");

const FIXTURE_ROOT = path.resolve(__dirname, "fixtures");
const PUBLIC_UPLOADS_ROOT = path.resolve(__dirname, "../../uploads");
const PRIVATE_UPLOADS_ROOT = path.resolve(__dirname, "../../private-uploads");
const PUBLIC_DEMO_ROOT = path.join(PUBLIC_UPLOADS_ROOT, "demo");
const PUBLIC_USER_RESUMES_ROOT = path.join(PUBLIC_UPLOADS_ROOT, "resumes");
const PRIVATE_APPLICATION_RESUMES_ROOT = path.join(
  PRIVATE_UPLOADS_ROOT,
  "application-resumes",
);
const PRIVATE_DEMO_ROOT = path.join(PRIVATE_APPLICATION_RESUMES_ROOT, "demo");
const PUBLIC_UPLOAD_PREFIX = "/uploads/";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isPathInside(root, target) {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function resolveChildPath(root, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath.trim().length === 0) {
    throw new Error(`Invalid ${label}`);
  }

  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);
  if (target === resolvedRoot || !isPathInside(resolvedRoot, target)) {
    throw new Error(`Refusing to access ${label} outside ${resolvedRoot}`);
  }
  return target;
}

async function selectRows(
  queryInterface,
  sql,
  replacements,
  transaction,
) {
  return queryInterface.sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
    transaction,
  });
}

async function selectIds(
  queryInterface,
  sql,
  replacements,
  transaction,
) {
  const rows = await selectRows(
    queryInterface,
    sql,
    replacements,
    transaction,
  );
  return rows.map((row) => row.id);
}

async function deleteWhere(queryInterface, table, where, transaction) {
  if (!where) {
    return;
  }
  await queryInterface.bulkDelete(table, where, { transaction });
}

async function deleteByIds(queryInterface, table, ids, transaction) {
  if (ids.length > 0) {
    await deleteWhere(queryInterface, table, { id: ids }, transaction);
  }
}

function orWhere(conditions) {
  const present = conditions.filter(Boolean);
  return present.length > 0 ? { [Op.or]: present } : null;
}

function inCondition(column, ids) {
  return ids.length > 0 ? { [column]: ids } : null;
}

/**
 * Remove the full demo workspace, including rows created interactively while
 * using a demo account. Children come first because jobs.created_by_id,
 * application_notes.author_id, scorecard_templates.created_by, and submitted
 * scorecards intentionally block deleting their authors.
 */
async function removeDemoData(queryInterface, transaction) {
  const companyIds = IDENTITIES.companies;
  const staffIds = IDENTITIES.staff;
  const candidateUserIds = IDENTITIES.candidateUsers;
  const userIds = [...staffIds, ...candidateUserIds];

  const profileIds = unique([
    ...IDENTITIES.candidateProfiles,
    ...(await selectIds(
      queryInterface,
      "SELECT id FROM candidate_profiles WHERE user_id IN (:candidateUserIds)",
      { candidateUserIds },
      transaction,
    )),
  ]);
  const jobIds = unique([
    ...IDENTITIES.jobs,
    ...(await selectIds(
      queryInterface,
      `SELECT id FROM jobs
       WHERE company_id IN (:companyIds) OR created_by_id IN (:staffIds)`,
      { companyIds, staffIds },
      transaction,
    )),
  ]);
  const applicationIds = unique([
    ...IDENTITIES.applications,
    ...(await selectIds(
      queryInterface,
      `SELECT id FROM applications
       WHERE job_id IN (:jobIds) OR candidate_profile_id IN (:profileIds)`,
      { jobIds, profileIds },
      transaction,
    )),
  ]);
  // Capture storage references before deleting their owning rows. Database
  // transactions cannot include filesystem work, so callers remove these
  // files only after this transaction commits successfully.
  const profileAssetRows = await selectRows(
    queryInterface,
    `SELECT resume_url
       FROM candidate_profiles
      WHERE id IN (:profileIds)`,
    { profileIds },
    transaction,
  );
  const applicationAssetRows = await selectRows(
    queryInterface,
    `SELECT resume_file_url
       FROM applications
      WHERE id IN (:applicationIds)`,
    { applicationIds },
    transaction,
  );
  const templateIds = await selectIds(
    queryInterface,
    `SELECT id FROM scorecard_templates
     WHERE company_id IN (:companyIds) OR created_by IN (:staffIds)`,
    { companyIds, staffIds },
    transaction,
  );
  const scorecardIds = await selectIds(
    queryInterface,
    `SELECT id FROM interview_scorecards
     WHERE application_id IN (:applicationIds)
        OR interviewer_id IN (:staffIds)
        OR template_id IN (:templateIds)`,
    {
      applicationIds,
      staffIds,
      // Sequelize cannot expand an empty array in an IN replacement.
      templateIds:
        templateIds.length > 0
          ? templateIds
          : ["00000000-0000-0000-0000-000000000000"],
    },
    transaction,
  );
  const poolEntryIds = await selectIds(
    queryInterface,
    `SELECT id FROM candidate_pool_entries
     WHERE company_id IN (:companyIds) OR candidate_id IN (:profileIds)`,
    { companyIds, profileIds },
    transaction,
  );
  const tagIds = await selectIds(
    queryInterface,
    "SELECT id FROM candidate_tags WHERE company_id IN (:companyIds)",
    { companyIds },
    transaction,
  );

  await deleteWhere(
    queryInterface,
    "notifications",
    orWhere([
      inCondition("user_id", userIds),
      inCondition("related_application_id", applicationIds),
      inCondition("related_job_id", jobIds),
    ]),
    transaction,
  );

  if (scorecardIds.length > 0) {
    await deleteWhere(
      queryInterface,
      "scorecard_ratings",
      { scorecard_id: scorecardIds },
      transaction,
    );
    await deleteByIds(
      queryInterface,
      "interview_scorecards",
      scorecardIds,
      transaction,
    );
  }

  await deleteWhere(
    queryInterface,
    "application_stage_history",
    orWhere([
      inCondition("application_id", applicationIds),
      inCondition("changed_by", staffIds),
    ]),
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "application_notes",
    orWhere([
      inCondition("application_id", applicationIds),
      inCondition("author_id", staffIds),
    ]),
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "interview_assignments",
    orWhere([
      inCondition("application_id", applicationIds),
      inCondition("interviewer_id", staffIds),
    ]),
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "ai_screenings",
    orWhere([
      inCondition("application_id", applicationIds),
      inCondition("generated_by_id", staffIds),
    ]),
    transaction,
  );
  await deleteByIds(
    queryInterface,
    "applications",
    applicationIds,
    transaction,
  );

  if (templateIds.length > 0) {
    await deleteWhere(
      queryInterface,
      "scorecard_criteria",
      { template_id: templateIds },
      transaction,
    );
    await deleteByIds(
      queryInterface,
      "scorecard_templates",
      templateIds,
      transaction,
    );
  }

  if (poolEntryIds.length > 0 || tagIds.length > 0) {
    await deleteWhere(
      queryInterface,
      "candidate_pool_tags",
      orWhere([
        inCondition("pool_entry_id", poolEntryIds),
        inCondition("tag_id", tagIds),
      ]),
      transaction,
    );
  }
  await deleteByIds(
    queryInterface,
    "candidate_pool_entries",
    poolEntryIds,
    transaction,
  );
  await deleteByIds(queryInterface, "candidate_tags", tagIds, transaction);

  await deleteWhere(
    queryInterface,
    "saved_jobs",
    orWhere([
      inCondition("candidate_profile_id", profileIds),
      inCondition("job_id", jobIds),
    ]),
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "candidate_job_recommendations",
    orWhere([
      inCondition("candidate_profile_id", profileIds),
      inCondition("job_id", jobIds),
    ]),
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "job_skills",
    { job_id: jobIds },
    transaction,
  );
  await deleteByIds(queryInterface, "jobs", jobIds, transaction);

  await deleteWhere(
    queryInterface,
    "candidate_skills",
    { candidate_profile_id: profileIds },
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "candidate_education",
    { candidate_profile_id: profileIds },
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "work_experiences",
    { candidate_profile_id: profileIds },
    transaction,
  );
  await deleteByIds(
    queryInterface,
    "candidate_profiles",
    profileIds,
    transaction,
  );

  // Skills are global. Remove only seed-owned rows that no unrelated profile
  // or job still references; shared rows survive and are reused on insert.
  await queryInterface.sequelize.query(
    `DELETE FROM skills AS skill
      WHERE skill.id IN (:skillIds)
        AND NOT EXISTS (
          SELECT 1 FROM candidate_skills link WHERE link.skill_id = skill.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM job_skills link WHERE link.skill_id = skill.id
        )`,
    {
      replacements: {
        skillIds: unique([...IDENTITIES.skills, ...LEGACY_HEX_SKILL_IDS]),
      },
      transaction,
    },
  );

  await deleteWhere(
    queryInterface,
    "recruiter_calendar_connections",
    { recruiter_id: staffIds },
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "oauth_identities",
    { user_id: userIds },
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "refresh_tokens",
    { user_id: userIds },
    transaction,
  );
  await deleteWhere(
    queryInterface,
    "sessions",
    { user_id: userIds },
    transaction,
  );
  await deleteByIds(queryInterface, "users", userIds, transaction);
  await deleteByIds(queryInterface, "companies", companyIds, transaction);

  return {
    publicUploadUrls: unique(profileAssetRows.map((row) => row.resume_url)),
    privateUploadKeys: unique(
      applicationAssetRows.map((row) => row.resume_file_url),
    ),
    // These are the exact fixed users deleted above. Their user-scoped upload
    // directories may contain older files no longer referenced by a row.
    deletedUserIds: userIds,
  };
}

async function bulkInsert(queryInterface, table, rows, transaction) {
  if (rows.length > 0) {
    await queryInterface.bulkInsert(table, rows, { transaction });
  }
}

async function ensureDemoSkills(queryInterface, data, transaction) {
  const existing = await queryInterface.sequelize.query(
    `SELECT id, name
       FROM skills
      WHERE id IN (:skillIds) OR LOWER(name) IN (:skillNames)`,
    {
      replacements: {
        skillIds: unique([
          ...IDENTITIES.skills,
          ...LEGACY_HEX_SKILL_IDS,
        ]),
        skillNames: data.skills.map((skill) => skill.name.toLowerCase()),
      },
      type: QueryTypes.SELECT,
      transaction,
    },
  );
  const byName = new Map(
    existing.map((skill) => [skill.name.toLowerCase(), skill.id]),
  );
  const byId = new Map(existing.map((skill) => [skill.id, skill.name]));
  const resolvedIds = new Map();
  const missing = [];

  data.skills.forEach((skill) => {
    const existingId = byName.get(skill.name.toLowerCase());
    if (existingId) {
      resolvedIds.set(skill.id, existingId);
      return;
    }

    const collidingName = byId.get(skill.id);
    if (collidingName) {
      throw new Error(
        `Demo skill ID ${skill.id} is already used by ${collidingName}`,
      );
    }
    resolvedIds.set(skill.id, skill.id);
    missing.push(skill);
  });

  for (const link of [...data.candidateSkills, ...data.jobSkills]) {
    link.skill_id = resolvedIds.get(link.skill_id);
  }
  await bulkInsert(queryInterface, "skills", missing, transaction);
}

async function lstatIfPresent(target) {
  try {
    return await fs.lstat(target);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * Remove one already-resolved child without following a parent symlink out of
 * the storage root. Recursive deletion is reserved for fixed, user-scoped or
 * demo-only directories; database-provided paths are always treated as files.
 */
async function removeContainedEntry(
  root,
  target,
  { recursive = false } = {},
) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (
    resolvedTarget === resolvedRoot ||
    !isPathInside(resolvedRoot, resolvedTarget)
  ) {
    throw new Error(`Refusing to remove a path outside ${resolvedRoot}`);
  }

  const entry = await lstatIfPresent(resolvedTarget);
  if (!entry) {
    return;
  }

  const [canonicalRoot, canonicalParent] = await Promise.all([
    fs.realpath(resolvedRoot),
    fs.realpath(path.dirname(resolvedTarget)),
  ]);
  if (!isPathInside(canonicalRoot, canonicalParent)) {
    throw new Error(
      `Refusing to follow an upload-directory link outside ${resolvedRoot}`,
    );
  }

  if (entry.isDirectory() && !entry.isSymbolicLink()) {
    if (!recursive) {
      return;
    }
    const canonicalTarget = await fs.realpath(resolvedTarget);
    if (
      canonicalTarget === canonicalRoot ||
      !isPathInside(canonicalRoot, canonicalTarget)
    ) {
      throw new Error(`Refusing to remove a directory outside ${resolvedRoot}`);
    }
    await fs.rm(resolvedTarget, { recursive: true, force: true });
    return;
  }

  await fs.rm(resolvedTarget, { force: true });
}

function localPublicUploadTarget(value) {
  if (typeof value !== "string" || !value.startsWith(PUBLIC_UPLOAD_PREFIX)) {
    return null;
  }

  try {
    // URL parsing normalizes slash and dot-segment tricks before the lexical
    // containment check. Absolute/host-relative URLs are intentionally not
    // treated as files owned by this local storage provider.
    const base = new URL("http://demo-upload.local");
    const parsed = new URL(value, base);
    if (
      parsed.origin !== base.origin ||
      !parsed.pathname.startsWith(PUBLIC_UPLOAD_PREFIX)
    ) {
      return null;
    }
    return resolveChildPath(
      PUBLIC_UPLOADS_ROOT,
      parsed.pathname.slice(PUBLIC_UPLOAD_PREFIX.length),
      "public upload path",
    );
  } catch {
    return null;
  }
}

function localPrivateUploadTarget(value) {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return resolveChildPath(PRIVATE_UPLOADS_ROOT, value, "private upload path");
  } catch {
    return null;
  }
}

async function cleanupRemovedUploads(
  removed,
  { preserveInstalledDemoAssets = false } = {},
) {
  const publicTargets = unique(
    removed.publicUploadUrls.map(localPublicUploadTarget),
  ).filter(
    (target) =>
      !preserveInstalledDemoAssets || !isPathInside(PUBLIC_DEMO_ROOT, target),
  );
  const privateTargets = unique(
    removed.privateUploadKeys.map(localPrivateUploadTarget),
  ).filter(
    (target) =>
      !preserveInstalledDemoAssets || !isPathInside(PRIVATE_DEMO_ROOT, target),
  );

  await Promise.all([
    ...publicTargets.map((target) =>
      removeContainedEntry(PUBLIC_UPLOADS_ROOT, target),
    ),
    ...privateTargets.map((target) =>
      removeContainedEntry(PRIVATE_UPLOADS_ROOT, target),
    ),
  ]);

  // Updating a profile can leave an older public resume with no database row.
  // The fixed demo users are deleted by reset, so their entire UUID-scoped
  // directories are owned by the reset and are safe to remove recursively.
  for (const userId of unique(removed.deletedUserIds)) {
    if (!UUID_PATTERN.test(userId)) {
      throw new Error(
        `Refusing to remove uploads for invalid user ID ${userId}`,
      );
    }
    await removeContainedEntry(
      PUBLIC_UPLOADS_ROOT,
      resolveChildPath(
        PUBLIC_USER_RESUMES_ROOT,
        userId,
        "public user resume directory",
      ),
      { recursive: true },
    );
    await removeContainedEntry(
      PRIVATE_UPLOADS_ROOT,
      resolveChildPath(
        PRIVATE_APPLICATION_RESUMES_ROOT,
        userId,
        "private user resume directory",
      ),
      { recursive: true },
    );
  }
}

function buildAssetOperations(assets) {
  const operations = [
    ...assets.logos.map((asset) => ({
      source: resolveChildPath(
        FIXTURE_ROOT,
        path.join("company-logos", asset.source),
        "logo fixture",
      ),
      destination: resolveChildPath(
        PUBLIC_UPLOADS_ROOT,
        asset.publicPath,
        "public logo destination",
      ),
      destinationRoot: PUBLIC_UPLOADS_ROOT,
    })),
    ...assets.publicResumes.map((asset) => ({
      source: resolveChildPath(
        FIXTURE_ROOT,
        path.join("resumes", asset.source),
        "resume fixture",
      ),
      destination: resolveChildPath(
        PUBLIC_UPLOADS_ROOT,
        asset.publicPath,
        "public resume destination",
      ),
      destinationRoot: PUBLIC_UPLOADS_ROOT,
    })),
    ...assets.privateResumes.map((asset) => ({
      source: resolveChildPath(
        FIXTURE_ROOT,
        path.join("resumes", asset.source),
        "resume fixture",
      ),
      destination: resolveChildPath(
        PRIVATE_UPLOADS_ROOT,
        asset.storageKey,
        "private resume destination",
      ),
      destinationRoot: PRIVATE_UPLOADS_ROOT,
    })),
  ];

  for (const operation of operations) {
    const dedicatedRoot =
      operation.destinationRoot === PUBLIC_UPLOADS_ROOT
        ? PUBLIC_DEMO_ROOT
        : PRIVATE_DEMO_ROOT;
    if (!isPathInside(dedicatedRoot, operation.destination)) {
      throw new Error(
        `Demo fixture destination is outside ${dedicatedRoot}`,
      );
    }
  }
  return operations;
}

async function prepareDemoAssets(assets) {
  const operations = buildAssetOperations(assets);
  const destinationKeys = operations.map(({ destination }) =>
    process.platform === "win32" ? destination.toLowerCase() : destination,
  );
  if (new Set(destinationKeys).size !== destinationKeys.length) {
    throw new Error("Demo asset manifest contains duplicate destinations");
  }

  const canonicalFixtureRoot = await fs.realpath(FIXTURE_ROOT);
  await Promise.all(
    unique(operations.map(({ source }) => source)).map(async (source) => {
      const [canonicalSource, sourceStat] = await Promise.all([
        fs.realpath(source),
        fs.stat(source),
      ]);
      if (
        !isPathInside(canonicalFixtureRoot, canonicalSource) ||
        !sourceStat.isFile()
      ) {
        throw new Error(
          `Demo fixture is not a regular file inside ${FIXTURE_ROOT}`,
        );
      }
    }),
  );
  return operations;
}

async function copyFixture({ source, destination, destinationRoot }) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const [canonicalRoot, canonicalParent] = await Promise.all([
    fs.realpath(destinationRoot),
    fs.realpath(path.dirname(destination)),
  ]);
  if (!isPathInside(canonicalRoot, canonicalParent)) {
    throw new Error(
      `Refusing to copy a demo fixture outside ${destinationRoot}`,
    );
  }
  await fs.copyFile(source, destination);
}

async function installDemoAssets(operations) {
  // Both targets are dedicated demo-only directories. Clearing them ensures
  // files cannot drift from the database across repeated resets.
  await removeContainedEntry(PUBLIC_UPLOADS_ROOT, PUBLIC_DEMO_ROOT, {
    recursive: true,
  });
  await removeContainedEntry(PRIVATE_UPLOADS_ROOT, PRIVATE_DEMO_ROOT, {
    recursive: true,
  });
  await Promise.all(operations.map(copyFixture));
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    const data = buildDemoData(now, passwordHash);
    const assetOperations = await prepareDemoAssets(data.assets);

    // Validate every source and destination before clearing either dedicated
    // directory. Installing before the database transaction means a committed
    // seed never points at fixtures that were known to be unavailable.
    await installDemoAssets(assetOperations);

    const removedUploads = await queryInterface.sequelize.transaction(
      async (transaction) => {
        const cleanup = await removeDemoData(queryInterface, transaction);

        await bulkInsert(
          queryInterface,
          "companies",
          data.companies,
          transaction,
        );
        await bulkInsert(queryInterface, "users", data.users, transaction);
        await bulkInsert(
          queryInterface,
          "candidate_profiles",
          data.candidateProfiles,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "work_experiences",
          data.workExperiences,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "candidate_education",
          data.education,
          transaction,
        );
        await ensureDemoSkills(queryInterface, data, transaction);
        await bulkInsert(
          queryInterface,
          "candidate_skills",
          data.candidateSkills,
          transaction,
        );
        await bulkInsert(queryInterface, "jobs", data.jobs, transaction);
        await bulkInsert(
          queryInterface,
          "job_skills",
          data.jobSkills,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "applications",
          data.applications,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "application_stage_history",
          data.stageHistory,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "application_notes",
          data.applicationNotes,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "interview_assignments",
          data.interviewAssignments,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "scorecard_templates",
          data.scorecardTemplates,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "scorecard_criteria",
          data.scorecardCriteria,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "interview_scorecards",
          data.interviewScorecards,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "scorecard_ratings",
          data.scorecardRatings,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "candidate_tags",
          data.candidateTags,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "candidate_pool_entries",
          data.candidatePoolEntries,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "candidate_pool_tags",
          data.candidatePoolTags,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "saved_jobs",
          data.savedJobs,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "candidate_job_recommendations",
          data.recommendations,
          transaction,
        );
        await bulkInsert(
          queryInterface,
          "notifications",
          data.notifications,
          transaction,
        );
        return cleanup;
      },
    );

    // The freshly installed fixture paths live below the dedicated demo
    // roots, so preserve those while removing interactive uploads and orphaned
    // UUID-scoped files collected from the old workspace.
    await cleanupRemovedUploads(removedUploads, {
      preserveInstalledDemoAssets: true,
    });

    console.info(
      `Demo seed ready: ${data.companies.length} companies, ` +
        `${data.candidateProfiles.length} candidates, ${data.jobs.length} jobs, ` +
        `${data.applications.length} applications.`,
    );
  },

  async down(queryInterface) {
    const removedUploads = await queryInterface.sequelize.transaction((transaction) =>
      removeDemoData(queryInterface, transaction),
    );
    await cleanupRemovedUploads(removedUploads);
    await removeContainedEntry(PUBLIC_UPLOADS_ROOT, PUBLIC_DEMO_ROOT, {
      recursive: true,
    });
    await removeContainedEntry(PRIVATE_UPLOADS_ROOT, PRIVATE_DEMO_ROOT, {
      recursive: true,
    });
  },

  // Exported for the dedicated reset/validation runner. sequelize-cli ignores
  // extra migration properties.
  demo: {
    companyIds: IDENTITIES.companies,
    candidateProfileIds: IDENTITIES.candidateProfiles,
    flagshipJobId: IDENTITIES.jobs[0],
    password: DEMO_PASSWORD,
    skillNames: SKILLS,
  },
  removeDemoData,
};
