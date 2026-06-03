import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';
import { walletApi, historyApi } from '../api';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const {
    setDrawnNumbers,
    setIsDrawing,
    setCurrentRoundId,
    setCountdown,
    setBettingDuration,
    setAllRoundPicks,
    setBalance,
    setLastPayout,
    setBetHistory,
    token,
  } = useStore();

  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCountdown = (seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(seconds);
    let remaining = seconds;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
      }
    }, 1000);
  };

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const socketUrl = import.meta.env.VITE_SOCKET_URL || `http://${host}:5000`;
      socketInstance = io(socketUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });
    }

    const socket = socketInstance;

    // ── New round starts (betting phase) ──────────────────────────────────
    socket.on('round:new', ({ roundId, bettingSeconds }: { roundId: string; bettingSeconds: number }) => {
      setCurrentRoundId(roundId);
      setDrawnNumbers([]);
      setLastPayout(null, null);
      setIsDrawing(false);
      setAllRoundPicks([]);
      setBettingDuration(bettingSeconds);
      startCountdown(bettingSeconds);
    });

    // ── Server signals drawing has started (betting closed) ───────────────
    socket.on('round:drawing', ({ roundId: _roundId }: { roundId: string }) => {
      setIsDrawing(true);
      // Stop the countdown immediately — betting is closed
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(0);
    });

    // ── Draw results arrived ──────────────────────────────────────────────
    socket.on('round:result', ({ roundId, drawnNumbers }: { roundId: string; drawnNumbers: number[] }) => {
      setDrawnNumbers(drawnNumbers);
      setIsDrawing(false);
      setCountdown(0);

      // Fetch updated wallet balance (non-blocking)
      walletApi.getBalance()
        .then((res) => setBalance(res.data.balance))
        .catch(() => {});

      // Fetch bet history to compute win/loss (non-blocking)
      historyApi.getHistory(20)
        .then((res) => {
          const rawBets = Array.isArray(res.data) ? res.data : (res.data as any)?.bets || [];
          const mapped = rawBets.map((b: any) => ({
            id: b.id,
            amount: b.amount,
            picks: b.picks,
            roundId: b.roundId,
            drawnNumbers: b.drawnNumbers || [],
            hits: b.hits || 0,
            payout: b.payout || 0,
            createdAt: b.createdAt,
          }));
          setBetHistory(mapped);

          const targetRoundId = roundId || useStore.getState().currentRoundId;
          if (targetRoundId) {
            const roundBets = mapped.filter((b: any) => b.roundId === targetRoundId);
            if (roundBets.length > 0) {
              const totalPayout = roundBets.reduce((sum: number, b: any) => sum + b.payout, 0);
              const maxHits = Math.max(...roundBets.map((b: any) => b.hits));
              setLastPayout(totalPayout, maxHits);
            } else {
              setLastPayout(null, null);
            }
          }
        })
        .catch(() => {});
    });

    // ── Reconnect: re-sync state ──────────────────────────────────────────
    socket.on('connect', () => {
      console.log('[Socket] Connected / reconnected');
      // If we reconnected mid-game, the server will send round:current
      // which resets our state. Nothing extra needed here.
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    return () => {
      socket.off('round:new');
      socket.off('round:drawing');
      socket.off('round:result');
      socket.off('connect');
      socket.off('disconnect');
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
};
