import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'uniactivity_clean_secret_key_2026',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  hod: {
    name: process.env.HOD_NAME || 'Prof. Dr. Tariq Mahmood',
    email: (process.env.HOD_EMAIL || 'admin@university.edu').trim().toLowerCase(),
    password: process.env.HOD_PASSWORD || 'Admin#@123321@'
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: (process.env.SMTP_USER || '').trim(),
    pass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, ''),
    from: process.env.SMTP_FROM || `"UniActivity Hub (Directorate of Student Affairs)" <${process.env.SMTP_USER || 'no-reply@university.edu'}>`,
    isTls: process.env.SMTP_TLS !== 'false'
  }
};
