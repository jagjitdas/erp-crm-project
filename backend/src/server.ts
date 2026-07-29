import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { prisma } from './config/prisma';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const app = createApp();

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ERP/CRM API listening on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

async function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
