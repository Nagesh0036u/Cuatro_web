'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const db = require('./db');
const sec = require('./security');
const { HttpError } = require('./util');

function createApp() {
  db.open();
  const app = express();
  const root = config.ROOT;

  if (config.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'self'"],
        ...(config.isProd ? { 'upgrade-insecure-requests': [] } : {})
      }
    },
    hsts: config.isProd
  }));

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(sec.loadSession);

  // ---- API ----------------------------------------------------------------------------------
  const api = express.Router();
  api.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  api.use(sec.csrfProtect);
  api.use('/', require('./routes/public'));
  api.use('/auth', require('./routes/auth'));
  api.use('/student', require('./routes/student'));
  api.use('/admin', require('./routes/admin'));
  api.use((_req, _res, next) => next(new HttpError(404, 'Not found.')));
  app.use('/api', api);

  // ---- static assets (only the public asset folder is exposed) ------------------------------
  app.use('/assets', express.static(path.join(root, 'assets'), { dotfiles: 'ignore', index: false, maxAge: config.isProd ? '7d' : 0 }));

  // ---- public pages ----------------------------------------------------------------------------
  const sendPage = (res, file) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(file, { dotfiles: 'deny' });
  };
  app.get('/', (_req, res) => sendPage(res, path.join(root, 'index.html')));
  app.get(/^\/([a-z0-9-]+)\.html$/, (req, res, next) => {
    const file = path.join(root, `${req.params[0]}.html`);
    if (!fs.existsSync(file)) return next();
    sendPage(res, file);
  });

  // ---- portals: pages are gated on the server, data is gated again at the API ----------------
  function portal(prefix, dir, role, publicPages) {
    app.get(prefix, (_req, res) => res.redirect(`${prefix}/dashboard`));
    app.get(`${prefix}/:page`, (req, res, next) => {
      const page = req.params.page.replace(/\.html$/, '');
      if (!/^[a-z0-9-]+$/.test(page)) return next();
      const file = path.join(root, dir, `${page}.html`);
      if (!fs.existsSync(file)) return next();
      res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
      const isPublic = publicPages.includes(page);
      const authorised = req.user && req.user.role === role;
      if (!isPublic && !authorised) {
        const nextUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`${prefix}/login?next=${nextUrl}`);
      }
      if (isPublic && authorised && ['login', 'register'].includes(page)) {
        return res.redirect(`${prefix}/dashboard`);
      }
      res.sendFile(file, { dotfiles: 'deny' });
    });
  }
  portal('/student-portal', 'student-portal', 'student', ['login', 'register', 'forgot-password', 'reset-password']);
  portal('/admin-portal', 'admin-portal', 'admin', ['login']);

  // ---- 404 / errors ---------------------------------------------------------------------------
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
    res.status(404).sendFile(path.join(root, '404.html'));
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(err);
    const message = status >= 500 ? 'Something went wrong. Please try again later.' : (err.type === 'entity.parse.failed' ? 'Invalid request.' : err.message);
    if (req.path.startsWith('/api/')) return res.status(status).json({ error: message, fields: err.fields });
    res.status(status).type('text/plain').send(message);
  });

  return app;
}

module.exports = { createApp };
