const { notFound } = require('../util/code');

/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app) {
  app.use('/api', require('./home.js'));
  app.use('/api/user', require('./user.js'));
  app.use('/api/task', require('./task.js'));

  app.use('*', (req, res) => {
    return notFound(res, `URL not found: ${req.originalUrl}`);
  });
};
