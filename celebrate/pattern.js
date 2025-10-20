const { Joi } = require('celebrate');
Joi.objectId = require('joi-objectid')(Joi);

const id = Joi.objectId().required();

const idPattern = Joi.object({ id });

const where = Joi.string();
const filter = Joi.string();
const sort = Joi.string();
const select = Joi.string();
const skip = Joi.number().integer().min(0);
const limit = Joi.number().integer().min(0);
const count = Joi.boolean().truthy('true').falsy('false');

const getListPattern = Joi.object({
  where,
  filter,
  sort,
  select,
  skip,
  limit,
  count,
});
const getPattern = Joi.object({ select });

module.exports = {
  idPattern,
  getListPattern,
  getPattern,
};
