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
import { TireInventoryRepository } from './modules/tire-inventory/tire-inventory.repository.js';
import { TireInventoryService } from './modules/tire-inventory/tire-inventory.service.js';
import { createTireInventoryRouter } from './modules/tire-inventory/tire-inventory.routes.js';
import { CanteenInventoryRepository } from './modules/canteen-inventory/canteen-inventory.repository.js';
import { CanteenInventoryService } from './modules/canteen-inventory/canteen-inventory.service.js';
import { createCanteenInventoryRouter } from './modules/canteen-inventory/canteen-inventory.routes.js';
import { PurchasesExpensesRepository } from './modules/purchases-expenses/purchases-expenses.repository.js';
import { PurchasesExpensesService } from './modules/purchases-expenses/purchases-expenses.service.js';
import { createPurchasesExpensesRouter } from './modules/purchases-expenses/purchases-expenses.routes.js';
import { PayrollRepository } from './modules/payroll/payroll.repository.js';
import { PayrollService } from './modules/payroll/payroll.service.js';
import { createPayrollRouter } from './modules/payroll/payroll.routes.js';
import { ReportsRepository } from './modules/reports/reports.repository.js';
import { ReportsService } from './modules/reports/reports.service.js';
import { createReportsRouter } from './modules/reports/reports.routes.js';
import { DailyCloseRepository } from './modules/daily-close/daily-close.repository.js';
import { BusinessDateGuard, DailyCloseService } from './modules/daily-close/daily-close.service.js';
import { createDailyCloseRouter } from './modules/daily-close/daily-close.routes.js';
import { EquipmentRepository } from './modules/equipment/equipment.repository.js';
import { EquipmentService } from './modules/equipment/equipment.service.js';
import { createEquipmentRouter } from './modules/equipment/equipment.routes.js';

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
  const dailyCloseRepository = new DailyCloseRepository(database);
  const businessDateGuard = new BusinessDateGuard(dailyCloseRepository);
  const equipmentRepository = new EquipmentRepository(database);
  const equipmentService = new EquipmentService(equipmentRepository, auditRepository, {
    dateGuard: businessDateGuard,
  });
  const equipmentRouter = createEquipmentRouter(equipmentService, authModule.middleware);
  const serviceSalesRepository = new ServiceSalesRepository(database);
  const serviceSalesService = new ServiceSalesService(serviceSalesRepository, auditRepository, {
    dateGuard: businessDateGuard,
  });
  const serviceSalesRouter = createServiceSalesRouter(serviceSalesService, authModule.middleware);
  const tireInventoryRepository = new TireInventoryRepository(database);
  const tireInventoryService = new TireInventoryService(tireInventoryRepository, auditRepository, {
    dateGuard: businessDateGuard,
  });
  const tireInventoryRouter = createTireInventoryRouter(
    tireInventoryService,
    authModule.middleware,
  );
  const canteenInventoryRepository = new CanteenInventoryRepository(database);
  const canteenInventoryService = new CanteenInventoryService(
    canteenInventoryRepository,
    auditRepository,
    { dateGuard: businessDateGuard },
  );
  const canteenInventoryRouter = createCanteenInventoryRouter(
    canteenInventoryService,
    authModule.middleware,
  );
  const purchasesExpensesRepository = new PurchasesExpensesRepository(database);
  const purchasesExpensesService = new PurchasesExpensesService(
    purchasesExpensesRepository,
    auditRepository,
    { dateGuard: businessDateGuard },
  );
  const purchasesExpensesRouter = createPurchasesExpensesRouter(
    purchasesExpensesService,
    authModule.middleware,
  );
  const payrollRepository = new PayrollRepository(database);
  const payrollService = new PayrollService(
    payrollRepository,
    serviceSalesService,
    auditRepository,
    { dateGuard: businessDateGuard },
  );
  const payrollRouter = createPayrollRouter(payrollService, authModule.middleware);
  const reportsRepository = new ReportsRepository(database);
  const reportsService = new ReportsService(reportsRepository);
  const reportsRouter = createReportsRouter(reportsService, authModule.middleware);
  const dailyCloseService = new DailyCloseService(
    dailyCloseRepository,
    reportsService,
    payrollService,
    auditRepository,
  );
  const dailyCloseRouter = createDailyCloseRouter(dailyCloseService, authModule.middleware);

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
  app.use('/api/v1/tire-inventory', tireInventoryRouter);
  app.use('/api/v1/canteen-inventory', canteenInventoryRouter);
  app.use('/api/v1/purchases-expenses', purchasesExpensesRouter);
  app.use('/api/v1/payroll', payrollRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/daily-close', dailyCloseRouter);
  app.use('/api/v1/equipment', equipmentRouter);

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
