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

const getDirDirs = (dir) => {
  const dirList = fs.readdirSync(dir);
  const dirs = [];
  for (const d of dirList) {
    const fullPath = path.resolve(dir, d);
    const stat = fs.lstatSync(fullPath);
    if (!stat.isSymbolicLink() && stat.isDirectory()) {
      dirs.push(d);
    }
  }
  return dirs;
};
const getDirLinks = (dir) => {
  const dirList = fs.readdirSync(dir);
  const dirs = [];
  for (const d of dirList) {
    const fullPath = path.resolve(dir, d);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink() && stat.isDirectory()) {
      dirs.push(d);
    }
  }
  return dirs;
};

const apiRouter = new Router({ prefix: '/api' });

apiRouter.post('/listsite', koaBody(), (ctx) => {
  const config = getConfig();

  ctx.body = {
    code: 0,
    msg: 'success',
    data: Object.keys(config),
  };
});

apiRouter.post('/siteinfo', koaBody(), (ctx) => {
  const { site } = ctx.request.body;
  const config = getConfig();
  const targetPath = config[site];

  if (!targetPath) {
    ctx.body = {
      code: 1,
      msg: 'site not found',
    };
    ctx.status = 400;
    return;
  }

  const dir = fs.readdirSync(targetPath);
  const versions = {};
  const links = {};
  for (const d of dir) {
    const fullPath = path.resolve(targetPath, d);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      links[d] = target;
    } else if (stat.isDirectory()) {
      versions[d] = stat.mtime;
    }
  }

  ctx.body = {
    code: 0,
    msg: 'success',
    data: {
      versions,
      links,
    },
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
    const targetPath = config[site];

    if (!targetPath) {
      ctx.body = {
        code: 1,
        msg: 'site not found',
      };
      ctx.status = 400;
      return;
    }

    const uploadFilePath = ctx.request.files.tarball.filepath;

    const currentDirs = getDirDirs(targetPath);
    const currentMax = Math.max(...currentDirs.map((x) => Number(x)), 0);
    const nextVersion = String(currentMax + 1).padStart(3, '0');
    const targetVersionPath = path.resolve(targetPath, nextVersion);

    spawnSync('mkdir', ['-p', targetVersionPath]);
    spawnSync('tar', ['-xvf', uploadFilePath, '-C', targetVersionPath]);

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
  const targetPath = config[site];

  if (!targetPath) {
    ctx.body = {
      code: 1,
      msg: 'site not found',
    };
    ctx.status = 400;
    return;
  }

  // target can be relative or absolute, here use relative
  const targetVersionPath = path.resolve(targetPath, targetVersion);
  const linkNamePath = path.resolve(targetPath, linkName);
  const linkNamePathTmp = path.resolve(targetPath, linkName + '.tmp');

  spawnSync('ln', ['-snf', targetVersion, linkNamePathTmp]);
  spawnSync('mv', ['-fT', linkNamePathTmp, linkNamePath]);

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
  const targetPath = config[site];

  if (!targetPath) {
    ctx.body = {
      code: 1,
      msg: 'site not found',
    };
    ctx.status = 400;
    return;
  }

  const linkNamePath = path.resolve(targetPath, linkName);

  spawnSync('unlink', [linkNamePath]);

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
