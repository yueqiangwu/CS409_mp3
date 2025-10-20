const { notFound } = require('../util/httpCode');

/*
 * Connect all of your endpoints together here.
 */
module.exports = function (app) {
  app.use('/api', require('./home.js'));
  app.use('/api/users', require('./user.js'));
  app.use('/api/tasks', require('./task.js'));

  app.use((req, res) => {
    return notFound(res, `URL not found: ${req.originalUrl}`);
  });
};
