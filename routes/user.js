const express = require('express');
const router = express.Router();

const { celebrate, Segments } = require('celebrate');

const User = require('../models/user');
const Task = require('../models/task');
const {
  idPattern,
  getListPattern,
  getPattern,
  userPattern,
} = require('../util/validator');
const {
  success,
  createSuccess,
  deleteSuccess,
  notFound,
  badRequest,
} = require('../util/httpCode');

router.get(
  '/',
  celebrate({ [Segments.QUERY]: getListPattern }),
  async (req, res, next) => {
    const { where, sort, select, skip, limit, count } = req.query;

    if (count) {
      const countUser = await User.countDocuments(where);
      return success(res, 'Count user success', countUser);
    }

    const query = User.find(where);
    if (sort !== undefined) {
      query.sort(sort);
    }
    if (select !== undefined) {
      query.select(select);
    }
    if (skip !== undefined) {
      query.skip(skip);
    }
    if (limit !== undefined) {
      query.limit(limit);
    }
    const userList = await query.exec();
    return success(res, 'Get user list success', userList);
  },
);

router.post(
  '/',
  celebrate({ [Segments.BODY]: userPattern }),
  async (req, res, next) => {
    const user = new User(req.body);

    const existUser = await User.findOne().where({ email: user.email });
    if (existUser) {
      return badRequest(res, `Email already exists: ${user.email}`);
    }

    const createUser = await user.save();
    return createSuccess(res, 'Create user success', createUser);
  },
);

router.get(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.QUERY]: getPattern }),
  async (req, res, next) => {
    const userId = req.params.id;
    const { select } = req.query;

    const query = User.findById(userId);
    if (select !== undefined) {
      query.select(select);
    }
    const user = await query.exec();
    if (!user) {
      return notFound(res, `User not found: ${userId}`);
    }
    return success(res, 'Get user success', user);
  },
);

router.put(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: userPattern }),
  async (req, res, next) => {
    const userId = req.params.id;
    const userData = req.body;

    const session = await User.startSession();
    session.startTransaction();

    try {
      const existUser = await User.findById(userId);
      if (!existUser) {
        await session.abortTransaction();
        session.endSession();
        return notFound(res, `User not found: ${userId}`);
      }

      await User.findByIdAndUpdate(
        userId,
        userData,
        { new: true, runValidators: true, overwrite: true, session },
      );

      if (existUser.name !== userData.name) {
        await Task.updateMany(
          { assignedUser: userId },
          { $set: { assignedUserName: userData.name } },
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();
      return success(res, 'Updated user success');
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  },
);

router.delete(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern }),
  async (req, res, next) => {
    const userId = req.params.id;

    const session = await User.startSession();
    session.startTransaction();

    try {
      const deletedUser = await User.findByIdAndDelete(userId, { session });
      if (!deletedUser) {
        await session.abortTransaction();
        session.endSession();
        return notFound(res, `User not found: ${userId}`);
      }

      await Task.updateMany(
        { assignedUser: userId },
        { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
        { session },
      );

      await session.commitTransaction();
      session.endSession();
      return deleteSuccess(res, 'Delete user success');
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  },
);

module.exports = router;
