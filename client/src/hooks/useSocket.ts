import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store';

let socketInstance: Socket | null = null;

export const useSocket = () => {
  const {
    setDrawnNumbers,
    setIsDrawing,
    setCurrentRoundId,
    setCountdown,
    setBettingDuration,
    setAllRoundPicks,
    setLastPayout,
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
    socket.on('round:result', ({ roundId: _roundId, drawnNumbers }: { roundId: string; drawnNumbers: number[] }) => {
      setDrawnNumbers(drawnNumbers);
      setIsDrawing(false);
      setCountdown(0);
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
