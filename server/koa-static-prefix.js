// it's koa-static, remove debug, add prefix and replacement support

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

function serve(root, opts, prefix = '', replacement = '') {
  opts = Object.assign({}, opts);

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

      const sendPath = ctx.path.replace(prefix, replacement) || '/';

      let done = false;

      if (ctx.method === 'HEAD' || ctx.method === 'GET') {
        try {
          done = await send(ctx, sendPath, opts);
        } catch (err) {
          if (err.status !== 404) {
            throw err;
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

    const sendPath = ctx.path.replace(prefix, replacement) || '/';

    if (ctx.method !== 'HEAD' && ctx.method !== 'GET') return;
    // response is already handled
    if (ctx.body != null || ctx.status !== 404) return; // eslint-disable-line

    try {
      await send(ctx, sendPath, opts);
    } catch (err) {
      if (err.status !== 404) {
        throw err;
      }
    }
  };
}
