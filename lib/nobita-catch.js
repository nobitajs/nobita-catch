const fs = require('fs');
const path = require('path');
const isEmpty = require('lodash/isEmpty');
const index = fs.readFileSync(path.join(__dirname, '../template/index.nj'), 'utf-8');

module.exports = async (ctx, next) => {
  try {
    await next();
    if (ctx.response.status != 200) {
      ctx.status = ctx.response.status;
      ctx.body = {
        message: `Route ${ctx.method}:${ctx.originalUrl} ${ctx.message}`,
        error: ctx.message,
        statusCode: ctx.response.status
      }
    }
  } catch (error) {
    if (ctx.config.env != 'prod' || ctx.query._debug) {
      const re = new RegExp(ctx.config.cwd + '.\\S+.js:\\w+', "g");
      const dirArr = error.stack.match(re);
      const status = 500;
      const { request, req } = ctx;
      const { cookie } = request.header;
      const cookieArr = cookie && cookie.split(';');
      let cookieJson = {};
      for (const i in cookieArr) {
        let [key, value] = cookieArr[i].split('=');
        key = key.replace(/(^\s*)|(\s*$)/g, "");
        value = value.replace(/(^\s*)|(\s*$)/g, "");
        cookieJson[key] = value;
      }
      const details = [{
        title: 'REQUEST DETAILS',
        list: {
          'URL': request.url,
          'Request Method': request.method,
          'HTTP Version': req.httpVersion
        }
      },
      {
        title: 'HEADERS',
        list: request.header
      }];
      if (!isEmpty(cookieJson)) {
        details.push({
          title: 'COOKIES',
          list: cookieJson
        });
      }

      let data = {
        src: null,
        line: 0,
        start: 0,
        offset: 0
      }
      if (dirArr) {
        const src = dirArr[0].split(':')[0];
        data.src = src.replace(ctx.config.cwd, '');
        data.line = +dirArr[0].split(':')[1];
        data.start = data.line - 5 < 1 ? 1 : data.line - 5;
        data.offset = data.start - 1;
        data.code = fs.readFileSync(src, 'utf-8').split('\n').slice(data.offset, data.line + 4).join('\n');
      }

      ctx.status = status;
      if (!ctx.is()) {
        ctx.set('content-type', 'text/html; charset=utf-8');
        ctx.body = ctx.nunjucks.renderString(index, {
          url: ctx.request.url,
          message: error.message,
          data,
          status,
          details
        });
      } else {
        ctx.body = {
          code: status,
          message: error.message,
          data: {
            url: ctx.request.url,
            details,
            ...data
          }
        }
      }

    } else {
      ctx.config.errorPageUrl && ctx.redirect(ctx.config.errorPageUrl)
    }

    ctx.app.emit('error', error, ctx);
  }
}
