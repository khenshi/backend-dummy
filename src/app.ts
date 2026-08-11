import express from 'express';
import cors from 'cors';
import propertyRoutes from './modules/properties/property.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { env } from './config/env.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl }));
  app.use(express.json());
  app.use('/api/properties', propertyRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
