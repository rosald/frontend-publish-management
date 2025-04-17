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

fs.mkdir(path.resolve(__dirname, 'upload_temp'), (e) => {
  // do nothing, ensure the dir exists
  console.log(e);
});

const app = new Koa();

const router = new Router({ prefix: '/api' });

const getConfig = () => {
  const t = fs.readFileSync(path.resolve(__dirname, 'site.config.json'), 'utf8');
  const config = JSON.parse(t);
  return config;
};
const writeConfig = (config) => {
  fs.writeFileSync(path.resolve(__dirname, 'site.config.json'), JSON.stringify(config, null, 2));
};

router.get('/list', (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'success',
    data: getConfig(),
  };
});

router.post(
  '/upload',
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 200 * 1024 * 1024,
      uploadDir: path.resolve(__dirname, 'upload_temp'),
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

router.post('/link', koaBody(), (ctx) => {
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

router.post('/unlink', koaBody(), (ctx) => {
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

app.use(koaStatic(path.resolve(__dirname, '..', 'client', 'dist')));

app.use(router.routes()).use(router.allowedMethods());

const httpServer = http.createServer(app.callback());

httpServer.listen(3000, () => {
  console.log('listening 3000');
});
