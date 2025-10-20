const { Joi, celebrate, Segments } = require('celebrate');

const {
  idPattern,
  getListPattern,
  getPattern,
} = require('./pattern');

const name = Joi.string().required();
const email = Joi.string().email().required();
const pendingTasks = Joi.array().items(Joi.objectId());
const dateCreated = Joi.date();

const nameUpdate = Joi.string();
const emailUpdate = Joi.string().email();

const createUserPattern = Joi.object({
  name,
  email,
  pendingTasks,
  dateCreated,
});
const updateUserPattern = Joi.object({
  name: nameUpdate,
  email: emailUpdate,
  pendingTasks,
  dateCreated,
});

const getUserListCelebrate = celebrate({ [Segments.QUERY]: getListPattern });
const createUserCelebrate = celebrate({ [Segments.BODY]: createUserPattern });
const getUserCelebrate = celebrate({ [Segments.PARAMS]: idPattern, [Segments.QUERY]: getPattern });
const updateUserCelebrate = celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: updateUserPattern });
const deleteUserCelebrate = celebrate({ [Segments.PARAMS]: idPattern });

module.exports = {
  getUserListCelebrate,
  createUserCelebrate,
  getUserCelebrate,
  updateUserCelebrate,
  deleteUserCelebrate,
};
