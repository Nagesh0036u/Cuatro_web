'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { ensureInitialAdmin } = require('./bootstrap');

async function main() {
  const app = createApp();
  await ensureInitialAdmin(config);
  app.listen(config.port, () => {
    console.log(`Cuatro Tech Solutions website running at ${config.siteUrl} (port ${config.port})`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
