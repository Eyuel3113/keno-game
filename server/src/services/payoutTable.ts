// Payout multipliers per [picks][hits]
// payoutTable[picks][hits] = multiplier
export const payoutTable: Record<number, number[]> = {
  1:  [0, 3],
  2:  [0, 0, 9],
  3:  [0, 0, 2, 27],
  4:  [0, 0, 1, 4, 72],
  5:  [0, 0, 0, 3, 12, 120],
  6:  [0, 0, 0, 2, 5, 40, 500],
  7:  [0, 0, 0, 1, 3, 15, 100, 1000],
  8:  [0, 0, 0, 0, 2, 8, 50, 500, 5000],
  9:  [0, 0, 0, 0, 1, 5, 20, 150, 2000, 20000],
  10: [0, 0, 0, 0, 0, 2, 20, 100, 500, 10000, 100000],
};

export const calculatePayout = (picks: number, hits: number, amount: number): number => {
  const multiplierRow = payoutTable[picks];
  if (!multiplierRow) return 0;
  const multiplier = multiplierRow[hits] ?? 0;
  return amount * multiplier;
};
