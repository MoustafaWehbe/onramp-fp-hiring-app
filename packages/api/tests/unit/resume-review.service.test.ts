import { APIConnectionError } from "openai";
import {
  buildResumeReviewMessages,
  InsufficientResumeContentError,
  isTransientNetworkError,
  parseResumeReviewResponse,
  reviewResumeForJob,
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
    text: "Product engineer with 6 years of experience building React and TypeScript applications.",
  },
};

describe("AI resume-review response handling", () => {
  it("strictly accepts a valid structured response", () => {
    expect(
      parseResumeReviewResponse(
        JSON.stringify({
          score: 78,
          pros: ["Six years of directly relevant product experience"],
          cons: ["No mention of Node.js delivery work"],
          suggestions: ["Call out a specific Node.js project, if any"],
        }),
      ),
    ).toEqual({
      score: 78,
      pros: ["Six years of directly relevant product experience"],
      cons: ["No mention of Node.js delivery work"],
      suggestions: ["Call out a specific Node.js project, if any"],
    });
  });

  it.each([
    "not-json",
    JSON.stringify({
      score: 101,
      pros: ["ok"],
      cons: ["ok"],
      suggestions: ["ok"],
    }),
    JSON.stringify({
      score: 70,
      pros: [],
      cons: ["ok"],
      suggestions: ["ok"],
    }),
    JSON.stringify({
      score: 70,
      pros: ["ok"],
      cons: ["ok"],
      suggestions: ["ok"],
      unexpected: "garbage",
    }),
  ])("rejects malformed or non-conforming output", (content) => {
    expect(() => parseResumeReviewResponse(content)).toThrow();
  });

  it("uses the injected completion and validates its result", async () => {
    const completion = jest.fn().mockResolvedValue(
      JSON.stringify({
        score: 65,
        pros: ["Relevant React experience"],
        cons: ["Node.js depth is unclear"],
        suggestions: ["Add a Node.js-focused project"],
      }),
    );

    await expect(
      reviewResumeForJob(input, completion),
    ).resolves.toMatchObject({
      score: 65,
      pros: ["Relevant React experience"],
    });
    expect(completion).toHaveBeenCalledTimes(1);
  });

  it("fails explicitly on empty resume text and never calls the LLM", async () => {
    const completion = jest.fn();

    await expect(
      reviewResumeForJob(
        { ...input, resume: { text: "   " } },
        completion,
      ),
    ).rejects.toBeInstanceOf(InsufficientResumeContentError);
    expect(completion).not.toHaveBeenCalled();
  });

  it("labels supplied job and resume text as untrusted data, scoped to this job", () => {
    const messages = buildResumeReviewMessages(input);

    expect(messages[0]?.content).toContain("untrusted data");
    expect(messages[0]?.content).toContain("different job");
    expect(messages[1]?.content).toContain("resume_text");
    expect(messages[1]?.content).toContain("required_skills");
  });
});

describe("transient network error detection (retry eligibility)", () => {
  it("flags a connection failure — the SDK's shape for a dropped/premature-close socket", () => {
    expect(
      isTransientNetworkError(
        new APIConnectionError({
          message: "Premature close",
          cause: new Error("Premature close"),
        }),
      ),
    ).toBe(true);
  });

  it.each([
    new Error("some unrelated failure"),
    new TypeError("fetch failed"),
    { message: "not even an Error instance" },
    null,
    undefined,
  ])("does not flag a non-connection error as retryable", (error) => {
    expect(isTransientNetworkError(error)).toBe(false);
  });
});
