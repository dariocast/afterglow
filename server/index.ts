import { serve } from '@hono/node-server';
import { app } from './app';
import { startReaper } from './services/reaper';

const port = Number(process.env.PORT) || 3000;

startReaper();

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
