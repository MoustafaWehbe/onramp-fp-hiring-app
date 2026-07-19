import type { UserRole } from "@starter-kit/shared/auth";
import {
  serializeApplicationNote,
  serializeApplicationNotes,
  serializeAIScreening,
  serializeAIScreenings,
} from "../../src/lib/serializers";

const mockNote = {
  id: "note-1",
  applicationId: "app-1",
  authorId: "recruiter-1",
  content: "Strong technical round.",
  rating: 4,
};

const mockScreening = {
  id: "screening-1",
  applicationId: "app-1",
  coreAlignment: "Good fit for the role.",
  strengths: ["Postgres depth"],
  skillsGaps: ["No GraphQL"],
  interviewQuestions: ["Tell me about a migration."],
  fitScore: 87,
  model: "claude-sonnet-5",
  tokensUsed: 4231,
  costUsd: "0.0412",
};

// ─── ApplicationNote: candidates never see it, everyone internal sees all of it ──

describe("serializeApplicationNote", () => {
  it("returns null for CANDIDATE", () => {
    expect(serializeApplicationNote(mockNote, "CANDIDATE")).toBeNull();
  });

  it.each<UserRole>(["RECRUITER", "INTERVIEWER", "ADMIN"])(
    "returns the full note, unmodified, for %s",
    (role) => {
      expect(serializeApplicationNote(mockNote, role)).toEqual(mockNote);
    },
  );
});

describe("serializeApplicationNotes (list)", () => {
  it("returns an empty array for CANDIDATE rather than an array of nulls", () => {
    expect(serializeApplicationNotes([mockNote, mockNote], "CANDIDATE")).toEqual([]);
  });

  it("returns the full list for RECRUITER", () => {
    const notes = [mockNote, { ...mockNote, id: "note-2" }];
    expect(serializeApplicationNotes(notes, "RECRUITER")).toEqual(notes);
  });
});

// ─── AIScreening: candidates never see it; INTERVIEWER loses the cost fields ────

describe("serializeAIScreening", () => {
  it("returns null for CANDIDATE", () => {
    expect(serializeAIScreening(mockScreening, "CANDIDATE")).toBeNull();
  });

  it("strips model/tokensUsed/costUsd for INTERVIEWER but keeps the rest", () => {
    const result = serializeAIScreening(mockScreening, "INTERVIEWER");

    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("model");
    expect(result).not.toHaveProperty("tokensUsed");
    expect(result).not.toHaveProperty("costUsd");
    expect(result?.fitScore).toBe(87);
    expect(result?.coreAlignment).toBe(mockScreening.coreAlignment);
    expect(result?.strengths).toEqual(mockScreening.strengths);
  });

  it.each<UserRole>(["RECRUITER", "ADMIN"])(
    "returns every field, including cost fields, for %s",
    (role) => {
      expect(serializeAIScreening(mockScreening, role)).toEqual(mockScreening);
    },
  );

  it("does not mutate the original object when stripping fields", () => {
    const original = { ...mockScreening };
    serializeAIScreening(mockScreening, "INTERVIEWER");
    expect(mockScreening).toEqual(original);
  });
});

describe("serializeAIScreenings (list)", () => {
  it("returns an empty array for CANDIDATE", () => {
    expect(serializeAIScreenings([mockScreening], "CANDIDATE")).toEqual([]);
  });

  it("strips cost fields from every item for INTERVIEWER", () => {
    const screenings = [mockScreening, { ...mockScreening, id: "screening-2" }];
    const result = serializeAIScreenings(screenings, "INTERVIEWER");

    expect(result).toHaveLength(2);
    for (const item of result) {
      expect(item).not.toHaveProperty("model");
      expect(item).not.toHaveProperty("tokensUsed");
      expect(item).not.toHaveProperty("costUsd");
    }
  });

  it("keeps cost fields for RECRUITER/ADMIN", () => {
    const result = serializeAIScreenings([mockScreening], "ADMIN");
    expect(result[0]).toEqual(mockScreening);
  });
});
