import http from 'node:http';
import path from 'node:path';

import Koa from 'koa';
import Router from '@koa/router';

import koaStatic from './koa-static.ts';
import { apiRouter } from './api-router.ts';
import { BASE } from './utils.ts';

const __dirname = import.meta.dirname;

const PORT = Number(process.env.PORT);

if (!PORT) {
  throw new Error('PORT is not set');
}

const app = new Koa();

const mainRouter = new Router({ prefix: BASE });

mainRouter.use(apiRouter.routes(), apiRouter.allowedMethods());

app.use(mainRouter.routes());

app.use(
  koaStatic(path.resolve(__dirname, '..', 'frontend', 'dist'), undefined, {
    prefix: BASE,
  }),
);

const httpServer = http.createServer(app.callback());

httpServer.listen(PORT, () => {
  console.info(`listening ${PORT}`);
});
