# 🎰 Keno Game

A full-stack real-time Keno lottery game built with Node.js, React, and PostgreSQL.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Real-time | Socket.IO |
| Containerized | Docker + Docker Compose |

## Features

- 🎱 Live Keno draws with real-time animation
- 💰 Wallet system — deposit & withdraw funds
- 📜 Transaction history
- 🔐 JWT authentication (register/login)
- 📊 Bet history with payout tracking
- 🐳 Fully containerized with Docker

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/keno-game.git
cd keno-game
```

### 2. Set up environment variables
```bash
# Copy the example file
cp server/.env.example server/.env

# Edit server/.env with your own values:
# - DATABASE_URL: your PostgreSQL connection string (e.g. Neon, Supabase, or local)
# - JWT_SECRET: any long random string
# - PORT: 5000
```

### 3. Run with Docker
```bash
docker compose up -d --build
```

The app will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **API Docs (Swagger):** http://localhost:5000/api-docs

### 4. Run database migrations
```bash
docker compose exec server npx prisma db push
```

## Project Structure

```
keno-game/
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── api/         # API client functions
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   ├── store/       # Global state (Zustand)
│   │   └── App.tsx      # Root component
│   └── Dockerfile
├── server/              # Node.js backend
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Game engine logic
│   │   ├── middleware/  # Auth middleware
│   │   └── index.ts     # Server entry point
│   ├── prisma/
│   │   └── schema.prisma
│   └── Dockerfile
└── docker-compose.yml
```

## Environment Variables

See `server/.env.example` for required variables.

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `PORT` | Server port (default: 5000) |
