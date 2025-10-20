const { Joi } = require('celebrate');
Joi.objectId = require('Joi-objectid')(Joi);

const id = Joi.objectId().required();

const idPattern = Joi.object({ id });

const where = Joi.string();
const sort = Joi.string();
const select = Joi.string();
const skip = Joi.number().integer().min(1);
const limit = Joi.number().integer().min(1);
const count = Joi.boolean().truthy('true').falsy('false');

const getListPattern = Joi.object({
  where,
  sort,
  select,
  skip,
  limit,
  count,
});
const getPattern = Joi.object({ select });

const name = Joi.string().required();
const nameUpdate = Joi.string();
const email = Joi.string().email().required();
const emailUpdate = Joi.string().email();
const pendingTasks = Joi.array().items(Joi.objectId());
const dateCreated = Joi.date();
const description = Joi.string();
const deadline = Joi.date().required();
const deadlineUpdate = Joi.date();
const completed = Joi.boolean();
const assignedUser = Joi.objectId().allow('', null);
const assignedUserName = Joi.string();

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
const createTaskPattern = Joi.object({
  name,
  description,
  deadline,
  completed,
  assignedUser,
  assignedUserName,
  dateCreated,
});
const updateTaskPattern = Joi.object({
  name: nameUpdate,
  description,
  deadline: deadlineUpdate,
  completed,
  assignedUser,
  assignedUserName,
  dateCreated,
});

module.exports = {
  idPattern,
  getListPattern,
  getPattern,
  createUserPattern,
  updateUserPattern,
  createTaskPattern,
  updateTaskPattern,
};
