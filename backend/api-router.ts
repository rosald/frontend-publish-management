import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

import Router from '@koa/router';
import { koaBody } from 'koa-body';

import { isValidEnvironment, isValidFileExtension } from './utils.ts';

const DIR = process.env.DIR;
if (!DIR) {
  throw new Error('DIR is not set');
}

const SITE_CONFIG = path.resolve(DIR, 'site.db.json');

if (!fs.existsSync(SITE_CONFIG)) {
  throw new Error(`site.db.json not found in ${DIR}`);
}

const mkdirIfNotExist = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

const UPLOAD_TEMP = path.resolve(DIR, 'upload_temp');
mkdirIfNotExist(UPLOAD_TEMP);

const SITE_DIST = path.resolve(DIR, 'site_dist');
mkdirIfNotExist(SITE_DIST);

const createWarningTxtFile = (targetPath: string): void => {
  const text =
    '!!! IMPORTANT WARNING !!!\n\n' +
    'This "dists" directory is AUTOMATICALLY MANAGED by the frontend-publish-management system.\n\n' +
    '■ DO NOT modify, delete, or add ANY files/folders\n' +
    '■ DO NOT alter existing content\n' +
    '■ Manual changes will be OVERWRITTEN by the system\n' +
    '■ Unauthorized modifications may cause SYSTEM FAILURES\n\n' +
    'Contact [Your Team Name/Email] for assistance.\n';
  const fileName = '00_WARNING_DO_NOT_MODIFY.txt';
  fs.writeFile(path.resolve(targetPath, fileName), text, 'utf8', () => {
    // do nothing
  });
};

interface SiteConfig {
  [site: string]: string;
}

const getConfig = (): SiteConfig => {
  const t = fs.readFileSync(SITE_CONFIG, 'utf8');
  const config: SiteConfig = JSON.parse(t);
  return config;
};

const writeConfig = (t: string): void => {
  fs.writeFileSync(SITE_CONFIG, t, 'utf8');
};

const getDirectoriesInSiteDistDir = (dir: string): string[] => {
  const dirList = fs.readdirSync(dir);
  const dirs: string[] = [];
  for (const d of dirList) {
    const fullPath = path.resolve(dir, d);
    const stat = fs.lstatSync(fullPath);
    if (!stat.isSymbolicLink() && stat.isDirectory()) {
      dirs.push(d);
    }
  }
  return dirs;
};

const writeEachPath = (config: SiteConfig): void => {
  Object.keys(config).forEach((site) => {
    const targetPath = path.resolve(SITE_DIST, site);
    mkdirIfNotExist(targetPath);
    createWarningTxtFile(targetPath);
  });
};

const config = getConfig();
writeEachPath(config);

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
  const { db } = ctx.request.body as { db: string };
  try {
    const config: SiteConfig = JSON.parse(db);
    const siteKeys = Object.keys(config);
    if (siteKeys.length !== new Set(siteKeys).size) {
      ctx.status = 400;
      ctx.body = {
        code: 1,
        msg: 'site keys must be unique',
      };
      return;
    }
    if (!siteKeys.every((x) => /^[a-z]+$/.test(x))) {
      ctx.status = 400;
      ctx.body = {
        code: 1,
        msg: 'site keys must be in [a-z]+ format',
      };
      return;
    }
    writeConfig(db);
    writeEachPath(config);
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
    data: config,
  };
});

apiRouter.post('/siteinfo', koaBody(), (ctx) => {
  const { site } = ctx.request.body as { site: string };
  const config = getConfig();
  const targetPath = path.resolve(SITE_DIST, site);

  if (!targetPath || !config[site] || !fs.existsSync(targetPath)) {
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
  const versions: Record<string, Date> = {};
  const links: Record<string, string> = {};
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
    const { site } = ctx.request.body as { site: string };
    const config = getConfig();
    const targetPath = path.resolve(SITE_DIST, site);

    if (!targetPath || !config[site] || !fs.existsSync(targetPath)) {
      ctx.body = {
        code: 1,
        msg: 'site not found',
      };
      ctx.status = 400;
      return;
    }

    createWarningTxtFile(targetPath);

    const files = (ctx.request as any).files;
    const tarball = Array.isArray(files?.tarball) ? files.tarball[0] : files?.tarball;

    if (!tarball || !isValidFileExtension(tarball.originalFilename)) {
      ctx.body = {
        code: 5,
        msg: 'no tarball or not valid extension',
      };
      ctx.status = 400;
      return;
    }

    const uploadFilePath = tarball.filepath;

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
  },
);

apiRouter.post('/link', koaBody(), (ctx) => {
  const { site, targetVersion, linkName } = (ctx.request as any).body as {
    site: string;
    targetVersion: string;
    linkName: string;
  };
  if (!isValidEnvironment(linkName)) {
    ctx.body = {
      code: 1,
      msg: 'must a-z',
    };
    ctx.status = 400;
    return;
  }
  const config = getConfig();
  const targetPath = path.resolve(SITE_DIST, site);

  if (!targetPath || !config[site] || !fs.existsSync(targetPath)) {
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

  //spawnSync('ln', ['-snf', targetVersion, linkNamePathTmp]);
  //spawnSync('mv', ['-fT', linkNamePathTmp, linkNamePath]);
  // in Mac, there is no -T. Alpine also does not support -T
  // so we just use ln -snf to create the link
  // and it will override the existing link (may cause very little server downtime)

  spawnSync('ln', ['-snf', targetVersion, linkNamePath]);

  ctx.body = {
    code: 0,
    msg: 'success',
  };
});

apiRouter.post('/unlink', koaBody(), (ctx) => {
  const { site, targetVersion, linkName } = (ctx.request as any).body as {
    site: string;
    targetVersion: string;
    linkName: string;
  };
  if (!isValidEnvironment(linkName)) {
    ctx.body = {
      code: 1,
      msg: 'must a-z',
    };
    return;
  }
  const config = getConfig();
  const targetPath = path.resolve(SITE_DIST, site);

  if (!targetPath || !config[site] || !fs.existsSync(targetPath)) {
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
  const { site, version } = (ctx.request as any).body as {
    site: string;
    version: string;
  };
  if (!/^\d{3}$/.test(version)) {
    ctx.body = {
      code: 1,
      msg: 'must 0-9',
    };
    return;
  }
  const config = getConfig();
  const targetPath = path.resolve(SITE_DIST, site);

  if (!targetPath || !config[site] || !fs.existsSync(targetPath)) {
    ctx.body = {
      code: 1,
      msg: 'site not found',
    };
    ctx.status = 400;
    return;
  }

  const versionPath = path.resolve(targetPath, version);

  const list: string[] = [];
  const result: string[] = [];

  const data = fs.readdirSync(versionPath);
  for (const d of data) {
    result.push(d);
  }
  const dirs = getDirectoriesInSiteDistDir(versionPath);
  for (const d of dirs) {
    list.push(d);
  }

  while (list.length > 0) {
    const target = list.shift()!;

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
