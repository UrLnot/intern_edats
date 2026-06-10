import fs from 'fs';
import mysql from 'mysql2/promise';

const isTruthy = (value: string | undefined) =>
  ['1', 'true', 'yes', 'on', 'required'].includes((value || '').trim().toLowerCase());

const getSslConfig = () => {
  const caFromEnv = process.env.DB_SSL_CA?.replace(/\\n/g, '\n').trim();
  const caPath = process.env.DB_SSL_CA_PATH?.trim();
  const caFromFile = caPath ? fs.readFileSync(caPath, 'utf8') : undefined;
  const sslEnabled = isTruthy(process.env.DB_SSL) || !!caFromEnv || !!caFromFile;

  if (!sslEnabled) return undefined;

  return {
    ca: caFromEnv || caFromFile,
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  };
};

const ssl = getSslConfig();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'edats_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ...(ssl ? { ssl } : {}),
});

export default pool;
