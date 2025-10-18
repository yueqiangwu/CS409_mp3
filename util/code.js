function success(res, data, message) {
  return res.status(200).json({ message: message || 'OK', data });
}

function createSuccess(res, message, data) {
  return res.status(201).json({ message: message || 'OK', data });
}

function deleteSuccess(res, message, data) {
  return res.status(204).json({ message: message || 'OK', data });
}

function badRequest(res, error) {
  return res.status(400).json({ message: 'Bad Request', error });
}

function notFound(res, error) {
  return res.status(404).json({ message: 'Not Found', error });
}

function internalError(res, error) {
  return res.status(500).json({ message: 'Internal Error', error });
}

module.exports = {
  success,
  createSuccess,
  deleteSuccess,
  badRequest,
  notFound,
  internalError,
};