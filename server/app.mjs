import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import Koa from 'koa';
import Router from '@koa/router';
import { koaBody } from 'koa-body';
import koaStatic from 'koa-static';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(fs.readFileSync(path.resolve(__dirname, 'port'), 'utf8'));

fs.mkdir(path.resolve(__dirname, '..', 'upload_temp'), (e) => {
  // do nothing, ensure the dir exists
  console.log(e);
});

const app = new Koa();

const apiRouter = new Router({ prefix: '/api' });

const getConfig = () => {
  const t = fs.readFileSync(path.resolve(__dirname, 'site.config.json'), 'utf8');
  const config = JSON.parse(t);
  return config;
};
const writeConfig = (config) => {
  fs.writeFileSync(path.resolve(__dirname, 'site.config.json'), JSON.stringify(config, null, 2));
};

apiRouter.get('/list', (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'success',
    data: getConfig(),
  };
});

apiRouter.post(
  '/upload',
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 200 * 1024 * 1024,
      uploadDir: path.resolve(__dirname, '..', 'upload_temp'),
      keepExtensions: true,
    },
  }),
  (ctx) => {
    const { site } = ctx.request.body;
    const config = getConfig();
    const targetPath = config[site].path;

    const uploadFilePath = ctx.request.files.tarball.filepath;
    const targetVersionPath = path.resolve(targetPath, config[site].nextVersion);
    spawnSync('mkdir', ['-p', targetVersionPath]);
    spawnSync('tar', ['-xvf', uploadFilePath, '-C', targetVersionPath]);

    config[site].versions[config[site].nextVersion] = Date.now();
    const nextVersion = Number(config[site].nextVersion) + 1;
    config[site].nextVersion = String(nextVersion).padStart(3, '0');

    writeConfig(config);
    ctx.body = {
      code: 0,
      msg: 'success',
    };
  }
);

apiRouter.post('/link', koaBody(), (ctx) => {
  const { site, targetVersion, linkName } = ctx.request.body;
  if (!/^[a-z]+$/.test(linkName)) {
    ctx.body = {
      code: 1,
      msg: 'must a-z',
    };
    ctx.status = 400;
    return;
  }
  const config = getConfig();
  const targetPath = config[site].path;

  const targetVersionPath = path.resolve(targetPath, targetVersion);
  const linkNamePath = path.resolve(targetPath, linkName);
  const linkNamePathTmp = path.resolve(targetPath, linkName + '.tmp');

  spawnSync('ln', ['-sf', targetVersionPath, linkNamePathTmp]);
  spawnSync('mv', ['-fT', linkNamePathTmp, linkNamePath]);

  config[site].links[linkName] = targetVersion;
  writeConfig(config);

  ctx.body = {
    code: 0,
    msg: 'success',
  };
});

apiRouter.post('/unlink', koaBody(), (ctx) => {
  const { site, targetVersion, linkName } = ctx.request.body;
  if (!/^[a-z]+$/.test(linkName)) {
    ctx.body = {
      code: 1,
      msg: 'must a-z',
    };
    return;
  }
  const config = getConfig();
  const targetPath = config[site].path;

  const linkNamePath = path.resolve(targetPath, linkName);

  spawnSync('unlink', [linkNamePath]);

  config[site].links[linkName] = undefined;
  writeConfig(config);

  ctx.body = {
    code: 0,
    msg: 'success',
  };
});

const mainRouter = new Router({ prefix: '/frontend-publish-management' });

mainRouter.use(apiRouter.routes(), apiRouter.allowedMethods());

// fixme: do not use (.*?)
mainRouter.get(
  '/(.*?)',
  async (ctx, next) => {
    const originalPath = ctx.path;
    ctx.path = originalPath.replace('/frontend-publish-management', '') || '/';
    await next();
    ctx.path = originalPath;
  },
  koaStatic(path.resolve(__dirname, '..', 'client', 'dist'))
);

app.use(mainRouter.routes());

const httpServer = http.createServer(app.callback());

httpServer.listen(PORT, () => {
  console.log(`listening ${PORT}`);
});
