import { getSequelize, Skill } from "@starter-kit/shared/db";
import {
  Op,
  col,
  fn,
  where as sqlWhere,
  type Transaction,
} from "sequelize";

const SEARCH_RESULT_LIMIT = 20;

function serializeSkill(skill: Skill) {
  return {
    id: skill.id,
    name: skill.name,
  };
}

export class SkillService {
  async search(query: string) {
    const skills = await Skill.findAll({
      attributes: ["id", "name"],
      where: {
        name: {
          [Op.iLike]: `%${query.trim()}%`,
        },
      },
      order: [[fn("LOWER", col("name")), "ASC"], ["id", "ASC"]],
      limit: SEARCH_RESULT_LIMIT,
    });

    return skills.map(serializeSkill);
  }

  /**
   * Resolve a free-form name to the shared catalog row. The transaction-level
   * advisory lock closes the find-then-create race for callers such as job
   * creation that are already inside a larger transaction. The functional
   * unique index added by the matching migration is the final database guard.
   */
  async findOrCreateByName(
    name: string,
    transaction?: Transaction,
  ): Promise<{ skill: Skill; created: boolean }> {
    const normalizedName = name.trim();

    if (!transaction) {
      return getSequelize().transaction((nextTransaction) =>
        this.findOrCreateByName(normalizedName, nextTransaction),
      );
    }

    await getSequelize().query(
      "SELECT pg_advisory_xact_lock(hashtextextended(LOWER(:name), 0))",
      {
        replacements: { name: normalizedName },
        transaction,
      },
    );

    const existing = await Skill.findOne({
      where: sqlWhere(
        fn("LOWER", col("name")),
        normalizedName.toLocaleLowerCase(),
      ),
      transaction,
    });

    if (existing) {
      return { skill: existing, created: false };
    }

    const skill = await Skill.create({ name: normalizedName }, { transaction });
    return { skill, created: true };
  }

  async create(input: { name: string }) {
    const { skill, created } = await this.findOrCreateByName(input.name);

    return {
      skill: serializeSkill(skill),
      created,
    };
  }
}

export const skillService = new SkillService();
