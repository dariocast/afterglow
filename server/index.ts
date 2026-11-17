import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app';
import { startReaper } from './services/reaper';
import fs from 'node:fs';
import path from 'node:path';

const isProduction = process.env.NODE_ENV === 'production';
const distDir = path.resolve(process.cwd(), 'dist');

// Serve static assets in production or when dist directory exists
if (isProduction || fs.existsSync(distDir)) {
  const staticMiddleware = serveStatic({ root: './dist' });
  const indexMiddleware = serveStatic({ path: './dist/index.html' });

  app.use('/*', staticMiddleware);
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/')) {
      return c.json({ error: 'Not Found' }, 404);
    }
    await indexMiddleware(c, next);
  });
}

const port = Number(process.env.PORT) || 3000;

startReaper();

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server listening on http://localhost:${info.port}`);
  }
);
