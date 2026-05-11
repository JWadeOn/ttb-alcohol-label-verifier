/** Edit distance for deterministic fuzzy comparisons (brand / class / origin). */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: n + 1 }, (_, j) => j);

  for (let i = 1; i <= m; i++) {
    let prevDiagonal = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const prevAbove = dp[j];
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(
        prevAbove + 1,
        dp[j - 1] + 1,
        prevDiagonal + cost,
      );
      prevDiagonal = prevAbove;
    }
  }

  return dp[n];
}
