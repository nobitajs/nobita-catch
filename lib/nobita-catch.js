module.exports = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (ctx.config.env == 'prod') {
      const status = 500;
      ctx.status = status;
      ctx.body = {
        status,
        msg: error.message,
        url: ctx.request.url
      };
    } else {
      ctx.config.errorPageUrl && ctx.redirect(ctx.config.errorPageUrl)
    }

    ctx.app.emit('error', error, ctx);
  }
}
