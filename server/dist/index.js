"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const auth_1 = __importDefault(require("./routes/auth"));
const game_1 = __importDefault(require("./routes/game"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const history_1 = __importDefault(require("./routes/history"));
const gameSocket_1 = require("./socket/gameSocket");
const swagger_1 = require("./config/swagger");
const db_1 = __importDefault(require("./config/db"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Swagger Docs
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/game', game_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/history', history_1.default);
// Socket.io
(0, gameSocket_1.initGameSocket)(io);
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Keep-alive ping every 4 minutes to prevent Neon free-tier from suspending
    setInterval(async () => {
        try {
            await db_1.default.$queryRaw `SELECT 1`;
            console.log('[DB] Keep-alive ping OK');
        }
        catch (e) {
            console.warn('[DB] Keep-alive ping failed — database may be suspended');
        }
    }, 4 * 60 * 1000);
});
//# sourceMappingURL=index.js.map