import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Keno Game API',
      version: '1.0.0',
      description: 'REST API for the Keno Game — authentication, wallet management, betting, and game history.',
    },
    servers: [{ url: 'http://localhost:5000', description: 'Local Development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            balance: { type: 'number', example: 1000 },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'JWT access token' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        BetRequest: {
          type: 'object',
          required: ['picks', 'amount'],
          properties: {
            picks: {
              type: 'array',
              items: { type: 'integer', minimum: 1, maximum: 80 },
              minItems: 1,
              maxItems: 10,
              example: [5, 12, 23, 44, 67],
            },
            amount: { type: 'number', minimum: 1, example: 10 },
          },
        },
        BetResponse: {
          type: 'object',
          properties: {
            betId: { type: 'string', format: 'uuid' },
            roundId: { type: 'string', format: 'uuid' },
            picks: { type: 'array', items: { type: 'integer' } },
            drawnNumbers: { type: 'array', items: { type: 'integer' }, description: '20 numbers drawn' },
            hits: { type: 'integer', description: 'Number of matching picks' },
            payout: { type: 'number', description: 'Total payout' },
            newBalance: { type: 'number', description: 'Updated wallet balance' },
          },
        },
        HistoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            picks: { type: 'array', items: { type: 'integer' } },
            drawnNumbers: { type: 'array', items: { type: 'integer' } },
            hits: { type: 'integer' },
            payout: { type: 'number' },
            profit: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
