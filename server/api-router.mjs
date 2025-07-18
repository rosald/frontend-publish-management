import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import Router from '@koa/router';
import { koaBody } from 'koa-body';

import { isValidEnvironment, isValidFileExtension } from '../shared/utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_CONFIG = path.resolve(__dirname, '..', 'site.db.json');

const UPLOAD_TEMP = path.resolve(__dirname, '..', 'temp');

fs.mkdir(UPLOAD_TEMP, (e) => {
  // do nothing, ensure the dir exists
  console.info(UPLOAD_TEMP + ' already exists');
});

const createWarningTxtFile = (targetPath) => {
  const text =
    '!!! IMPORTANT WARNING !!!\n\n' +
    'This "dists" directory is AUTOMATICALLY MANAGED by the frontend-publish-management system.\n\n' +
    '■ DO NOT modify, delete, or add ANY files/folders\n' +
    '■ DO NOT alter existing content\n' +
    '■ Manual changes will be OVERWRITTEN by the system\n' +
    '■ Unauthorized modifications may cause SYSTEM FAILURES\n\n' +
    'Contact [Your Team Name/Email] for assistance.\n';
  const fileName = '00_WARNING_DO_NOT_MODIFY.txt';
  fs.writeFile(path.resolve(targetPath, fileName), text, 'utf8', (e) => {
    // do nothing
  });
};

const getConfig = () => {
  const t = fs.readFileSync(SITE_CONFIG, 'utf8');
  const config = JSON.parse(t);
  return config;
};

const writeConfig = (t) => {
  fs.writeFileSync(SITE_CONFIG, t, 'utf8');
};

const getDirectoriesInSiteDistDir = (dir) => {
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

const apiRouter = new Router({ prefix: '/api' });

apiRouter.post('/inspectsitedb', koaBody(), (ctx) => {
  const config = getConfig();
  ctx.body = {
    code: 0,
    msg: 'success',
    data: config,
  };
});

apiRouter.post('/writesitedb', koaBody(), (ctx) => {
  const { db } = ctx.request.body;
  try {
    JSON.parse(db);
    writeConfig(db);
    ctx.body = {
      code: 0,
      msg: 'success',
    };
  } catch (e) {
    ctx.status = 400;
    ctx.body = {
      code: 1,
      msg: 'invalid json',
    };
  }
});

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
  const dirSorted = dir.toSorted((a, b) => {
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  });
  const versions = {};
  const links = {};
  for (const d of dirSorted) {
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

    createWarningTxtFile(targetPath);

    if (
      !ctx.request.files.tarball ||
      !isValidFileExtension(ctx.request.files.tarball.originalFilename)
    ) {
      ctx.body = {
        code: 5,
        msg: 'no tarball or not valid extension',
      };
      ctx.status = 400;
      return;
    }

    const uploadFilePath = ctx.request.files.tarball.filepath;

    const currentDirs = getDirectoriesInSiteDistDir(targetPath);
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
  if (!isValidEnvironment(linkName)) {
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
  if (!isValidEnvironment(linkName)) {
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
  if (!/^\d{3}$/.test(version)) {
    ctx.body = {
      code: 1,
      msg: 'must 0-9',
    };
    return;
  }
  const config = getConfig();
  const targetPath = config[site];

  const versionPath = path.resolve(targetPath, version);

  const list = [];
  const result = [];

  const data = fs.readdirSync(versionPath);
  for (const d of data) {
    result.push(d);
  }
  const dirs = getDirectoriesInSiteDistDir(versionPath);
  for (const d of dirs) {
    list.push(d);
  }

  while (list.length > 0) {
    const target = list.shift();

    const data = fs.readdirSync(versionPath + '/' + target);
    for (const d of data) {
      result.push(target + '/' + d);
    }
    const dirs = getDirectoriesInSiteDistDir(versionPath + '/' + target);
    for (const d of dirs) {
      list.push(target + '/' + d);
    }
  }

  ctx.body = {
    code: 0,
    msg: 'success',
    data: result,
  };
});

export { apiRouter };
