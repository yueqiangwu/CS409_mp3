const express = require('express');
const router = express.Router();

const { celebrate, Segments } = require('celebrate');

const User = require('../models/user');
const Task = require('../models/task');
const {
  idPattern,
  getListPattern,
  getPattern,
  createUserPattern,
  updateUserPattern,
} = require('../util/validator');
const {
  success,
  createSuccess,
  deleteSuccess,
  notFound,
  badRequest,
} = require('../util/httpCode');
const parseQueryStr = require('../util/parseQueryStr');

router.get(
  '/',
  celebrate({ [Segments.QUERY]: getListPattern }),
  async (req, res, next) => {
    const { where, sort, select, skip, limit, count } = req.query;

    if (count) {
      const userCount = await User.countDocuments(parseQueryStr(where));
      return success(res, 'Count user success', userCount);
    }

    const query = User.find(parseQueryStr(where));
    if (sort) {
      query.sort(parseQueryStr(sort));
    }
    if (select) {
      query.select(parseQueryStr(select));
    }
    if (skip) {
      query.skip(skip);
    }
    if (limit) {
      query.limit(limit);
    }
    const userList = await query.exec();
    return success(res, 'Get user list success', userList);
  },
);

router.post(
  '/',
  celebrate({ [Segments.BODY]: createUserPattern }),
  async (req, res, next) => {
    const userData = req.body;

    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return badRequest(res, `Email already exists: ${userData.email}`);
    }

    if (userData.pendingTasks) {
      const validTasks = await Task.find({ _id: { $in: userData.pendingTasks }, completed: false, assignedUser: '' }).select('_id');
      if (validTasks.length < userData.pendingTasks.length) {
        const validTasksSet = new Set(validTasks);
        const invalidTasks = userData.pendingTasks.filter(item => !validTasksSet.has(item));
        return badRequest(res, `Invalid pendingTasks (do not exists, completed, or occupied): ${invalidTasks.toString()}`);
      }
    }

    const session = await User.startSession();
    session.startTransaction();

    try {
      const [userCreated] = await User.create([userData], { session });

      if (userData.pendingTasks) {
        await Task.updateMany(
          { _id: { $in: userData.pendingTasks } },
          { $set: { assignedUser: userCreated._id, assignedUserName: userCreated.name } },
          { session },
        );
      }

      await session.commitTransaction();
      return createSuccess(res, 'Create user success', userCreated);
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  },
);

router.get(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.QUERY]: getPattern }),
  async (req, res, next) => {
    const userId = req.params.id;
    const { select } = req.query;

    const query = User.findById(userId);
    if (select) {
      query.select(parseQueryStr(select));
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
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: updateUserPattern }),
  async (req, res, next) => {
    const userId = req.params.id;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return notFound(res, `User not found: ${userId}`);
    }

    const userData = {
      name: existingUser.name,
      email: existingUser.email,
      pendingTasks: existingUser.pendingTasks,
      dateCreated: existingUser.dateCreated,
      ...req.body,
    };

    const oldPendingTasks = existingUser.pendingTasks;
    const newPendingTasks = userData.pendingTasks;
    const oldPendingTasksSet = new Set(existingUser.pendingTasks);
    const newPendingTasksSet = new Set(userData.pendingTasks);
    const unassignedTasks = oldPendingTasks.filter(item => !newPendingTasksSet.has(item));
    // const overlapTasks = oldPendingTasks.filter(item => newPendingTasksSet.has(item));
    const assignedTasks = newPendingTasks.filter(item => !oldPendingTasksSet.has(item));

    if (assignedTasks) {
      const validTasks = await Task.find({ _id: { $in: assignedTasks }, completed: false, assignedUser: '' });
      if (validTasks.length < assignedTasks.length) {
        const validTasksSet = new Set(validTasks.map(item => item._id));
        const invalidTasks = assignedTasks.filter(item => !validTasksSet.has(item));
        return badRequest(res, `Invalid pendingTasks (do not exists, completed, or occupied): ${invalidTasks.toString()}`);
      }
    }

    const session = await User.startSession();
    session.startTransaction();

    try {
      const userUpdated = await User.findByIdAndUpdate(
        userId,
        userData,
        { new: true, runValidators: true, session },
      );

      if (unassignedTasks) {
        await Task.updateMany(
          { _id: { $in: unassignedTasks } },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
          { session },
        );
      }

      if (existingUser.name !== userData.name) {
        await Task.updateMany(
          { assignedUser: userId },
          { $set: { assignedUserName: userUpdated.name } },
          { session },
        );
      }

      if (assignedTasks) {
        await Task.updateMany(
          { _id: { $in: assignedTasks } },
          { $set: { assignedUser: userUpdated._id, assignedUserName: userUpdated.name } },
          { session },
        );
      }

      await session.commitTransaction();
      return success(res, 'Updated user success', userUpdated);
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  },
);

router.delete(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern }),
  async (req, res, next) => {
    const userId = req.params.id;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return notFound(res, `User not found: ${userId}`);
    }

    const session = await User.startSession();
    session.startTransaction();

    try {
      await User.findByIdAndDelete(userId, { session });

      if (existingUser.pendingTasks) {
        await Task.updateMany(
          { assignedUser: userId },
          { $set: { assignedUser: '', assignedUserName: 'unassigned' } },
          { session },
        );
      }

      await session.commitTransaction();
      return deleteSuccess(res, 'Delete user success');
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  },
);

module.exports = router;
