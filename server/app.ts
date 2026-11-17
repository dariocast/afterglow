import { Hono } from 'hono';
import { authRouter } from './routes/auth';
import { postsRouter } from './routes/posts';
import { sessionMiddleware } from './auth/session';

export const app = new Hono();

app.use('*', sessionMiddleware);

app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
  });
});

app.route('/api/auth', authRouter);
app.route('/api/posts', postsRouter);
