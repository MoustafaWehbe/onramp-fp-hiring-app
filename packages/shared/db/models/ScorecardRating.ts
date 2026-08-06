import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/** Fixed for this phase — templates cannot vary the scale. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

export interface ScorecardRatingAttributes {
  id: string;
  scorecardId: string;
  criterionId: string;
  rating: number;
  comment?: string | null;
}

export type ScorecardRatingCreationAttributes = Optional<
  ScorecardRatingAttributes,
  "id" | "comment"
>;

export class ScorecardRating
  extends Model<ScorecardRatingAttributes, ScorecardRatingCreationAttributes>
  implements ScorecardRatingAttributes
{
  declare id: string;
  declare scorecardId: string;
  declare criterionId: string;
  declare rating: number;
  declare comment: string | null | undefined;

  static initModel(sequelize: Sequelize): typeof ScorecardRating {
    ScorecardRating.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        scorecardId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "interview_scorecards", key: "id" },
          onDelete: "CASCADE",
        },
        criterionId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "scorecard_criteria", key: "id" },
          onDelete: "RESTRICT",
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
          validate: {
            min: RATING_MIN,
            max: RATING_MAX,
          },
        },
        comment: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: "scorecard_ratings",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["scorecard_id", "criterion_id"],
            name: "scorecard_ratings_scorecard_id_criterion_id_key",
          },
        ],
      },
    );
    return ScorecardRating;
  }
}
