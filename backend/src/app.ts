import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customer.routes';
import productRoutes from './modules/products/product.routes';
import challanRoutes from './modules/challans/challan.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, message: 'ERP/CRM API is running', timestamp: new Date().toISOString() });
  });

  app.use('/auth', authRoutes);
  app.use('/customers', customerRoutes);
  app.use('/products', productRoutes);
  app.use('/challans', challanRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
