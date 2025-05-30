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

/**
 * Module dependencies.
 */

const { resolve } = require('path');
const assert = require('assert');
const send = require('koa-send');

/**
 * Expose `serve()`.
 */

module.exports = serve;

/**
 * Serve static files from `root`.
 *
 * @param {String} root
 * @param {Object} [opts]
 * @return {Function}
 * @api public
 */

function serve(root, opts, extraOptions) {
  opts = Object.assign({}, opts);

  extraOptions = Object.assign({}, extraOptions);
  const prefix = extraOptions.prefix || '';
  const replacement = extraOptions.replacement || '';
  const headerKey = extraOptions.headerKey || '';
  const currentVersion = extraOptions.currentVersion || 'current';
  const headerValueReg = extraOptions.headerValueReg || null;
  const fallback = extraOptions.fallback || '';

  assert(root, 'root directory is required to serve files');

  // options
  opts.root = resolve(root);
  if (opts.index !== false) opts.index = opts.index || 'index.html';

  if (!opts.defer) {
    return async function serve(ctx, next) {
      if (prefix && !ctx.path.startsWith(prefix)) {
        await next();
        return;
      }

      if (headerKey) {
        opts.root = resolve(root, calcDir(ctx, headerKey, currentVersion, headerValueReg));
      }

      const sendPath = ctx.path.replace(prefix, replacement) || '/';

      let done = false;

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          done = await send(ctx, sendPath, opts);
        } catch (err) {
          if (err.status !== 404) {
            throw err;
          } else if (fallback) {
            try {
              done = await send(ctx, fallback, opts);
            } catch (fberr) {
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

  return async function serve(ctx, next) {
    await next();

    if (prefix && !ctx.path.startsWith(prefix)) {
      return;
    }

    if (headerKey) {
      opts.root = resolve(root, calcDir(ctx, headerKey, currentVersion, headerValueReg));
    }

    const sendPath = ctx.path.replace(prefix, replacement) || '/';

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return; // eslint-disable-line

    try {
      await send(ctx, sendPath, opts);
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      } else if (fallback) {
        try {
          await send(ctx, fallback, opts);
        } catch (fberr) {
          if (fberr.status !== 404) {
            throw fberr;
          }
        }
      }
    }
  };
}

function calcDir(ctx, headerKey, currentVersion, headerValueReg) {
  const assetDir = ctx.request.header[headerKey.toLowerCase()];

  if (!assetDir) {
    return currentVersion;
  }

  if (headerValueReg && !headerValueReg.test(assetDir)) {
    return currentVersion;
  }

  return assetDir;
}
