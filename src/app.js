import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import securityMiddleware from '#middlewares/security.middleware.js';

import authRoutes from '#routes/auth.routes.js';
import usersRoutes from '#routes/users.routes.js';

const app = express();

app.use(securityMiddleware);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(
  morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
  })
);

app.get('/', (req, res) => {
  logger.info('Hello, from Acquisitions Acquisitions');
  res.status(200).send('Hello, from Acquisitions API!');
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Acquisitions API is Running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

export default app;
