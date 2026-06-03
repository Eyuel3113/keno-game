export const drawNumbers = (): number[] => {
  const pool = Array.from({ length: 80 }, (_, i) => i + 1);
  // Fisher-Yates shuffle, take first 20
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, 20);
};

export const calculateHits = (picks: number[], drawn: number[]): number => {
  return picks.filter(pick => drawn.includes(pick)).length;
};
