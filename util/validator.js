const { Joi } = require('celebrate');
Joi.objectId = require('Joi-objectid')(Joi)


function isValidObjectString(value, helpers) {
  return value;
}

const id = Joi.objectId().required();

const where = Joi.string().custom(isValidObjectString).messages({
  'any.invalid': '"where" must be a valid JSON or JavaScript object string',
});
const sort = Joi.string().custom(isValidObjectString).messages({
  'any.invalid': '"sort" must be a valid JSON or JavaScript object string',
});
const select = Joi.number().custom(isValidObjectString).messages({
  'any.invalid': '"sort" must be a valid JSON or JavaScript object string',
});
const skip = Joi.number().integer().min(1);
const limit = Joi.number().integer().min(1);
const count = Joi.boolean().truthy('true').falsy('false').messages({
  'boolean.base': '"count" must be a boolean (true or false)',
});

const name = Joi.string().required();
const email = Joi.string().email().required();
const pendingTasks = Joi.array().items(Joi.objectId());
const dateCreated = Joi.date();
const description = Joi.string();
const deadline = Joi.date().required();
const completed = Joi.boolean();
const assignedUser = Joi.string();
const assignedUserName = Joi.string();

const idPattern = Joi.object({ id });

const getListPattern = Joi.object({
  where,
  sort,
  select,
  skip,
  limit,
  count,
});
const getPattern = Joi.object({ select });

const userPattern = Joi.object({
  name,
  email,
  pendingTasks,
  dateCreated,
});
const taskPattern = Joi.object({
  name,
  description,
  deadline,
  completed,
  assignedUser,
  assignedUserName,
  dateCreated,
});

module.exports = {
  idPattern,
  getListPattern,
  getPattern,
  userPattern,
  taskPattern,
};
