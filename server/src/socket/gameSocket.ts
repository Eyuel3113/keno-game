import { Server, Socket } from 'socket.io';
import prisma from '../config/db';
import { drawNumbers, calculateHits } from '../services/gameEngine';
import { calculatePayout } from '../services/payoutTable';

const ROUND_INTERVAL_MS = 90_000;  // total round cycle: 90 seconds
const DRAW_DELAY_MS = 60_000;  // 60s betting phase before drawing
const DB_RETRY_DELAY_MS = 5_000;  // retry delay on DB error

let currentRoundId: string | null = null;

export const getCurrentRoundId = () => currentRoundId;

// Helper: retry a DB operation up to `retries` times before giving up
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[DB] Attempt ${attempt}/${retries} failed:`, (err as Error).message);
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return null;
}

const startGameLoop = (io: Server) => {
  const runRound = async () => {
    // ── 1. Create a new round in the DB ──────────────────────────────────
    let roundId: string | null = null;
    try {
      const round = await withRetry(() =>
        prisma.gameRound.create({ data: { drawnNumbers: [], status: 'PENDING' } })
      );
      if (round) {
        roundId = round.id;
        currentRoundId = round.id;
      }
    } catch (err) {
      console.error('[Socket] Could not create round — will retry:', (err as Error).message);
    }

    // Even if DB failed, broadcast a round:new so clients can still bet
    const broadcastId = roundId ?? `local-${Date.now()}`;
    io.emit('round:new', { roundId: broadcastId, bettingSeconds: DRAW_DELAY_MS / 1000 });
    console.log(`[Socket] New round started: ${broadcastId}`);

    // ── 2. After the betting phase, draw numbers ──────────────────────────
    setTimeout(async () => {
      // Signal clients that drawing has started (before DB ops)
      io.emit('round:drawing', { roundId: broadcastId });

      const drawnNumbers = drawNumbers();

      try {
        if (roundId) {
          // Update round status in DB
          const completed = await withRetry(() =>
            prisma.gameRound.update({
              where: { id: roundId! },
              data: { drawnNumbers, status: 'COMPLETED', endedAt: new Date() },
            })
          );

          if (completed) {
            // Process all bets for this round
            const bets = await withRetry(() =>
              prisma.bet.findMany({ where: { roundId: roundId! } })
            ) ?? [];

            for (const bet of bets) {
              try {
                const hits = calculateHits(bet.picks, drawnNumbers);
                const payout = calculatePayout(bet.picks.length, hits, bet.amount);

                await withRetry(() =>
                  prisma.bet.update({ where: { id: bet.id }, data: { hits, payout } })
                );

                if (payout > 0) {
                  await withRetry(() =>
                    prisma.wallet.update({
                      where: { userId: bet.userId },
                      data: { balance: { increment: payout } },
                    })
                  );
                }
              } catch (betErr) {
                console.error('[Socket] Error processing bet:', bet.id, (betErr as Error).message);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Socket] Draw phase DB error (non-fatal):', (err as Error).message);
      }

      // Always emit results — even if DB failed, clients see the draw
      io.emit('round:result', { roundId: broadcastId, drawnNumbers });
      console.log(`[Socket] Round completed: ${broadcastId}`);

      // Schedule next round after 30-second gap
      setTimeout(runRound, ROUND_INTERVAL_MS - DRAW_DELAY_MS);
    }, DRAW_DELAY_MS);
  };

  // Kick off first round, with a brief warm-up delay for DB to be ready
  setTimeout(runRound, DB_RETRY_DELAY_MS);
};

export const initGameSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Send current round state to newly connected / reconnected clients
    if (currentRoundId) {
      socket.emit('round:current', { roundId: currentRoundId });
    }

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });

  startGameLoop(io);
};
