import { computeTopPercentile } from "../../src/lib/applicant-percentile";

describe("computeTopPercentile", () => {
  it("puts a sole applicant at the top of a pool of one", () => {
    expect(computeTopPercentile(85, [85])).toBe(100);
  });

  it("ranks the higher of two distinct scores in the top half", () => {
    expect(computeTopPercentile(90, [90, 70])).toBe(50);
  });

  it("ranks the lower of two distinct scores at the bottom of the pool", () => {
    expect(computeTopPercentile(70, [90, 70])).toBe(100);
  });

  it("gives tied applicants the same percentile, based on the shared rank", () => {
    // Three applicants, two tied at 80: both share rank 2 (only the 90 beats
    // them), so both land in the top 67%.
    const pool = [90, 80, 80];
    expect(computeTopPercentile(80, pool)).toBe(67);
    expect(computeTopPercentile(80, pool)).toBe(computeTopPercentile(80, pool));
  });

  it("gives every applicant the same rank-1 percentile when all scores are identical", () => {
    const pool = [75, 75, 75];
    expect(computeTopPercentile(75, pool)).toBe(33);
  });

  it("ranks a three-way tie for the top as rank 1 for all three", () => {
    expect(computeTopPercentile(90, [90, 90, 70])).toBe(33);
  });

  it("computes a mid-pack percentile for a larger, non-tied pool", () => {
    // Scores sorted desc: 95, 88, 76, 60, 40. A 76 is rank 3 of 5 -> 60%.
    const pool = [95, 88, 76, 60, 40];
    expect(computeTopPercentile(76, pool)).toBe(60);
    expect(computeTopPercentile(95, pool)).toBe(20);
    expect(computeTopPercentile(40, pool)).toBe(100);
  });

  it("falls back to 100 for an empty pool rather than dividing by zero", () => {
    expect(computeTopPercentile(85, [])).toBe(100);
  });
});
