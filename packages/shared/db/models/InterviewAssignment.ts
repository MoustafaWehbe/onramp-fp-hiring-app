import { Model, DataTypes, type Sequelize, type Optional } from "sequelize";

/**
 * Assigns an INTERVIEWER to an application. This is what grants the
 * interviewer read access to that application.
 */
export interface InterviewAssignmentAttributes {
  id: string;
  applicationId: string;
  interviewerId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type InterviewAssignmentCreationAttributes = Optional<
  InterviewAssignmentAttributes,
  "id"
>;

export class InterviewAssignment
  extends Model<
    InterviewAssignmentAttributes,
    InterviewAssignmentCreationAttributes
  >
  implements InterviewAssignmentAttributes
{
  declare id: string;
  declare applicationId: string;
  declare interviewerId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initModel(sequelize: Sequelize): typeof InterviewAssignment {
    InterviewAssignment.init(
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
        interviewerId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE",
        },
      },
      {
        sequelize,
        tableName: "interview_assignments",
        timestamps: true,
        underscored: true,
        indexes: [
          // An interviewer is assigned to a given application only once.
          {
            unique: true,
            fields: ["application_id", "interviewer_id"],
          },
        ],
      },
    );
    return InterviewAssignment;
  }
}
