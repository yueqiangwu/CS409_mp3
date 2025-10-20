const { isCelebrateError } = require('celebrate');

const { badRequest, internalError } = require('./httpCode');

function errorHandler(err, req, res, next) {
  if (isCelebrateError(err)) {
    const joiErrorMessages = [];
    for (const [segment, joiError] of err.details.entries()) {
      joiErrorMessages.push(`Invalid ${segment} parameter: ${joiError.message}`);
    }
    return badRequest(res, joiErrorMessages.join('; '));
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError' || err.name === 'ValidationError') {
    return badRequest(res, err.message);
  }

  console.error('Unknown error:', err);
  return internalError(res, err.message);
}

module.exports = errorHandler;
