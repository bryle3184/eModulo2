import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { PROJECT_ROOT, migrate, seed, db } from './db.js';
import { HttpError } from './lib.js';
import { authRouter } from './routes/auth.js';
import { learnRouter } from './routes/learn.js';
import { assessmentRouter } from './routes/assessments.js';
import { gamificationRouter } from './routes/gamification.js';
import { socialRouter } from './routes/social.js';
import { accountRouter } from './routes/account.js';

// Initialize Express app
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'emodulo', time: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api', learnRouter);
app.use('/api', assessmentRouter);
app.use('/api', gamificationRouter);
app.use('/api', socialRouter);
app.use('/api', accountRouter);

// 404 handler for API routes
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.')));

// Serve static files and handle client-side routing
const clientDir = path.join(PROJECT_ROOT, 'dist', 'client');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

// Error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err && typeof err === 'object' && 'issues' in err) {
    const issues = (err as { issues: { message: string; path: (string | number)[] }[] }).issues;
    res.status(400).json({
      error: issues[0]?.message ?? 'Please check the information you entered.',
      field: issues[0]?.path?.join('.') ?? null,
    });
    return;
  }
  console.error('[emodulo] unhandled error', err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

// Export the Express app as the Vercel handler
export default app;

// Run migrations and seeding asynchronously
(async () => {
  try {
    // Check if database is available
    const testQuery = await db.prepare('SELECT 1').get();
    if (testQuery) {
      console.log('[emodulo] Database connection successful');
      await migrate();
      await seed();
      console.log('[emodulo] Database migrations and seeding completed');
    } else {
      console.warn('[emodulo] Database connection test failed or returned null');
    }
  } catch (err) {
    console.error('[emodulo] Database initialization failed:', err);
    // Continue without migrations if database is not available
  }
})();