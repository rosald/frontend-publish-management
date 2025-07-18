import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import Koa from 'koa';
import Router from '@koa/router';

import koaStatic from './koa-static.js';
import { apiRouter } from './api-router.mjs';
import { BASE } from '../shared/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(fs.readFileSync(path.resolve(__dirname, '..', 'port'), 'utf8'));

const app = new Koa();

const mainRouter = new Router({ prefix: BASE });

mainRouter.use(apiRouter.routes(), apiRouter.allowedMethods());

app.use(mainRouter.routes());

app.use(
  koaStatic(path.resolve(__dirname, '..', 'client', 'dist'), undefined, {
    prefix: BASE,
  })
);

// an example of serving assets like nginx do. use this if you do not have nginx installed
/* app.use(
  koaStatic('/home/ubuntu/sitea', undefined, {
    headerKey: 'x-env-version',
    headerValueReg: /^[a-z]+$/,
    prefix: '/someprefix',
    replacement: '', // if set to '/thereplacement'
    fallback: '/index.html', // the fallback should set to /thereplacement/index.html
  })
); */

const httpServer = http.createServer(app.callback());

httpServer.listen(PORT, () => {
  console.info(`listening ${PORT}`);
});
