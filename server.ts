import app, { startServer } from './api/index';

// Keep local dev behaviour unchanged; Vercel will import the handler from api/index.ts directly.
if (!process.env.VERCEL) {
  startServer();
}

export default app;
