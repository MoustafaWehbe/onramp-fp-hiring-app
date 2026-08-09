import type {
  ScorecardCriterion,
  ScorecardTemplate,
} from "@starter-kit/shared/db";

/**
 * Shapes the template rows into the response body.
 *
 * Kept out of the service so the service returns models and the HTTP layer
 * decides what leaves the building — `companyId` and `createdBy` are internal
 * scoping fields the client has no use for and should not learn.
 */

export interface SerializedCriterion {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface SerializedTemplate {
  id: string;
  title: string;
  createdAt: string;
  criteria: SerializedCriterion[];
}

type TemplateWithCriteria = ScorecardTemplate & {
  criteria?: ScorecardCriterion[];
};

export function serializeCriterion(
  criterion: ScorecardCriterion,
): SerializedCriterion {
  return {
    id: criterion.id,
    label: criterion.label,
    description: criterion.description ?? null,
    sortOrder: criterion.sortOrder,
  };
}

export function serializeTemplate(
  template: TemplateWithCriteria,
): SerializedTemplate {
  return {
    id: template.id,
    title: template.title,
    createdAt: template.createdAt.toISOString(),
    criteria: [...(template.criteria ?? [])]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(serializeCriterion),
  };
}
