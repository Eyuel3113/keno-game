import { useStore } from '../store';
import { gameApi, historyApi } from '../api';

export const useGame = () => {
  const {
    picks,
    setPicks,
    setBalance,
    setBetHistory,
    allRoundPicks,
    setAllRoundPicks,
    currentRoundId,
  } = useStore();

  const togglePick = (number: number) => {
    if (picks.includes(number)) {
      setPicks(picks.filter((p) => p !== number));
    } else if (picks.length < 10) {
      setPicks([...picks, number]);
    }
  };

  const quickPick = (count: number) => {
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    const shuffled = pool.sort(() => Math.random() - 0.5);
    setPicks(shuffled.slice(0, count));
  };

  const clearPicks = () => setPicks([]);

  const placeBet = async (amount: number): Promise<boolean> => {
    if (!currentRoundId || picks.length === 0) return false;
    const picksSnapshot = [...picks];
    try {
      const res = await gameApi.placeBet(currentRoundId, picksSnapshot, amount);
      const { balance } = res.data;

      // Update local wallet balance immediately after bet placement
      setBalance(balance);

      // Accumulate all picks placed this round for hit highlighting
      const merged = Array.from(new Set([...allRoundPicks, ...picksSnapshot]));
      setAllRoundPicks(merged);

      // Clear picks to allow a new bet combination
      setPicks([]);

      refreshHistory();
      return true;
    } catch (error) {
      console.error('[useGame] placeBet error:', error);
      throw error;
    }
  };

  const refreshHistory = async () => {
    try {
      const res = await historyApi.getHistory(20);
      const rawBets = Array.isArray(res.data)
        ? res.data
        : (res.data as unknown as { bets: any[] })?.bets || [];

      const mapped = rawBets.map((b: any) => {
        return {
          id: b.id,
          amount: b.amount,
          picks: b.picks,
          roundId: b.roundId,
          drawnNumbers: b.drawnNumbers || [],
          hits: b.hits || 0,
          payout: b.payout || 0,
          createdAt: b.createdAt,
        };
      });
      setBetHistory(mapped);
    } catch (err) {
      console.error('[useGame] refreshHistory error:', err);
    }
  };

  return { togglePick, quickPick, clearPicks, placeBet, refreshHistory };
};
