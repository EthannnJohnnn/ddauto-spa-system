import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { healthRouter } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDistDirectory = path.resolve(currentDirectory, '../../web/dist');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api/v1/health', healthRouter);

  if (existsSync(webDistDirectory)) {
    app.use(express.static(webDistDirectory));
    app.get('/{*splat}', (request, response, next) => {
      if (request.path.startsWith('/api/')) {
        next();
        return;
      }

      response.sendFile(path.join(webDistDirectory, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
