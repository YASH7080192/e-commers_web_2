import { app } from '../server/app.js';
import { connectDatabase } from '../server/db.js';

export default async function handler(req: any, res: any) {
  const rewrittenPath = typeof req.query?.__path === 'string' ? req.query.__path : undefined;
  if (rewrittenPath) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query as Record<string, unknown>)) {
      if (key === '__path') continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (typeof item === 'string') query.append(key, item);
      }
    }
    req.url = `${rewrittenPath}${query.size ? `?${query.toString()}` : ''}`;
  }

  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error('Serverless API initialization failed:', error);
    return res.status(503).json({ error: 'Service unavailable. Check database configuration.' });
  }
}
