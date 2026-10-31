import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { PROJECT_ROOT, db, HttpError } from './db.js';
import { authRouter } from './routes/auth.js';
import { learnRouter } from './routes/learn.js';
import { assessmentRouter } from './routes/assessments.js';
import { gamificationRouter } from './routes/gamification.js';
import { socialRouter } from './routes/social.js';
import { accountRouter } from './routes/account.js';
// Log environment variables (without values for security)
console.log('[emodulo] Environment check:');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
console.log('  DATABASE_URL_UNPOOLED:', process.env.DATABASE_URL_UNPOOLED ? '✓ Set' : '✗ Missing');
console.log('  PGHOST:', process.env.PGHOST ? '✓ Set' : '✗ Missing');
console.log('  PGUSER:', process.env.PGUSER ? '✓ Set' : '✗ Missing');
console.log('  PGPASSWORD:', process.env.PGPASSWORD ? '✓ Set' : '✗ Missing');
console.log('  PGDATABASE:', process.env.PGDATABASE ? '✓ Set' : '✗ Missing');
// Initialize Express app
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
// Health check endpoint
app.get('/api/health', async (_req, res) => {
    try {
        // Test database connection
        await db.prepare('SELECT 1').get();
        res.json({ ok: true, service: 'emodulo', time: new Date().toISOString(), db: 'connected' });
    }
    catch (err) {
        console.error('[emodulo] Health check failed:', err);
        res.status(503).json({ ok: false, service: 'emodulo', time: new Date().toISOString(), error: 'Database unavailable' });
    }
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
        if (req.method !== 'GET' || req.path.startsWith('/api'))
            return next();
        res.sendFile(path.join(clientDir, 'index.html'));
    });
}
// Error handler
app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
        console.log(`[emodulo] HTTP ${err.status}: ${err.message}`);
        res.status(err.status).json({ error: err.message });
        return;
    }
    if (err && typeof err === 'object' && 'issues' in err) {
        const issues = err.issues;
        res.status(400).json({
            error: issues[0]?.message ?? 'Please check the information you entered.',
            field: issues[0]?.path?.join('.') ?? null,
        });
        return;
    }
    console.error('[emodulo] unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});
// Export the Express app as the Vercel handler
export default app;
// Test database connection immediately
async function testDatabase() {
    try {
        const result = await db.prepare('SELECT 1').get();
        console.log('[emodulo] ✓ Database connection successful:', result);
        // Run migrations in background
        const { migrate, seed } = await import('./db.js');
        migrate()
            .then(() => console.log('[emodulo] ✓ Migrations completed'))
            .catch((err) => console.error('[emodulo] ✗ Migration failed:', err));
        seed()
            .then(() => console.log('[emodulo] ✓ Seeding completed'))
            .catch((err) => console.error('[emodulo] ✗ Seeding failed:', err));
    }
    catch (err) {
        console.error('[emodulo] ✗ Database connection failed:', err);
    }
}
// Run database test immediately
testDatabase();
