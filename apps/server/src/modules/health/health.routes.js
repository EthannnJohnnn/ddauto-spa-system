import { Router } from 'express';
import { API_VERSION } from '@ddauto/contracts';

export const healthRouter = Router();

healthRouter.get('/', (request, response) => {
  response.json({
    status: 'ok',
    service: 'ddauto-spa-server',
    apiVersion: API_VERSION,
  });
});
