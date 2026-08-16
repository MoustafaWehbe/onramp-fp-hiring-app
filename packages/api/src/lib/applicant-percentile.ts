/**
 * "You're in the top N% of applicants for this job" — a competition-style
 * rank (ties share the better rank, like Olympic scoring: 1st, 2nd, 2nd,
 * 4th), expressed as the percentage of the pool at or above that rank.
 *
 * rank = 1 + how many applicants scored strictly higher than this one.
 * topPercentile = round(100 * rank / poolSize).
 *
 * A sole applicant has nothing to be ranked against, so they trivially rank
 * 1st of 1 — "top 100%" is the literal, unavoidable answer when there is
 * only one data point, not a special case carved out here.
 */
export function computeTopPercentile(
  candidateScore: number,
  poolScores: number[],
): number {
  if (poolScores.length === 0) {
    // The candidate's own score should always be included by the caller —
    // this is a defensive floor, not an expected path.
    return 100;
  }

  const rank =
    1 + poolScores.filter((score) => score > candidateScore).length;

  return Math.round((rank / poolScores.length) * 100);
}
