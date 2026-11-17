import dotenv from 'dotenv';
import { randomBytes } from 'node:crypto';
import knexConfig from '../../../knexfile.js';
dotenv.config();

const databaseConnection = knexConfig[process.env.NODE_ENV === 'test' ? 'test' : 'development'].connection;
const sessionSecret = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'test' ? randomBytes(32).toString('hex') : '');
if (sessionSecret.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters');

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host: databaseConnection.host,
    port: databaseConnection.port,
    user: databaseConnection.user,
    password: databaseConnection.password,
    name: databaseConnection.database,
  },

  session: {
    secret: sessionSecret,
    name: 'smart_helpdesk_sid',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
  },

  initialAccounts: [
    { email: process.env.INITIAL_ADMIN_EMAIL || '', role: 'ADMIN', fullName: 'System Administrator' },
    { email: process.env.INITIAL_IT_AGENT_EMAIL || '', role: 'IT_AGENT', fullName: 'IT Support Agent' },
    { email: process.env.INITIAL_END_USER_EMAIL || '', role: 'END_USER', fullName: 'Campus Student / User' },
  ],

  upload: {
    dir: process.env.UPLOAD_DIR || 'server/private-uploads',
    maxFileSizeBytes: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '',
  },
};

export default config;
