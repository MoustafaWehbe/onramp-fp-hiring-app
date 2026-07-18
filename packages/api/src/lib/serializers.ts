import { isInternalRole, type UserRole } from "@starter-kit/shared/auth";

/**
 * Role-keyed response stripping, centralized here instead of ad-hoc field
 * deletion in each controller. Rules (see migration comment on ai_screenings
 * for the cost-field grouping this mirrors):
 *  - CANDIDATE: never receives ApplicationNote or AIScreening data at all.
 *  - INTERVIEWER: receives AIScreening but not its cost fields.
 *  - RECRUITER / ADMIN: see everything.
 */

interface FieldPolicy<T> {
  /** Absent = visible to every internal role; present = only these roles see it at all. */
  visibleTo?: readonly UserRole[];
  /** Fields stripped for specific roles that otherwise pass visibleTo. */
  hideFieldsFor?: Partial<Record<UserRole, readonly (keyof T)[]>>;
}

function serializeForRole<T extends Record<string, unknown>>(
  data: T,
  role: UserRole,
  policy: FieldPolicy<T>,
): T | null {
  if (!isInternalRole(role)) {
    return null;
  }

  if (policy.visibleTo && !policy.visibleTo.includes(role)) {
    return null;
  }

  const hidden = policy.hideFieldsFor?.[role];

  if (!hidden || hidden.length === 0) {
    return data;
  }

  const stripped = { ...data };
  for (const field of hidden) {
    delete stripped[field];
  }
  return stripped;
}

function serializeListForRole<T extends Record<string, unknown>>(
  items: readonly T[],
  role: UserRole,
  policy: FieldPolicy<T>,
): T[] {
  if (!isInternalRole(role)) {
    return [];
  }

  return items
    .map((item) => serializeForRole(item, role, policy))
    .filter((item): item is T => item !== null);
}

// --- ApplicationNote: candidates never see notes; internal roles see everything ---

export interface ApplicationNoteLike {
  [key: string]: unknown;
}

const applicationNotePolicy: FieldPolicy<ApplicationNoteLike> = {};

export function serializeApplicationNote<T extends ApplicationNoteLike>(
  note: T,
  role: UserRole,
): T | null {
  return serializeForRole(note, role, applicationNotePolicy);
}

export function serializeApplicationNotes<T extends ApplicationNoteLike>(
  notes: readonly T[],
  role: UserRole,
): T[] {
  return serializeListForRole(notes, role, applicationNotePolicy);
}

// --- AIScreening: candidates never see it; INTERVIEWER loses the cost fields ---

export interface AIScreeningLike {
  model?: unknown;
  tokensUsed?: unknown;
  costUsd?: unknown;
  [key: string]: unknown;
}

const AI_SCREENING_COST_FIELDS = ["model", "tokensUsed", "costUsd"] as const;

const aiScreeningPolicy: FieldPolicy<AIScreeningLike> = {
  hideFieldsFor: {
    INTERVIEWER: AI_SCREENING_COST_FIELDS,
  },
};

export function serializeAIScreening<T extends AIScreeningLike>(
  screening: T,
  role: UserRole,
): T | null {
  return serializeForRole(screening, role, aiScreeningPolicy);
}

export function serializeAIScreenings<T extends AIScreeningLike>(
  screenings: readonly T[],
  role: UserRole,
): T[] {
  return serializeListForRole(screenings, role, aiScreeningPolicy);
}
