module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (ctx.config.env != 'prod' || ctx.query._debug) {
      const status = 500;
      ctx.status = status;
      ctx.body = `[URL] = ${ctx.request.url}\n${error.stack}`;
    } else {
      ctx.config.errorPageUrl && ctx.redirect(ctx.config.errorPageUrl)
    }

    ctx.app.emit('error', error, ctx);
  }
}
