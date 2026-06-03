"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGameSocket = void 0;
const db_1 = __importDefault(require("../config/db"));
const gameEngine_1 = require("../services/gameEngine");
const ROUND_INTERVAL_MS = 30_000; // new round every 30 seconds
const DRAW_DELAY_MS = 5_000; // 5s "betting phase" before drawing
let currentRoundId = null;
let countdownTimer = null;
const startGameLoop = (io) => {
    const runRound = async () => {
        try {
            // Create a new PENDING round
            const round = await db_1.default.gameRound.create({
                data: { drawnNumbers: [], status: 'PENDING' },
            });
            currentRoundId = round.id;
            io.emit('round:new', { roundId: round.id, bettingSeconds: DRAW_DELAY_MS / 1000 });
            console.log(`[Socket] New round started: ${round.id}`);
            // After betting phase, draw numbers
            countdownTimer = setTimeout(async () => {
                const drawnNumbers = (0, gameEngine_1.drawNumbers)();
                const completed = await db_1.default.gameRound.update({
                    where: { id: round.id },
                    data: { drawnNumbers, status: 'COMPLETED', endedAt: new Date() },
                });
                io.emit('round:result', {
                    roundId: completed.id,
                    drawnNumbers: completed.drawnNumbers,
                });
                console.log(`[Socket] Round completed: ${round.id}`);
                // Schedule next round
                setTimeout(runRound, ROUND_INTERVAL_MS - DRAW_DELAY_MS);
            }, DRAW_DELAY_MS);
        }
        catch (err) {
            console.error('[Socket] Game loop error:', err);
            setTimeout(runRound, 5000); // retry in 5s on error
        }
    };
    runRound();
};
const initGameSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('[Socket] Client connected:', socket.id);
        // Send current round id to newly connected client
        if (currentRoundId) {
            socket.emit('round:current', { roundId: currentRoundId });
        }
        socket.on('disconnect', () => {
            console.log('[Socket] Client disconnected:', socket.id);
        });
    });
    // Start the automated game loop
    startGameLoop(io);
};
exports.initGameSocket = initGameSocket;
//# sourceMappingURL=gameSocket.js.map