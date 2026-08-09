import type { Transaction } from "sequelize";
import {
  getSequelize,
  InterviewScorecard,
  ScorecardCriterion,
  ScorecardRating,
  ScorecardTemplate,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

interface CriterionInput {
  id?: string;
  label: string;
  description?: string | null;
}

interface TemplateInput {
  title: string;
  criteria: CriterionInput[];
}

/**
 * The criteria a company gets when it has none yet.
 *
 * Offered as a starting point the recruiter explicitly accepts — never
 * written on their behalf. See the note on `listForCompany` for why.
 */
export const STARTER_CRITERIA: readonly { label: string; description: string }[] =
  [
    {
      label: "Technical",
      description:
        "Depth and accuracy in the craft the role actually calls for.",
    },
    {
      label: "Communication",
      description:
        "Explains their reasoning clearly and listens to what was asked.",
    },
    {
      label: "Culture fit",
      description: "How they collaborate, take feedback, and handle ambiguity.",
    },
  ];

const criteriaInclude = {
  model: ScorecardCriterion,
  as: "criteria",
} as const;

/** Criteria always come back in the order the recruiter arranged them. */
const criteriaOrder = [
  [{ model: ScorecardCriterion, as: "criteria" }, "sortOrder", "ASC"],
] as never;

type TemplateWithCriteria = ScorecardTemplate & {
  criteria?: ScorecardCriterion[];
};

export class ScorecardTemplatesService {
  /**
   * Every template for a company, newest first.
   *
   * An empty array is a real answer, not a gap to paper over. The alternative
   * — materialising a default template on first read — was rejected: ratings
   * carry a foreign key to `scorecard_criteria`, so any usable fallback has to
   * be real rows, and that would turn a GET into a write. A company would end
   * up owning a template nobody created, appearing in this very list, editable
   * and deletable like one they had made on purpose. The frontend renders the
   * empty array as guidance and offers STARTER_CRITERIA as a prefilled form
   * the recruiter submits themselves.
   */
  async listForCompany(companyId: string): Promise<TemplateWithCriteria[]> {
    return ScorecardTemplate.findAll({
      where: { companyId },
      include: [criteriaInclude],
      order: [["createdAt", "DESC"], ...criteriaOrder],
    }) as Promise<TemplateWithCriteria[]>;
  }

  async getById(templateId: string): Promise<TemplateWithCriteria | null> {
    return ScorecardTemplate.findByPk(templateId, {
      include: [criteriaInclude],
      order: criteriaOrder,
    }) as Promise<TemplateWithCriteria | null>;
  }

  async create(
    companyId: string,
    createdBy: string,
    input: TemplateInput,
  ): Promise<TemplateWithCriteria> {
    const template = await getSequelize().transaction(async (transaction) => {
      const created = await ScorecardTemplate.create(
        { companyId, createdBy, title: input.title },
        { transaction },
      );

      await ScorecardCriterion.bulkCreate(
        input.criteria.map((criterion, index) => ({
          templateId: created.id,
          label: criterion.label,
          description: criterion.description ?? null,
          // Position in the submitted array is the order — see the schema.
          sortOrder: index,
        })),
        { transaction },
      );

      return created;
    });

    return (await this.getById(template.id))!;
  }

  /**
   * Replace a template's title and criteria list.
   *
   * Reconciled rather than wiped and rebuilt: a criterion the client sends
   * back with its id keeps that id, and therefore keeps every rating already
   * pointing at it. Dropping and recreating would silently detach history
   * even when the label was unchanged.
   *
   * Removals are the dangerous half, so they are checked before anything is
   * written: if a criterion being dropped already has ratings, the whole
   * update is refused with a 409 naming it. Adding and reordering are always
   * safe and stay allowed.
   */
  async update(
    templateId: string,
    input: TemplateInput,
  ): Promise<TemplateWithCriteria> {
    const template = await ScorecardTemplate.findByPk(templateId);

    if (!template) {
      throw createError("Scorecard template not found", 404);
    }

    const existing = await ScorecardCriterion.findAll({
      where: { templateId },
    });
    const existingById = new Map(existing.map((row) => [row.id, row]));

    // An id we don't recognise is a client sending another template's
    // criterion; treating it as "keep" would move a criterion between
    // templates.
    for (const criterion of input.criteria) {
      if (criterion.id && !existingById.has(criterion.id)) {
        throw createError(
          "One of the criteria does not belong to this template",
          422,
        );
      }
    }

    const keptIds = new Set(
      input.criteria
        .map((criterion) => criterion.id)
        .filter((id): id is string => Boolean(id)),
    );
    const removed = existing.filter((row) => !keptIds.has(row.id));

    if (removed.length > 0) {
      const blocked = await this.findCriteriaWithRatings(
        removed.map((row) => row.id),
      );

      if (blocked.length > 0) {
        const labels = removed
          .filter((row) => blocked.includes(row.id))
          .map((row) => row.label)
          .join(", ");

        throw createError(
          `Cannot remove ${labels} — ${
            blocked.length === 1 ? "it has" : "they have"
          } already been scored on submitted scorecards. Add new criteria instead.`,
          409,
        );
      }
    }

    await getSequelize().transaction(async (transaction) => {
      await template.update({ title: input.title }, { transaction });

      for (const [index, criterion] of input.criteria.entries()) {
        if (criterion.id) {
          await existingById.get(criterion.id)!.update(
            {
              label: criterion.label,
              description: criterion.description ?? null,
              sortOrder: index,
            },
            { transaction },
          );
        } else {
          await ScorecardCriterion.create(
            {
              templateId,
              label: criterion.label,
              description: criterion.description ?? null,
              sortOrder: index,
            },
            { transaction },
          );
        }
      }

      if (removed.length > 0) {
        await ScorecardCriterion.destroy({
          where: { id: removed.map((row) => row.id) },
          transaction,
        });
      }
    });

    return (await this.getById(templateId))!;
  }

  /**
   * Deleting a template is refused once anything has been submitted against
   * it, for the same reason removing a scored criterion is: the scorecards
   * would lose the definition of what their numbers meant.
   */
  async remove(templateId: string): Promise<void> {
    const template = await ScorecardTemplate.findByPk(templateId);

    if (!template) {
      throw createError("Scorecard template not found", 404);
    }

    const submitted = await InterviewScorecard.count({ where: { templateId } });

    if (submitted > 0) {
      throw createError(
        `Cannot delete this template — ${submitted} scorecard${
          submitted === 1 ? " has" : "s have"
        } already been submitted against it.`,
        409,
      );
    }

    await template.destroy();
  }

  /** Which of these criterion ids already have a rating against them. */
  private async findCriteriaWithRatings(
    criterionIds: string[],
    transaction?: Transaction,
  ): Promise<string[]> {
    if (criterionIds.length === 0) {
      return [];
    }

    const rated = await ScorecardRating.findAll({
      where: { criterionId: criterionIds },
      attributes: ["criterionId"],
      group: ["criterionId"],
      transaction,
    });

    return rated.map((row) => row.criterionId);
  }
}

export const scorecardTemplatesService = new ScorecardTemplatesService();
