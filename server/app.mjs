import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import Koa from 'koa';
import Router from '@koa/router';

import koaStatic from './koa-static.js';
import { apiRouter } from './api-router.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(fs.readFileSync(path.resolve(__dirname, '..', 'port'), 'utf8'));

const app = new Koa();

const mainRouter = new Router({ prefix: '/frontend-publish-management' });

mainRouter.use(apiRouter.routes(), apiRouter.allowedMethods());

app.use(mainRouter.routes());

app.use(
  koaStatic(path.resolve(__dirname, '..', 'client', 'dist'), undefined, {
    prefix: '/frontend-publish-management',
  })
);

// an example of serving assets like nginx do
/* app.use(
  koaStatic('/home/ubuntu/sitea', undefined, {
    headerKey: 'x-env-version',
    headerValueReg: /^[a-z]+$/,
  })
); */

const httpServer = http.createServer(app.callback());

httpServer.listen(PORT, () => {
  console.log(`listening ${PORT}`);
});
