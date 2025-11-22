import express, { Express } from 'express';
import cors from 'cors';
import { registerOrderRoutes } from './routes/orders';

export function buildApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Register order routes
  registerOrderRoutes(app);

  return app;
}
