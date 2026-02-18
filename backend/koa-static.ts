// it's koa-static, remove debug package, add third option param with prefix and replacement support
// (simple nginx root/alias implementation)
//
// also add version-header support(to simulate nginx map http_header)
// when passing "headerKey", the "root" should be the outer path level, this middleware will
// add the version dir, according to the version-header value

// also add fallback support(to simulate nginx try_files)
// when passing "fallback", will search for "fallback" when 404, if 404 again, run next
// eg. fallback=/index.html, will search /index.html
// if replacement !== '', fallback should include replacement. eg. /thereplacement/index.html

import { resolve } from 'node:path';
import assert from 'node:assert';
import { send } from '@koa/send';
import type { Context, Next } from 'koa';

interface ExtraOptions {
  prefix?: string;
  replacement?: string;
  headerKey?: string;
  currentVersion?: string;
  headerValueReg?: RegExp | null;
  fallback?: string;
}

interface SendOpts {
  root?: string;
  index?: string | false;
  defer?: boolean;
  [key: string]: unknown;
}

function calcDir(
  ctx: Context,
  headerKey: string,
  currentVersion: string,
  headerValueReg: RegExp | null,
): string {
  const assetDir = ctx.request.header[headerKey.toLowerCase()] as string | undefined;

  if (!assetDir) {
    return currentVersion;
  }

  if (headerValueReg && !headerValueReg.test(assetDir)) {
    return currentVersion;
  }

  return assetDir;
}

export default function serve(root: string, opts?: SendOpts, extraOptions?: ExtraOptions) {
  const _opts: SendOpts = Object.assign({}, opts);
  const _extraOptions: ExtraOptions = Object.assign({}, extraOptions);

  const prefix = _extraOptions.prefix || '';
  const replacement = _extraOptions.replacement || '';
  const headerKey = _extraOptions.headerKey || '';
  const currentVersion = _extraOptions.currentVersion || 'current';
  const headerValueReg = _extraOptions.headerValueReg || null;
  const fallback = _extraOptions.fallback || '';

  assert(root, 'root directory is required to serve files');

  // options
  _opts.root = resolve(root);
  if (_opts.index !== false) _opts.index = _opts.index || 'index.html';

  if (!_opts.defer) {
    return async function serve(ctx: Context, next: Next) {
      if (prefix && !ctx.path.startsWith(prefix)) {
        await next();
        return;
      }

      if (headerKey) {
        _opts.root = resolve(root, calcDir(ctx, headerKey, currentVersion, headerValueReg));
      }

      const sendPath = ctx.path.replace(prefix, replacement) || '/';

      let done = false;

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          done = !!(await send(ctx, sendPath, _opts as any));
        } catch (err: any) {
          if (err.status !== 404) {
            throw err;
          } else if (fallback) {
            try {
              done = !!(await send(ctx, fallback, _opts as any));
            } catch (fberr: any) {
              if (fberr.status !== 404) {
                throw fberr;
              }
            }
          }
        }
      }

      if (!done) {
        await next();
      }
    };
  }

  return async function serve(ctx: Context, next: Next) {
    await next();

    if (prefix && !ctx.path.startsWith(prefix)) {
      return;
    }

    if (headerKey) {
      _opts.root = resolve(root, calcDir(ctx, headerKey, currentVersion, headerValueReg));
    }

    const sendPath = ctx.path.replace(prefix, replacement) || '/';

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return; // eslint-disable-line

    try {
      await send(ctx, sendPath, _opts as any);
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      } else if (fallback) {
        try {
          await send(ctx, fallback, _opts as any);
        } catch (fberr: any) {
          if (fberr.status !== 404) {
            throw fberr;
          }
        }
      }
    }
  };
}
