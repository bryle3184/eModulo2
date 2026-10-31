import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { PROJECT_ROOT, migrate, seed } from './db.js';
import { HttpError } from './lib.js';
import { authRouter } from './routes/auth.js';
import { learnRouter } from './routes/learn.js';
import { assessmentRouter } from './routes/assessments.js';
import { gamificationRouter } from './routes/gamification.js';
import { socialRouter } from './routes/social.js';
import { accountRouter } from './routes/account.js';
// Apply the Postgres schema and seed the built-in accounts exactly once per
// database (idempotent). Migrations are applied first so every route can assume
// the tables exist.
await migrate();
await seed();
export const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store');
    }
    next();
});
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'emodulo', time: new Date().toISOString() });
});
app.use('/api/auth', authRouter);
app.use('/api', learnRouter);
app.use('/api', assessmentRouter);
app.use('/api', gamificationRouter);
app.use('/api', socialRouter);
app.use('/api', accountRouter);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.')));
const clientDir = path.join(PROJECT_ROOT, 'dist', 'client');
if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.path.startsWith('/api'))
            return next();
        res.sendFile(path.join(clientDir, 'index.html'));
    });
}
app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
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
    console.error('[emodulo] unhandled error', err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});
const port = Number(process.env.PORT ?? 4000);
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`[emodulo] API listening on http://localhost:${port}`);
    });
}
