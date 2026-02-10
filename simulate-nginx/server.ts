import http from 'node:http';

import Koa from 'koa';

import koaStatic from './koa-static.ts';

const PORT = Number(process.env.NGINX_PORT);

if (!PORT) {
  throw new Error('PORT is not set');
}

const app = new Koa();

// an example of serving assets like nginx do. use this if you do not have nginx installed
app.use(
  koaStatic('/Users/aaa/frontendassets/sitea', undefined, {
    headerKey: 'x-env-version',
    headerValueReg: /^[a-z]+$/,
    prefix: '/someprefix',
    replacement: '', // if set to '/thereplacement'
    fallback: '/index.html', // the fallback should set to /thereplacement/index.html
  }),
);

const httpServer = http.createServer(app.callback());

httpServer.listen(PORT, () => {
  console.info(`listening ${PORT}`);
});
