import {
  buildFitScoreMessages,
  InsufficientResumeSignalsError,
  parseFitScoreResponse,
  scoreApplicationFit,
} from "@starter-kit/shared/ai";

const input = {
  job: {
    title: "Senior Product Engineer",
    description:
      "Build accessible React and TypeScript experiences for hiring teams.",
    experienceMin: 4,
    experienceMax: 7,
    requiredSkills: ["React", "TypeScript", "Node.js"],
  },
  resume: {
    text:
      "Product engineer with 6 years of experience building React and TypeScript applications.",
    parsedSkills: ["React", "TypeScript"],
    parsedYearsExperience: 6,
  },
};

describe("AI fit-score response handling", () => {
  it("strictly accepts a valid structured response", () => {
    expect(
      parseFitScoreResponse(
        JSON.stringify({
          fit_score: 86,
          summary:
            "The candidate aligns strongly with the product engineering requirements. Their stated experience covers the primary frontend skills.",
          strengths: [
            "Six years of relevant product experience",
            "Direct React and TypeScript evidence",
          ],
          gaps: ["No explicit Node.js delivery examples"],
        }),
      ),
    ).toEqual({
      fit_score: 86,
      summary:
        "The candidate aligns strongly with the product engineering requirements. Their stated experience covers the primary frontend skills.",
      strengths: [
        "Six years of relevant product experience",
        "Direct React and TypeScript evidence",
      ],
      gaps: ["No explicit Node.js delivery examples"],
    });
  });

  it.each([
    "not-json",
    JSON.stringify({
      fit_score: 101,
      summary: "This summary is long enough to pass its own validation.",
      strengths: [],
      gaps: [],
    }),
    JSON.stringify({
      fit_score: 75,
      summary: "This summary is long enough to pass its own validation.",
      strengths: ["One", "Two", "Three", "Four"],
      gaps: [],
    }),
    JSON.stringify({
      fit_score: 75,
      summary: "This summary is long enough to pass its own validation.",
      strengths: [],
      gaps: [],
      unexpected: "garbage",
    }),
  ])("rejects malformed or non-conforming output", (content) => {
    expect(() => parseFitScoreResponse(content)).toThrow();
  });

  it("uses the injected completion and validates its result", async () => {
    const completion = jest.fn().mockResolvedValue(
      JSON.stringify({
        fit_score: 72,
        summary:
          "The candidate has relevant frontend evidence. Backend depth is less clearly demonstrated.",
        strengths: ["Relevant React experience"],
        gaps: ["Node.js depth is unclear"],
      }),
    );

    await expect(scoreApplicationFit(input, completion)).resolves.toMatchObject({
      fit_score: 72,
      strengths: ["Relevant React experience"],
    });
    expect(completion).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly without any resume signal and never calls the LLM", async () => {
    const completion = jest.fn();

    await expect(
      scoreApplicationFit(
        {
          ...input,
          resume: {
            text: null,
            parsedSkills: [],
            parsedYearsExperience: null,
          },
        },
        completion,
      ),
    ).rejects.toBeInstanceOf(InsufficientResumeSignalsError);
    expect(completion).not.toHaveBeenCalled();
  });

  it("labels supplied resume text as untrusted candidate evidence", () => {
    const messages = buildFitScoreMessages(input);

    expect(messages[0]?.content).toContain("untrusted data");
    expect(messages[1]?.content).toContain("resume_text");
    expect(messages[1]?.content).toContain("required_skills");
  });
});
