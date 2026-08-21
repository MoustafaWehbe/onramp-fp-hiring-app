"use strict";

const {
  ARCHETYPES,
  CANDIDATE_NAMES,
  COMPANIES,
  EMPLOYERS,
  INSTITUTIONS,
  JOBS,
  LOCATIONS,
  SKILLS,
} = require("./catalog");

const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_PASSWORD = "Demo123!";

const RESUME_FIXTURES = [
  {
    source: "full-stack-engineer.pdf",
    publicName: "full-stack-engineer.pdf",
    label: "Full-Stack Engineer Resume",
  },
  {
    source: "product-designer.pdf",
    publicName: "product-designer.pdf",
    label: "Product Designer Resume",
  },
  {
    source: "data-platform-engineer.docx",
    publicName: "data-platform-engineer.docx",
    label: "Data Platform Engineer Resume",
  },
  {
    source: "product-operations.pdf",
    publicName: "product-operations.pdf",
    label: "Product Operations Resume",
  },
];

const HEADLINE_QUALIFIERS = [
  "Remote-first teams",
  "B2B SaaS",
  "High-scale platforms",
  "Customer-led products",
  "Mission-driven work",
  "Open to relocation",
];

const TAG_LABELS = [
  "High potential",
  "Referral",
  "Remote-ready",
  "Strong communicator",
  "Revisit next quarter",
];

const SCORECARD_CRITERIA = [
  {
    label: "Technical depth",
    description: "Demonstrates sound, relevant craft and technical judgement.",
  },
  {
    label: "Problem solving",
    description: "Frames ambiguous problems and works toward practical decisions.",
  },
  {
    label: "Communication",
    description: "Explains reasoning clearly and adapts detail to the audience.",
  },
  {
    label: "Collaboration",
    description: "Works constructively across disciplines and handles feedback well.",
  },
  {
    label: "Role motivation",
    description: "Shows informed, credible interest in this team and role.",
  },
];

function demoUuid(prefix, index) {
  return `${prefix}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function decimalSuffixUuid(prefix, index) {
  return `${prefix}-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function daysAgo(now, days) {
  return new Date(now.getTime() - days * DAY_MS);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function isoDate(year, month, day = 1) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function slug(value) {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .toLowerCase();
}

function lowerFirst(value) {
  return `${value.charAt(0).toLowerCase()}${value.slice(1)}`;
}

function unique(values) {
  return [...new Set(values)];
}

function staffForCompany(companyIndex) {
  const offset = companyIndex * 3;
  return {
    recruiter: IDENTITIES.staff[offset],
    interviewer: IDENTITIES.staff[offset + 1],
    recruiter2: IDENTITIES.staff[offset + 2],
  };
}

const totalApplications = JOBS.reduce(
  (total, job) => total + job.applicationCount,
  0,
);

const IDENTITIES = {
  companies: COMPANIES.map((_, index) => demoUuid("10000000", index + 1)),
  staff: COMPANIES.flatMap((company, companyIndex) =>
    company.staff.map((_, staffIndex) =>
      demoUuid("20000000", companyIndex * 3 + staffIndex + 1),
    ),
  ),
  candidateUsers: CANDIDATE_NAMES.map((_, index) =>
    // Preserve the original demo candidates' ...0101 through ...0104 IDs.
    decimalSuffixUuid("20000000", index + 101),
  ),
  candidateProfiles: CANDIDATE_NAMES.map((_, index) =>
    demoUuid("30000000", index + 1),
  ),
  // The original demo seeder used decimal suffixes for its ten global skill
  // rows (notably Kubernetes at ...000010). Keep that convention for the
  // expanded catalog so an unrelated profile that reused one of those shared
  // rows does not turn a later skill into an ID collision during reset.
  skills: SKILLS.map((_, index) =>
    decimalSuffixUuid("50000000", index + 1),
  ),
  jobs: JOBS.map((_, index) => demoUuid("60000000", index + 1)),
  applications: Array.from({ length: totalApplications }, (_, index) =>
    demoUuid("70000000", index + 1),
  ),
};

// A short-lived version of the expanded seeder generated these suffixes in
// hexadecimal. Cleanup accepts both sets so databases exercised while that
// version was under development can still be reset without leaving rows
// behind. New inserts always use IDENTITIES.skills above.
const LEGACY_HEX_SKILL_IDS = SKILLS.map((_, index) =>
  demoUuid("50000000", index + 1),
);

const COMPANY_INDEX = new Map(
  COMPANIES.map((company, index) => [company.key, index]),
);
const SKILL_ID = new Map(
  SKILLS.map((skill, index) => [skill, IDENTITIES.skills[index]]),
);

function buildCompanyRows(now) {
  const publicOrigin = (
    process.env.DEMO_PUBLIC_ORIGIN ||
    process.env.APP_BASE_URL ||
    process.env.CORS_ORIGIN ||
    "http://localhost:5173"
  ).replace(/\/$/, "");

  return COMPANIES.map((company, index) => {
    const createdAt = daysAgo(now, 520 - index * 43);
    return {
      id: IDENTITIES.companies[index],
      name: company.name,
      industry: company.industry,
      size: company.size,
      location: company.location,
      contact: company.contact,
      website: company.website,
      description: company.description,
      // Keep seeded logos editable through the normal company-profile form,
      // whose URL validation intentionally expects an absolute URL. In local
      // development the web origin proxies /uploads to the API.
      logo_url: `${publicOrigin}/uploads/demo/company-logos/${company.logoFile}`,
      subscription_tier: company.subscriptionTier,
      subscription_started_at:
        company.subscriptionTier === "PRO" ? daysAgo(now, 180 - index * 9) : null,
      subscription_updated_at: daysAgo(now, 12 + index),
      created_at: createdAt,
      updated_at: daysAgo(now, 12 + index),
    };
  });
}

function buildStaffRows(now, passwordHash) {
  let staffIndex = 0;
  return COMPANIES.flatMap((company, companyIndex) =>
    company.staff.map((staff) => {
      const index = staffIndex++;
      const createdAt = daysAgo(now, 430 - index * 7);
      return {
        id: IDENTITIES.staff[index],
        email: staff.email,
        password_hash: passwordHash,
        name: staff.name,
        role: staff.role,
        email_verified: true,
        role_selection_pending: false,
        company_id: IDENTITIES.companies[companyIndex],
        created_at: createdAt,
        updated_at: createdAt,
      };
    }),
  );
}

function buildCandidateRows(now, passwordHash) {
  const users = [];
  const profiles = [];
  const workExperiences = [];
  const education = [];
  const candidateSkills = [];
  let experienceIndex = 0;
  let educationIndex = 0;

  CANDIDATE_NAMES.forEach((name, index) => {
    const archetype = ARCHETYPES[index % ARCHETYPES.length];
    const cohort = Math.floor(index / ARCHETYPES.length);
    const [location, callingCode] = LOCATIONS[index % LOCATIONS.length];
    const employer = EMPLOYERS[(index * 7) % EMPLOYERS.length];
    const priorEmployer = EMPLOYERS[(index * 7 + 11) % EMPLOYERS.length];
    const institution = INSTITUTIONS[(index * 5) % INSTITUTIONS.length];
    const createdAt = daysAgo(now, 330 - (index % 75));
    const fixture = RESUME_FIXTURES[index % RESUME_FIXTURES.length];
    const currentYear = now.getUTCFullYear();
    const currentStartYear = currentYear - Math.max(1, Math.ceil(archetype.years / 2));
    const priorStartYear = currentYear - archetype.years;
    const email =
      index === 0
        ? "amara.okafor@example.com"
        : `${slug(name)}@candidate.example.com`;

    users.push({
      id: IDENTITIES.candidateUsers[index],
      email,
      password_hash: passwordHash,
      name,
      role: "CANDIDATE",
      email_verified: index % 13 !== 0 || index === 0,
      role_selection_pending: false,
      company_id: null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    profiles.push({
      id: IDENTITIES.candidateProfiles[index],
      user_id: IDENTITIES.candidateUsers[index],
      headline: `${archetype.headline} | ${HEADLINE_QUALIFIERS[cohort]}`,
      bio: `${archetype.summary} Most recently at ${employer}, I ${lowerFirst(archetype.impact)}`,
      phone: `${callingCode} ${String(700000000 + index * 7919).slice(0, 10)}`,
      location,
      resume_url: `/uploads/demo/resumes/${fixture.publicName}`,
      links: JSON.stringify({
        LinkedIn: `https://www.linkedin.com/in/${slug(name).replaceAll(".", "-")}-demo`,
        ...(index % 3 !== 1
          ? { GitHub: `https://github.com/${slug(name).replaceAll(".", "-")}-demo` }
          : {}),
        ...(index % 4 === 0
          ? { Portfolio: `https://${slug(name).replaceAll(".", "-")}.example.com` }
          : {}),
      }),
      profile_photo_url: null,
      profile_seeded_at: addDays(createdAt, 2),
      created_at: createdAt,
      updated_at: daysAgo(now, 8 + (index % 35)),
    });

    const currentExperienceId = demoUuid("40000000", ++experienceIndex);
    workExperiences.push({
      id: currentExperienceId,
      candidate_profile_id: IDENTITIES.candidateProfiles[index],
      company: employer,
      title: archetype.currentTitle,
      start_date: isoDate(currentStartYear, (index % 12) + 1),
      end_date: null,
      description: archetype.impact,
      created_at: createdAt,
      updated_at: daysAgo(now, 15 + (index % 30)),
    });

    if (index % 4 !== 3) {
      workExperiences.push({
        id: demoUuid("40000000", ++experienceIndex),
        candidate_profile_id: IDENTITIES.candidateProfiles[index],
        company: priorEmployer,
        title: archetype.priorTitle,
        start_date: isoDate(priorStartYear, ((index + 4) % 12) + 1),
        end_date: isoDate(currentStartYear, (index % 12) + 1),
        description:
          "Delivered customer-facing improvements, strengthened team practices, and took ownership of increasingly complex work.",
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    const educationStart = currentYear - archetype.years - 5;
    education.push({
      id: demoUuid("41000000", ++educationIndex),
      candidate_profile_id: IDENTITIES.candidateProfiles[index],
      institution,
      degree: archetype.degree,
      field_of_study: archetype.field,
      start_date: isoDate(educationStart, 9),
      end_date: isoDate(educationStart + (archetype.degree === "MSc" ? 2 : 4), 6),
      created_at: createdAt,
      updated_at: createdAt,
    });

    if (index % 9 === 0) {
      education.push({
        id: demoUuid("41000000", ++educationIndex),
        candidate_profile_id: IDENTITIES.candidateProfiles[index],
        institution: "Open Learning Institute",
        degree: "Professional Certificate",
        field_of_study: "Leadership and Systems Design",
        start_date: isoDate(currentYear - 2, 2),
        end_date: isoDate(currentYear - 2, 10),
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    const extraSkill = SKILLS[(index * 11 + 3) % SKILLS.length];
    for (const skill of unique([...archetype.skills, extraSkill])) {
      candidateSkills.push({
        candidate_profile_id: IDENTITIES.candidateProfiles[index],
        skill_id: SKILL_ID.get(skill),
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  });

  return { users, profiles, workExperiences, education, candidateSkills };
}

function buildSkillRows(now) {
  return SKILLS.map((name, index) => ({
    id: IDENTITIES.skills[index],
    name,
    created_at: daysAgo(now, 500 - index),
    updated_at: daysAgo(now, 60 - (index % 25)),
  }));
}

function buildJobRows(now) {
  const jobs = [];
  const jobSkills = [];

  JOBS.forEach((job, index) => {
    const companyIndex = COMPANY_INDEX.get(job.company);
    const staff = staffForCompany(companyIndex);
    const createdAt = daysAgo(now, 145 - (index * 11) % 85);

    jobs.push({
      id: IDENTITIES.jobs[index],
      company_id: IDENTITIES.companies[companyIndex],
      created_by_id: index % 2 === 0 ? staff.recruiter : staff.recruiter2,
      title: job.title,
      description: job.description,
      employment_type: job.employmentType,
      experience_min: job.experience[0],
      experience_max: job.experience[1],
      location: job.location,
      is_remote: job.remote,
      salary_min: job.salary[0],
      salary_max: job.salary[1],
      salary_currency: job.salary[2],
      status: job.status,
      created_at: createdAt,
      updated_at: daysAgo(now, job.status === "DRAFT" ? 2 + index : 18 + index),
    });

    for (const skill of job.skills) {
      jobSkills.push({
        job_id: IDENTITIES.jobs[index],
        skill_id: SKILL_ID.get(skill),
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  });

  return { jobs, jobSkills };
}

function selectCandidateIndexes(jobIndex, count) {
  if (jobIndex === 0) {
    return Array.from({ length: count }, (_, index) => index);
  }

  const selected = [];
  const required =
    jobIndex === 1
      ? [100, 101, 102, 103, 104, 105, 106, 107]
      : [2, 9, 13, 19].includes(jobIndex)
        ? [0]
        : [];

  for (const index of required) {
    if (!selected.includes(index) && selected.length < count) {
      selected.push(index);
    }
  }

  // Most applicants should have credible overlap with the opening, while a
  // smaller long-tail keeps the rejected/applied columns realistic. The
  // deterministic tie-breaker prevents every job from selecting the same
  // repeated archetype cohort.
  const relevantTarget = Math.min(count, Math.ceil(count * 0.7));
  const ranked = Array.from(
    { length: CANDIDATE_NAMES.length },
    (_, index) => index,
  ).sort((left, right) => {
    const relevanceDelta =
      roleRelevance(JOBS[jobIndex], right) -
      roleRelevance(JOBS[jobIndex], left);
    if (relevanceDelta !== 0) return relevanceDelta;
    return (
      ((right * 31 + jobIndex * 17) % 29) -
      ((left * 31 + jobIndex * 17) % 29)
    );
  });
  for (const index of ranked) {
    if (selected.length >= relevantTarget) break;
    if (!selected.includes(index)) selected.push(index);
  }

  let cursor = (jobIndex * 19 + 7) % CANDIDATE_NAMES.length;
  while (selected.length < count) {
    if (!selected.includes(cursor)) {
      selected.push(cursor);
    }
    cursor = (cursor + 37) % CANDIDATE_NAMES.length;
  }

  return selected;
}

function roleRelevance(job, candidateIndex) {
  const archetype = ARCHETYPES[candidateIndex % ARCHETYPES.length];
  const candidateSkills = new Set(archetype.skills);
  const matchedCount = job.skills.filter((skill) =>
    candidateSkills.has(skill),
  ).length;
  const skillCoverage = matchedCount / job.skills.length;
  const yearsBelow = Math.max(0, job.experience[0] - archetype.years);
  const experienceFit = yearsBelow === 0 ? 10 : Math.max(0, 10 - yearsBelow * 3);
  const flagshipRoleFamilyBonus =
    job.flagship &&
    /(software|backend|frontend|engineering manager|mobile)/i.test(
      archetype.currentTitle,
    )
      ? 13
      : 0;

  return Math.min(
    98,
    Math.round(
      15 + skillCoverage * 70 + experienceFit + flagshipRoleFamilyBonus,
    ),
  );
}

function buildFlagshipStageMap() {
  // These named accounts anchor the README walkthrough. Their outcomes are
  // also plausible for their adjacent full-stack backgrounds.
  const stages = new Map([
    [0, "INTERVIEWING"],
    [1, "OFFER"],
    [2, "HIRED"],
    [3, "REVIEWED"],
    [4, "APPLIED"],
    [5, "REJECTED"],
  ]);
  const ranked = Array.from({ length: 94 }, (_, index) => index + 6).sort(
    (left, right) => {
      const relevanceDelta =
        roleRelevance(JOBS[0], right) - roleRelevance(JOBS[0], left);
      if (relevanceDelta !== 0) return relevanceDelta;
      return ((right * 17) % 23) - ((left * 17) % 23);
    },
  );

  const assignStrongest = (stage, count) => {
    ranked.splice(0, count).forEach((candidateIndex) => {
      stages.set(candidateIndex, stage);
    });
  };
  assignStrongest("HIRED", 3);
  assignStrongest("OFFER", 5);
  assignStrongest("INTERVIEWING", 13);
  assignStrongest("REVIEWED", 21);

  // A realistic funnel leaves strong late applicants waiting in APPLIED while
  // clearly weaker matches are rejected. This preserves the exact 100-card
  // distribution without placing unrelated profiles in late stages.
  ranked.splice(-17).forEach((candidateIndex) => {
    stages.set(candidateIndex, "REJECTED");
  });
  ranked.forEach((candidateIndex) => {
    stages.set(candidateIndex, "APPLIED");
  });
  return stages;
}

const FLAGSHIP_STAGE_BY_CANDIDATE = buildFlagshipStageMap();

function stageForApplication(job, jobIndex, candidateIndex, position) {
  if (job.flagship) {
    return FLAGSHIP_STAGE_BY_CANDIDATE.get(candidateIndex);
  }

  const demoCandidateOverrides = {
    2: "REVIEWED",
    9: "REJECTED",
    13: "OFFER",
    19: "APPLIED",
  };
  if (candidateIndex === 0 && demoCandidateOverrides[jobIndex]) {
    return demoCandidateOverrides[jobIndex];
  }

  const percentile =
    (candidateIndex * 31 + jobIndex * 17 + position * 13) % 100;
  const signal =
    roleRelevance(job, candidateIndex) + (percentile % 25) - 12;
  if (job.status === "CLOSED") {
    if (signal >= 88) return percentile % 3 === 0 ? "OFFER" : "HIRED";
    if (signal >= 73) return "OFFER";
    if (signal >= 61) return "INTERVIEWING";
    if (signal >= 48) return "REVIEWED";
    return percentile % 4 === 0 ? "APPLIED" : "REJECTED";
  }

  if (signal >= 92 && percentile % 4 === 0) return "HIRED";
  if (signal >= 80) return "OFFER";
  if (signal >= 65) return "INTERVIEWING";
  if (signal >= 49) return "REVIEWED";
  return percentile % 5 === 0 ? "REJECTED" : "APPLIED";
}

function stagePath(stage, hash) {
  const progression = ["APPLIED", "REVIEWED", "INTERVIEWING", "OFFER", "HIRED"];
  if (stage !== "REJECTED") {
    return progression.slice(0, progression.indexOf(stage) + 1);
  }

  const rejectionExit = ["APPLIED", "REVIEWED", "INTERVIEWING", "OFFER"][
    hash % 4
  ];
  return [
    ...progression.slice(0, progression.indexOf(rejectionExit) + 1),
    "REJECTED",
  ];
}

function fitScoreFor(job, candidateIndex, stage, hash) {
  const stageAdjustment = {
    APPLIED: 0,
    REVIEWED: 3,
    INTERVIEWING: 7,
    OFFER: 10,
    HIRED: 12,
    REJECTED: -12,
  }[stage];
  const jitter = (hash % 15) - 7;
  return Math.max(
    8,
    Math.min(
      98,
      roleRelevance(job, candidateIndex) + stageAdjustment + jitter,
    ),
  );
}

function stageNarrative(stage, candidateName, jobTitle) {
  const copy = {
    APPLIED: `${candidateName}'s background has several relevant signals for ${jobTitle}; the application is ready for an initial review.`,
    REVIEWED: `The profile aligns with the core role requirements and merits a closer conversation about scope, ownership, and recent outcomes.`,
    INTERVIEWING: `Strong overlap in the most important capabilities, with promising evidence of ownership and clear communication.`,
    OFFER: `The interview evidence supports a strong match on craft, collaboration, and the level of responsibility expected in this role.`,
    HIRED: `A consistently strong process with credible examples, thoughtful trade-offs, and clear enthusiasm for the team's mission.`,
    REJECTED: `The application shows useful strengths, but the demonstrated experience is not as close to this opening's immediate priorities as other profiles.`,
  };
  return copy[stage];
}

function recruiterNote(stage, candidateName) {
  const notes = {
    APPLIED: `Review ${candidateName}'s most recent project and confirm scope of ownership before progressing.`,
    REVIEWED: `Good initial evidence. Ask for a concrete example with measurable impact during the screen.`,
    INTERVIEWING: `Phone screen was clear and well structured. Focus the next round on trade-offs and cross-team collaboration.`,
    OFFER: `References are positive. Compensation expectations are inside the approved range.`,
    HIRED: `Offer accepted. Keep onboarding context and interview highlights attached for the hiring manager.`,
    REJECTED: `Respectful close-out sent. Keep in mind for a role with a closer match to the candidate's strongest experience.`,
  };
  return notes[stage];
}

function buildApplicationRows(now) {
  const applications = [];
  const history = [];
  const privateResumeAssets = [];
  const applicationMetadata = [];
  const flagshipHireAges = [84, 67, 50, 34];
  const flagshipHireDurations = [28, 24, 21, 18];
  let applicationIndex = 0;
  let historyIndex = 0;
  let flagshipHireIndex = 0;

  JOBS.forEach((job, jobIndex) => {
    const companyIndex = COMPANY_INDEX.get(job.company);
    const company = COMPANIES[companyIndex];
    const staff = staffForCompany(companyIndex);
    const candidateIndexes = selectCandidateIndexes(jobIndex, job.applicationCount);

    candidateIndexes.forEach((candidateIndex, position) => {
      const id = IDENTITIES.applications[applicationIndex];
      const candidateName = CANDIDATE_NAMES[candidateIndex];
      const archetype = ARCHETYPES[candidateIndex % ARCHETYPES.length];
      const stage = stageForApplication(job, jobIndex, candidateIndex, position);
      const hash =
        (candidateIndex * 29 + jobIndex * 43 + applicationIndex * 17 + 11) % 997;
      const path = stagePath(stage, hash);
      const minimumAge = Math.max(2, (path.length - 1) * 5 + 3);
      let ageDays = Math.max(minimumAge, 2 + (hash % 91));
      let forcedHireDuration = null;

      if (job.flagship && stage === "HIRED") {
        ageDays = flagshipHireAges[flagshipHireIndex];
        forcedHireDuration = flagshipHireDurations[flagshipHireIndex];
        flagshipHireIndex += 1;
      }

      // Applications cannot predate the job posting. JOBS uses the same age
      // formula in buildJobRows, with enough headroom for every stage path.
      const jobCreatedAge = 145 - (jobIndex * 11) % 85;
      ageDays = Math.min(ageDays, jobCreatedAge - 2);

      const submittedAt = daysAgo(now, ageDays);
      const transitionDates = [submittedAt];
      if (path.length > 1) {
        const totalDuration =
          forcedHireDuration ??
          Math.min(
            ageDays - 2,
            (path.length - 1) * (4 + (hash % 4)) + (hash % 5),
          );
        for (let pathIndex = 1; pathIndex < path.length; pathIndex += 1) {
          transitionDates.push(
            addDays(
              submittedAt,
              (totalDuration * pathIndex) / (path.length - 1),
            ),
          );
        }
      }

      const latestChangeAt = transitionDates.at(-1);
      const scored = company.subscriptionTier === "PRO" && hash % 13 !== 0;
      const fitScore = scored
        ? fitScoreFor(job, candidateIndex, stage, hash)
        : null;
      const matchedSkills = job.skills.filter((skill) =>
        archetype.skills.includes(skill),
      );
      const missingSkills = job.skills.filter(
        (skill) => !archetype.skills.includes(skill),
      );
      const fixture = RESUME_FIXTURES[candidateIndex % RESUME_FIXTURES.length];
      const extension = fixture.source.endsWith(".docx") ? "docx" : "pdf";
      const hasPrivateResume = applicationIndex % 3 === 0 || candidateIndex === 0;
      const privateStorageKey = hasPrivateResume
        ? `application-resumes/demo/${id}.${extension}`
        : null;
      const interviewingIndex = path.indexOf("INTERVIEWING");
      const reachedInterview = interviewingIndex >= 0;
      const scheduleInterview =
        reachedInterview &&
        (candidateIndex === 0 || stage === "OFFER" || stage === "HIRED" || hash % 2 === 0);
      let interviewDate = null;
      let interviewScheduledAt = null;

      if (scheduleInterview) {
        interviewScheduledAt = addDays(
          transitionDates[interviewingIndex],
          0.25,
        );
        if (stage === "INTERVIEWING") {
          const proposedInterviewDate =
            candidateIndex === 0
              ? addDays(now, job.flagship ? -2 : 3)
              : addDays(now, (hash % 11) - 5);
          const earliestInterviewDate = addDays(
            transitionDates[interviewingIndex],
            0.75,
          );
          interviewDate = new Date(
            Math.max(
              proposedInterviewDate.getTime(),
              earliestInterviewDate.getTime(),
            ),
          );
        } else {
          const interviewReachedAt = transitionDates[interviewingIndex];
          const nextTransitionAt = transitionDates[interviewingIndex + 1];
          const intervalDays =
            (nextTransitionAt.getTime() - interviewReachedAt.getTime()) / DAY_MS;
          interviewDate = addDays(
            interviewReachedAt,
            Math.max(0.75, intervalDays * 0.45),
          );
        }
      }

      const synced = scheduleInterview && (candidateIndex === 0 || hash % 5 === 0);
      const resumeUploadedAt = hasPrivateResume
        ? addDays(submittedAt, -0.5)
        : null;
      const resumeReviewScore = 38 + (hash % 58);

      applications.push({
        id,
        job_id: IDENTITIES.jobs[jobIndex],
        candidate_profile_id: IDENTITIES.candidateProfiles[candidateIndex],
        stage,
        cover_letter: `I'm interested in the ${job.title} role because it combines ${archetype.skills[0]} with the kind of ${archetype.currentTitle.toLowerCase()} ownership I have developed over ${archetype.years} years. I would bring practical delivery experience, curiosity, and a collaborative approach to ${company.name}.`,
        resume_url: `/uploads/demo/resumes/${fixture.publicName}`,
        resume_file_url: privateStorageKey,
        resume_original_filename: hasPrivateResume
          ? `${candidateName.replaceAll(" ", "-")}-Resume.${extension}`
          : null,
        resume_text: hasPrivateResume
          ? `${candidateName}\n${archetype.headline}\n${archetype.years} years of professional experience\nSkills: ${archetype.skills.join(", ")}\n${archetype.summary}\n${archetype.impact}`
          : null,
        parsed_years_experience: hasPrivateResume ? archetype.years : null,
        parsed_skills: hasPrivateResume
          ? JSON.stringify(archetype.skills)
          : null,
        resume_uploaded_at: resumeUploadedAt,
        // Synthetic demo fixture: this score and its explanation are seeded
        // directly and are never model-generated, even when OPENAI_API_KEY is
        // present. This keeps reset fast, deterministic, and useful offline.
        fit_score: fitScore,
        ai_summary: scored ? stageNarrative(stage, candidateName, job.title) : null,
        ai_strengths: scored
          ? JSON.stringify([
              `${archetype.years} years of relevant professional experience`,
              matchedSkills.length > 0
                ? `Direct evidence of ${matchedSkills.slice(0, 3).join(", ")}`
                : "Transferable delivery and problem-solving experience",
              "Clear examples of ownership and measurable delivery",
            ])
          : null,
        ai_gaps: scored
          ? JSON.stringify([
              missingSkills.length > 0
                ? `Validate depth in ${missingSkills.slice(0, 2).join(" and ")}`
                : "Validate depth against the team's production scale",
              "Explore experience at the scale and operating model of this team",
            ])
          : null,
        ai_scored_at: scored ? addDays(submittedAt, 0.08) : null,
        ai_scoring_status: scored
          ? "completed"
          : company.subscriptionTier === "FREE" || hash % 2 === 0
            ? "failed"
            : "pending",
        resume_review_score: resumeReviewScore,
        resume_review_percentile: Math.min(99, 20 + ((resumeReviewScore * 7 + position) % 80)),
        resume_review_scored_at: addDays(submittedAt, 0.04),
        interview_date: interviewDate,
        recruiter_notes:
          stage === "APPLIED" && hash % 3 !== 0
            ? null
            : recruiterNote(stage, candidateName),
        interview_scheduled_at: interviewScheduledAt,
        google_event_id: synced ? `demo-${id}` : null,
        google_meet_link: synced
          ? `https://meet.google.com/demo-${id.slice(-8)}`
          : null,
        calendar_sync_status: scheduleInterview ? (synced ? "synced" : "not_synced") : null,
        calendar_sync_recruiter_id: synced ? staff.recruiter : null,
        hired_at: stage === "HIRED" ? latestChangeAt : null,
        submitted_at: submittedAt,
        created_at: submittedAt,
        updated_at: latestChangeAt,
      });

      path.forEach((toStage, pathIndex) => {
        const changedAt = transitionDates[pathIndex];
        history.push({
          id: demoUuid("71000000", ++historyIndex),
          application_id: id,
          from_stage: pathIndex === 0 ? null : path[pathIndex - 1],
          to_stage: toStage,
          changed_at: changedAt,
          changed_by:
            pathIndex === 0
              ? null
              : (applicationIndex + pathIndex) % 2 === 0
                ? staff.recruiter
                : staff.recruiter2,
          created_at: changedAt,
          updated_at: changedAt,
        });
      });

      if (hasPrivateResume) {
        privateResumeAssets.push({
          source: fixture.source,
          storageKey: privateStorageKey,
        });
      }

      applicationMetadata.push({
        id,
        globalIndex: applicationIndex,
        jobIndex,
        companyIndex,
        candidateIndex,
        stage,
        path,
        submittedAt,
        latestChangeAt,
        interviewDate,
        interviewScheduledAt,
        transitionDates,
      });
      applicationIndex += 1;
    });
  });

  return { applications, history, privateResumeAssets, applicationMetadata };
}

function buildInterviewData(now, applicationMetadata) {
  const templates = [];
  const criteria = [];
  const assignments = [];
  const notes = [];
  const scorecards = [];
  const ratings = [];
  let criterionIndex = 0;
  let assignmentIndex = 0;
  let noteIndex = 0;
  let scorecardIndex = 0;
  let ratingIndex = 0;

  COMPANIES.forEach((company, companyIndex) => {
    const staff = staffForCompany(companyIndex);
    const templateId = demoUuid("d1000000", companyIndex + 1);
    templates.push({
      id: templateId,
      company_id: IDENTITIES.companies[companyIndex],
      title: "Structured Interview Scorecard",
      created_by: staff.recruiter,
      created_at: daysAgo(now, 120 - companyIndex * 7),
    });

    SCORECARD_CRITERIA.forEach((criterion, sortOrder) => {
      criteria.push({
        id: demoUuid("d2000000", ++criterionIndex),
        template_id: templateId,
        label: criterion.label,
        description: criterion.description,
        sort_order: sortOrder,
      });
    });

    const eligible = applicationMetadata
      .filter(
        (application) =>
          application.companyIndex === companyIndex &&
          (["INTERVIEWING", "OFFER", "HIRED"].includes(application.stage) ||
            application.path.includes("INTERVIEWING")),
      )
      .sort((left, right) => {
        if (left.candidateIndex === 0) return -1;
        if (right.candidateIndex === 0) return 1;
        return left.globalIndex - right.globalIndex;
      })
      .slice(0, 8);

    eligible.forEach((application, index) => {
      const interviewReachedAt =
        application.transitionDates[application.path.indexOf("INTERVIEWING")];
      const createdAt =
        application.interviewScheduledAt || addDays(interviewReachedAt, 0.25);
      assignments.push({
        id: demoUuid("90000000", ++assignmentIndex),
        application_id: application.id,
        interviewer_id: staff.interviewer,
        created_at: createdAt,
        updated_at: createdAt,
      });

      if (
        index < 5 &&
        application.interviewDate &&
        application.interviewDate.getTime() < now.getTime()
      ) {
        const noteCreatedAt = addDays(application.interviewDate, 0.2);
        notes.push({
          id: demoUuid("80000000", ++noteIndex),
          application_id: application.id,
          author_id: index % 2 === 0 ? staff.recruiter : staff.recruiter2,
          content:
            index % 3 === 0
              ? "The candidate gave a clear account of a difficult trade-off and connected the decision to customer and operational outcomes."
              : index % 3 === 1
                ? "Strong preparation and communication. Follow up on the depth of hands-on ownership in the most recent project."
                : "Good cross-functional instincts; references and work samples support the examples discussed in the interview.",
          rating: 3 + (index % 3),
          created_at: noteCreatedAt,
          updated_at: noteCreatedAt,
        });
      }
    });
  });

  const primaryTemplateId = templates[0].id;
  const primaryCriteria = criteria.filter(
    (criterion) => criterion.template_id === primaryTemplateId,
  );
  const primaryStaff = staffForCompany(0);
  const primaryEligible = applicationMetadata
    .filter(
      (application) =>
        application.companyIndex === 0 &&
        ["INTERVIEWING", "OFFER", "HIRED"].includes(application.stage) &&
        application.interviewDate &&
        application.interviewDate.getTime() < now.getTime() - DAY_MS * 0.5,
    )
    .sort((left, right) => {
      if (left.candidateIndex === 0) return -1;
      if (right.candidateIndex === 0) return 1;
      return left.globalIndex - right.globalIndex;
    })
    .slice(0, 7);

  primaryEligible.forEach((application, applicationPosition) => {
    // Scorecard routes are recruiter-facing. Attribute every submission to
    // one of the two real recruiters so the seeded audit trail could have
    // been produced through the application itself.
    const reviewers = [primaryStaff.recruiter, primaryStaff.recruiter2];

    reviewers.forEach((reviewerId, reviewerPosition) => {
      const scorecardId = demoUuid("d3000000", ++scorecardIndex);
      const disagreementPatterns = [
        [5, 5, 4, 5, 5],
        [1, 2, 2, 1, 2],
      ];
      const normalPatterns = [
        [4, 4, 5, 4, 4],
        [3, 4, 4, 4, 3],
        [5, 4, 4, 5, 4],
      ];
      const pattern =
        applicationPosition === 0
          ? disagreementPatterns[reviewerPosition]
          : normalPatterns[(applicationPosition + reviewerPosition) % 3];
      const comments =
        applicationPosition === 0
            ? [
              "Strong hire. The examples were specific, technically credible, and showed the right level of ownership.",
              "I have material concerns about depth and how independently the candidate handled the hardest parts of the examples.",
            ]
          : [
              "Good evidence across the scorecard with no major unresolved concern.",
              "A solid interview. The candidate was thoughtful and receptive when challenged.",
              "Strong overall signal, especially in collaboration and role motivation.",
            ];

      scorecards.push({
        id: scorecardId,
        application_id: application.id,
        template_id: primaryTemplateId,
        interviewer_id: reviewerId,
        overall_comment: comments[reviewerPosition],
        submitted_at: addDays(application.interviewDate, 0.2 + reviewerPosition * 0.08),
      });

      primaryCriteria.forEach((criterion, criterionPosition) => {
        ratings.push({
          id: demoUuid("d4000000", ++ratingIndex),
          scorecard_id: scorecardId,
          criterion_id: criterion.id,
          rating: pattern[criterionPosition],
          comment:
            applicationPosition === 0 && reviewerPosition === 1
              ? "The evidence here did not consistently demonstrate the expected senior-level scope."
              : pattern[criterionPosition] >= 4
                ? "The candidate supported this rating with a specific, relevant example."
                : "Some positive evidence, with an area that would benefit from further validation.",
        });
      });
    });
  });

  return { templates, criteria, assignments, notes, scorecards, ratings };
}

function buildTalentPoolData(now, applicationMetadata) {
  const tags = [];
  const poolEntries = [];
  const poolTags = [];
  let tagIndex = 0;
  let entryIndex = 0;

  COMPANIES.forEach((company, companyIndex) => {
    const companyTagIds = TAG_LABELS.map((label) => {
      const id = demoUuid("c1000000", ++tagIndex);
      tags.push({
        id,
        company_id: IDENTITIES.companies[companyIndex],
        label,
      });
      return id;
    });

    const candidateIndexes = unique(
      applicationMetadata
        .filter((application) => application.companyIndex === companyIndex)
        .map((application) => application.candidateIndex),
    ).slice(0, companyIndex === 0 ? 38 : company.subscriptionTier === "PRO" ? 14 : 9);
    const staff = staffForCompany(companyIndex);

    candidateIndexes.forEach((candidateIndex, position) => {
      const id = demoUuid("c2000000", ++entryIndex);
      poolEntries.push({
        id,
        company_id: IDENTITIES.companies[companyIndex],
        candidate_id: IDENTITIES.candidateProfiles[candidateIndex],
        added_by: position % 2 === 0 ? staff.recruiter : staff.recruiter2,
        added_at: daysAgo(now, 3 + ((position * 5 + companyIndex) % 55)),
        notes:
          position % 3 === 0
            ? "Strong profile for future openings; keep warm and revisit when the next team plan is approved."
            : position % 3 === 1
              ? "Good domain overlap and thoughtful communication. Worth a targeted follow-up."
              : "Added after application review so the team can find this profile for adjacent roles.",
      });

      const tagPositions = unique([
        position % companyTagIds.length,
        (position * 3 + 1) % companyTagIds.length,
        ...(position % 5 === 0 ? [3] : []),
      ]);
      for (const tagPosition of tagPositions) {
        poolTags.push({
          pool_entry_id: id,
          tag_id: companyTagIds[tagPosition],
        });
      }
    });
  });

  return { tags, poolEntries, poolTags };
}

function findUnappliedOpenJobs(candidateIndex, applicationMetadata) {
  const appliedJobIndexes = new Set(
    applicationMetadata
      .filter((application) => application.candidateIndex === candidateIndex)
      .map((application) => application.jobIndex),
  );
  return JOBS.map((job, index) => ({ job, index })).filter(
    ({ job, index }) => job.status === "OPEN" && !appliedJobIndexes.has(index),
  );
}

function buildCandidateHomeData(now, applicationMetadata) {
  const savedJobs = [];
  const recommendations = [];
  let savedIndex = 0;
  let recommendationIndex = 0;

  for (let candidateIndex = 0; candidateIndex < 24; candidateIndex += 1) {
    const candidates = findUnappliedOpenJobs(candidateIndex, applicationMetadata);
    candidates.slice(0, 2).forEach(({ index: jobIndex }, position) => {
      const createdAt = daysAgo(now, 2 + candidateIndex + position * 4);
      savedJobs.push({
        id: demoUuid("b0000000", ++savedIndex),
        candidate_profile_id: IDENTITIES.candidateProfiles[candidateIndex],
        job_id: IDENTITIES.jobs[jobIndex],
        created_at: createdAt,
        updated_at: createdAt,
      });
    });
  }

  for (let candidateIndex = 0; candidateIndex < 12; candidateIndex += 1) {
    const archetype = ARCHETYPES[candidateIndex % ARCHETYPES.length];
    const candidates = findUnappliedOpenJobs(candidateIndex, applicationMetadata);
    candidates.slice(0, 4).forEach(({ job, index: jobIndex }, position) => {
      const matched = job.skills.filter((skill) => archetype.skills.includes(skill));
      const computedAt = new Date(now.getTime() - (candidateIndex + position + 1) * 20 * 60 * 1000);
      const score = Math.min(96, 64 + matched.length * 6 + ((candidateIndex + position) % 9));
      recommendations.push({
        id: demoUuid("b1000000", ++recommendationIndex),
        candidate_profile_id: IDENTITIES.candidateProfiles[candidateIndex],
        job_id: IDENTITIES.jobs[jobIndex],
        score,
        reason:
          matched.length > 0
            ? `A strong adjacent match based on ${matched.join(", ")} and the candidate's recent scope of responsibility.`
            : "The role is a credible adjacent opportunity based on transferable delivery, communication, and problem-solving experience.",
        matched_skills: JSON.stringify(matched),
        computed_at: computedAt,
        created_at: computedAt,
        updated_at: computedAt,
      });
    });
  }

  return { savedJobs, recommendations };
}

function buildNotifications(now, applicationMetadata) {
  const notifications = [];
  let notificationIndex = 0;

  COMPANIES.forEach((company, companyIndex) => {
    const companyApplications = applicationMetadata
      .filter((application) => application.companyIndex === companyIndex)
      .sort((left, right) => right.submittedAt - left.submittedAt)
      .slice(0, 4);
    const staffOffset = companyIndex * 3;
    const recruiterIndexes = [staffOffset, staffOffset + 2];

    recruiterIndexes.forEach((staffIndex, recipientPosition) => {
      companyApplications.slice(0, 3).forEach((application, position) => {
        const candidateName = CANDIDATE_NAMES[application.candidateIndex];
        const jobTitle = JOBS[application.jobIndex].title;
        const createdAt = addDays(
          application.submittedAt,
          0.01 + recipientPosition * 0.005,
        );
        notifications.push({
          id: demoUuid("c3000000", ++notificationIndex),
          user_id: IDENTITIES.staff[staffIndex],
          type: "new_application",
          title: `${candidateName} applied to ${jobTitle}`,
          body: "Open the pipeline to review the application and seeded fit insights.",
          related_application_id: application.id,
          related_job_id: IDENTITIES.jobs[application.jobIndex],
          read_at: position === 2 ? addDays(createdAt, 0.03) : null,
          created_at: createdAt,
          updated_at: createdAt,
        });
      });
    });
  });

  for (let candidateIndex = 0; candidateIndex < 6; candidateIndex += 1) {
    const ownedApplications = applicationMetadata
      .filter((application) => application.candidateIndex === candidateIndex)
      .sort((left, right) => right.latestChangeAt - left.latestChangeAt);
    const application = ownedApplications[0];
    if (application) {
      const jobTitle = JOBS[application.jobIndex].title;
      const createdAt = addDays(application.latestChangeAt, 0.01);
      notifications.push({
        id: demoUuid("c3000000", ++notificationIndex),
        user_id: IDENTITIES.candidateUsers[candidateIndex],
        type: "stage_change",
        title: `Your application for ${jobTitle} is now ${application.stage.toLowerCase()}`,
        body: "Open your application timeline to see the latest progress.",
        related_application_id: application.id,
        related_job_id: null,
        read_at: candidateIndex % 2 === 0 ? null : addDays(createdAt, 0.02),
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    const invitation = findUnappliedOpenJobs(candidateIndex, applicationMetadata)[0];
    if (invitation) {
      const createdAt = new Date(
        now.getTime() - (candidateIndex + 2) * 3 * 60 * 60 * 1000,
      );
      notifications.push({
        id: demoUuid("c3000000", ++notificationIndex),
        user_id: IDENTITIES.candidateUsers[candidateIndex],
        type: "invite_to_apply",
        title: `You're invited to apply for ${invitation.job.title}`,
        body: "A recruiter thinks this opening could be a strong match for your background.",
        related_application_id: null,
        related_job_id: IDENTITIES.jobs[invitation.index],
        read_at: null,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }
  }

  return notifications;
}

function buildAssets(privateResumeAssets) {
  return {
    logos: COMPANIES.map((company) => ({
      source: company.logoFile,
      publicPath: `demo/company-logos/${company.logoFile}`,
    })),
    publicResumes: RESUME_FIXTURES.map((fixture) => ({
      source: fixture.source,
      publicPath: `demo/resumes/${fixture.publicName}`,
    })),
    privateResumes: privateResumeAssets,
  };
}

function buildDemoData(now, passwordHash) {
  const candidates = buildCandidateRows(now, passwordHash);
  const jobs = buildJobRows(now);
  const applicationData = buildApplicationRows(now);
  const interviewData = buildInterviewData(
    now,
    applicationData.applicationMetadata,
  );
  const talentPoolData = buildTalentPoolData(
    now,
    applicationData.applicationMetadata,
  );
  const candidateHomeData = buildCandidateHomeData(
    now,
    applicationData.applicationMetadata,
  );

  return {
    companies: buildCompanyRows(now),
    users: [...buildStaffRows(now, passwordHash), ...candidates.users],
    candidateProfiles: candidates.profiles,
    workExperiences: candidates.workExperiences,
    education: candidates.education,
    skills: buildSkillRows(now),
    candidateSkills: candidates.candidateSkills,
    jobs: jobs.jobs,
    jobSkills: jobs.jobSkills,
    applications: applicationData.applications,
    stageHistory: applicationData.history,
    applicationNotes: interviewData.notes,
    interviewAssignments: interviewData.assignments,
    scorecardTemplates: interviewData.templates,
    scorecardCriteria: interviewData.criteria,
    interviewScorecards: interviewData.scorecards,
    scorecardRatings: interviewData.ratings,
    candidateTags: talentPoolData.tags,
    candidatePoolEntries: talentPoolData.poolEntries,
    candidatePoolTags: talentPoolData.poolTags,
    savedJobs: candidateHomeData.savedJobs,
    recommendations: candidateHomeData.recommendations,
    notifications: buildNotifications(now, applicationData.applicationMetadata),
    assets: buildAssets(applicationData.privateResumeAssets),
    applicationMetadata: applicationData.applicationMetadata,
  };
}

module.exports = {
  COMPANIES,
  DEMO_PASSWORD,
  IDENTITIES,
  JOBS,
  LEGACY_HEX_SKILL_IDS,
  RESUME_FIXTURES,
  SKILLS,
  buildDemoData,
  demoUuid,
};
