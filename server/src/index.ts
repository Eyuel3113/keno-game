import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth';
import gameRoutes from './routes/game';
import walletRoutes from './routes/wallet';
import historyRoutes from './routes/history';
import { initGameSocket } from './socket/gameSocket';
import { swaggerSpec } from './config/swagger';
import prisma from './config/db';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Swagger Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/history', historyRoutes);

// Socket.io
initGameSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Keep-alive ping every 4 minutes to prevent Neon free-tier from suspending
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('[DB] Keep-alive ping OK');
    } catch (e) {
      console.warn('[DB] Keep-alive ping failed — database may be suspended');
    }
  }, 4 * 60 * 1000);
});

