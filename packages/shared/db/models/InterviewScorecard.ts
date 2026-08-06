import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

export interface InterviewScorecardAttributes {
  id: string;
  applicationId: string;
  templateId: string;
  /** The recruiter who filled it in. */
  interviewerId: string;
  overallComment?: string | null;
  submittedAt: Date;
}

export type InterviewScorecardCreationAttributes = Optional<
  InterviewScorecardAttributes,
  "id" | "overallComment" | "submittedAt"
>;

/**
 * One interviewer's evaluation of one application.
 *
 * `submittedAt` is maintained by hand rather than by Sequelize timestamps
 * because a resubmission overwrites the row: the meaningful time is when this
 * scorecard was last stood behind, which is exactly what the upsert sets.
 */
export class InterviewScorecard
  extends Model<
    InterviewScorecardAttributes,
    InterviewScorecardCreationAttributes
  >
  implements InterviewScorecardAttributes
{
  declare id: string;
  declare applicationId: string;
  declare templateId: string;
  declare interviewerId: string;
  declare overallComment: string | null | undefined;
  declare submittedAt: Date;

  static initModel(sequelize: Sequelize): typeof InterviewScorecard {
    InterviewScorecard.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        applicationId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "applications", key: "id" },
          onDelete: "CASCADE",
        },
        templateId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "scorecard_templates", key: "id" },
        },
        interviewerId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
        },
        overallComment: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        submittedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        sequelize,
        tableName: "interview_scorecards",
        timestamps: false,
        underscored: true,
        indexes: [
          {
            unique: true,
            fields: ["application_id", "interviewer_id"],
            name: "interview_scorecards_application_id_interviewer_id_key",
          },
        ],
      },
    );
    return InterviewScorecard;
  }
}
