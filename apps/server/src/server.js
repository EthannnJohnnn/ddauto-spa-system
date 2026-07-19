import { createApp } from './app.js';
import { getRuntimeConfig } from './config/env.js';

const config = getRuntimeConfig();
const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`DD Auto Spa is running at http://${config.host}:${config.port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing the server...`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
      return;
    }

    process.exitCode = 0;
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
