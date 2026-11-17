import { describe, it, expect } from 'vitest';
import { app } from '../server/app';

describe('GET /api/health', () => {
  it('returns status ok with timestamp', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('number');
  });
});
