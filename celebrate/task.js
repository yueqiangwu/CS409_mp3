const { Joi, celebrate, Segments } = require('celebrate');

const {
  idPattern,
  getListPattern,
  getPattern,
} = require('./pattern');

const name = Joi.string().required();
const description = Joi.string();
const deadline = Joi.date().required();
const completed = Joi.boolean();
const assignedUser = Joi.objectId().allow('', null);
const assignedUserName = Joi.string();
const dateCreated = Joi.date();

const idUpdate = Joi.objectId().allow('', null);
const nameUpdate = Joi.string();
const deadlineUpdate = Joi.date();

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
  id: idUpdate,
  name: nameUpdate,
  description,
  deadline: deadlineUpdate,
  completed,
  assignedUser,
  assignedUserName,
  dateCreated,
});

const getTaskListCelebrate = celebrate({ [Segments.QUERY]: getListPattern });
const createTaskCelebrate = celebrate({ [Segments.BODY]: createTaskPattern });
const getTaskCelebrate = celebrate({ [Segments.PARAMS]: idPattern, [Segments.QUERY]: getPattern });
const updateTaskCelebrate = celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: updateTaskPattern });
const deleteTaskCelebrate = celebrate({ [Segments.PARAMS]: idPattern });

module.exports = {
  getTaskListCelebrate,
  createTaskCelebrate,
  getTaskCelebrate,
  updateTaskCelebrate,
  deleteTaskCelebrate,
};
