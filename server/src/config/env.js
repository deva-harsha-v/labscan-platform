import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProd = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProd,
  port: toInt(optional('PORT', '4000'), 4000),
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host: optional('DB_HOST', '127.0.0.1'),
    port: toInt(optional('DB_PORT', '3306'), 3306),
    user: required('DB_USER', 'labscan'),
    password: optional('DB_PASSWORD', 'labscan'),
    database: required('DB_NAME', 'labscan'),
    connectionLimit: toInt(optional('DB_CONNECTION_LIMIT', '10'), 10),
  },

  auth: {
    accessSecret: required('JWT_ACCESS_SECRET', isProd ? undefined : 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', isProd ? undefined : 'dev-refresh-secret-change-me'),
    accessTtl: optional('ACCESS_TOKEN_TTL', '15m'),
    refreshTtl: optional('REFRESH_TOKEN_TTL', '7d'),
    bcryptSaltRounds: toInt(optional('BCRYPT_SALT_ROUNDS', '12'), 12),
  },

  rateLimit: {
    loginWindowMs: toInt(optional('LOGIN_RATE_LIMIT_WINDOW_MS', '900000'), 900000),
    loginMax: toInt(optional('LOGIN_RATE_LIMIT_MAX', '10'), 10),
  },

  storage: {
    endpoint: optional('S3_ENDPOINT', ''),
    region: optional('S3_REGION', 'us-east-1'),
    bucket: optional('S3_BUCKET', 'labscan-media'),
    accessKeyId: optional('S3_ACCESS_KEY_ID', ''),
    secretAccessKey: optional('S3_SECRET_ACCESS_KEY', ''),
    forcePathStyle: optional('S3_FORCE_PATH_STYLE', 'true') === 'true',
    signedUrlTtlSeconds: toInt(optional('SIGNED_URL_TTL_SECONDS', '3600'), 3600),
  },

  seed: {
    adminUsername: optional('SEED_ADMIN_USERNAME', 'admin'),
    adminPassword: optional('SEED_ADMIN_PASSWORD', 'admin12345'),
    studentUsername: optional('SEED_STUDENT_USERNAME', 'student'),
    studentPassword: optional('SEED_STUDENT_PASSWORD', 'student12345'),
  },
};

export function assertProdSecrets() {
  if (!isProd) return;
  const weak = ['dev-access-secret-change-me', 'dev-refresh-secret-change-me'];
  if (weak.includes(env.auth.accessSecret) || weak.includes(env.auth.refreshSecret)) {
    throw new Error('Refusing to start in production with default JWT secrets. Set strong JWT_ACCESS_SECRET / JWT_REFRESH_SECRET.');
  }
}
