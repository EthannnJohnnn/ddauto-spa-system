import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { getRuntimeConfig } from './config/env.js';
import { AuditRepository } from './modules/audit/audit.repository.js';
import { healthRouter } from './modules/health/health.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { AuthRepository } from './modules/auth/auth.repository.js';
import { AuthService } from './modules/auth/auth.service.js';
import { createAuthModule } from './modules/auth/auth.routes.js';
import { CatalogsRepository } from './modules/catalogs/catalogs.repository.js';
import { CatalogsService } from './modules/catalogs/catalogs.service.js';
import { createCatalogsRouter } from './modules/catalogs/catalogs.routes.js';
import { ServiceSalesRepository } from './modules/service-sales/service-sales.repository.js';
import { ServiceSalesService } from './modules/service-sales/service-sales.service.js';
import { createServiceSalesRouter } from './modules/service-sales/service-sales.routes.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const webDistDirectory = path.resolve(currentDirectory, '../../web/dist');

export function createApp({ database, runtimeConfig = getRuntimeConfig() }) {
  if (!database) {
    throw new Error('createApp requires an open database.');
  }

  const app = express();
  const auditRepository = new AuditRepository(database);
  const authRepository = new AuthRepository(database);
  const authService = new AuthService(authRepository, { auditRepository });
  const authModule = createAuthModule(authService, {
    secureCookies: runtimeConfig.secureCookies,
    enableRateLimit: runtimeConfig.nodeEnv !== 'test',
  });
  const catalogsRepository = new CatalogsRepository(database);
  const catalogsService = new CatalogsService(catalogsRepository, auditRepository);
  const catalogsRouter = createCatalogsRouter(catalogsService, authModule.middleware);
  const serviceSalesRepository = new ServiceSalesRepository(database);
  const serviceSalesService = new ServiceSalesService(serviceSalesRepository, auditRepository);
  const serviceSalesRouter = createServiceSalesRouter(serviceSalesService, authModule.middleware);

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          upgradeInsecureRequests: null,
        },
      },
      strictTransportSecurity: false,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authModule.router);
  app.use('/api/v1/catalogs', catalogsRouter);
  app.use('/api/v1/service-sales', serviceSalesRouter);

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
