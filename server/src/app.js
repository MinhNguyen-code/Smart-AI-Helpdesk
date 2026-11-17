import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { DatabaseSessionStore } from './db/sessionStore.js';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import systemRoutes from './modules/system/systemRoutes.js';
import ticketRoutes from './modules/ticketRoutes.js';
import ruleRoutes from './modules/ruleRoutes.js';
import notificationRoutes from './modules/notificationRoutes.js';
import analyticsRoutes from './modules/analyticsRoutes.js';
import userRoutes from './modules/userRoutes.js';
import authRoutes from './modules/authRoutes.js';
import { csrfToken, verifyCsrf } from './middleware/csrf.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration for React client
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Monitoring probes must reflect service health even when an API client is rate-limited.
app.use('/api/v1', systemRoutes);

// Global rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.nodeEnv === 'test' ? 1000 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    },
  },
});
app.use('/api/', apiLimiter);

// Session configuration
app.use(
  session({
    store: new DatabaseSessionStore(),
    name: config.session.name,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.isProduction, // true only on HTTPS
      sameSite: 'lax',
      maxAge: config.session.maxAge,
    },
  })
);

// Mount API routes
app.get('/api/v1/auth/csrf', csrfToken);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', verifyCsrf, ticketRoutes);
app.use('/api/v1', verifyCsrf, ruleRoutes);
app.use('/api/v1', verifyCsrf, notificationRoutes);
app.use('/api/v1', verifyCsrf, analyticsRoutes);
app.use('/api/v1', verifyCsrf, userRoutes);

// Fallback for root API probe
app.get('/api', (req, res) => {
  res.json({
    name: 'Smart IT Helpdesk API',
    version: '1.0.0',
    documentation: '/docs/API_SPEC.md',
    endpoints: {
      health: '/api/v1/health',
      ready: '/api/v1/ready',
    },
  });
});

// 404 Route Not Found
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
