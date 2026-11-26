'use strict';

const config = require('./config');
const { createApp } = require('./app');
const { ensureInitialAdmin } = require('./bootstrap');

async function main() {
  const app = createApp();
  await ensureInitialAdmin(config);
  app.listen(config.port, () => {
    console.log(`Cuatro Tech Solutions website running at ${config.siteUrl} (port ${config.port})`);
    const { smtpConfigured } = require('./mailer');
    if (smtpConfigured()) console.log(`Email: ON (${process.env.BREVO_API_KEY ? 'Brevo API' : config.smtp.host}) - codes and reset links go to real inboxes.`);
    else console.warn('Email: OFF - codes and reset links are only printed here. Run "npm run setup-email" to send real emails.');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
