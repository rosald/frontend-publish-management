import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import Router from '@koa/router';
import { koaBody } from 'koa-body';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_CONFIG = path.resolve(__dirname, '..', 'site.db.json');

const UPLOAD_TEMP = path.resolve(__dirname, '..', 'temp');

fs.mkdir(UPLOAD_TEMP, (e) => {
  // do nothing, ensure the dir exists
  console.log(e);
});

const getConfig = () => {
  const t = fs.readFileSync(SITE_CONFIG, 'utf8');
  const config = JSON.parse(t);
  return config;
};
const writeConfig = (config) => {
  fs.writeFileSync(SITE_CONFIG, JSON.stringify(config, null, 2));
};

const apiRouter = new Router({ prefix: '/api' });

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
      uploadDir: UPLOAD_TEMP,
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

apiRouter.post('/inspect', koaBody(), (ctx) => {
  const { site, version } = ctx.request.body;
  if (!/^[a-z]+$/.test(version)) {
    ctx.body = {
      code: 1,
      msg: 'must a-z',
    };
    return;
  }
  const config = getConfig();
  const targetPath = config[site].path;

  const versionPath = path.resolve(targetPath, version);

  // todo: inspect the dir using fast-glob

  ctx.body = {
    code: 0,
    msg: 'success',
  };
});

export { apiRouter };
