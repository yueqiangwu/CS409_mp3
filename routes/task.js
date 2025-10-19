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
      const countTask = await Task.countDocuments(where);
      return success(res, 'Count task success', countTask);
    }

    const query = Task.find(where);
    if (sort !== undefined) {
      query.sort(sort);
    }
    if (select !== undefined) {
      query.select(select);
    }
    if (skip !== undefined) {
      query.skip(skip);
    }
    query.limit(limit === undefined ? 100 : limit);
    const taskList = await query.exec();
    return success(res, 'Get task list success', taskList);
  },
);

router.post(
  '/',
  celebrate({ [Segments.BODY]: userPattern }),
  async (req, res, next) => {
    const taskData = req.body;

    const session = await Task.startSession();
    session.startTransaction();

    try {
      if (taskData.assignedUser) {
        const existUser = await User.findById(taskData.assignedUser).session(session);
        if (!existUser) {
          await session.abortTransaction();
          session.endSession();
          return notFound(res, `User not found: ${taskData.assignedUser}`);
        }
      }

      const createTask = await Task.create([taskData], { session });
      const task = createTask[0];
      if (task.assignedUser) {
        await User.findByIdAndUpdate(
          task.assignedUser,
          { $push: { pendingTasks: task._id } },
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();
      return createSuccess(res, 'Create task success');
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  },
);

router.get(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.QUERY]: getPattern }),
  async (req, res, next) => {
    const taskId = req.params.id;
    const { select } = req.query;

    const query = Task.findById(taskId);
    if (select !== undefined) {
      query.select(select);
    }
    const task = await query.exec();
    if (!task) {
      return notFound(res, `Task not found: ${taskId}`);
    }
    return success(res, 'Get task success', task);
  },
);

router.put(
  '/:id',
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: userPattern }),
  async (req, res, next) => {
    const taskId = req.params.id;
    const taskData = req.body;

    const session = await Task.startSession();
    session.startTransaction();

    try {
      const existTask = Task.findById(taskId).session(session);
      if (!existTask) {
        await session.abortTransaction();
        session.endSession();
        return notFound(res, `Task not found: ${taskId}`);
      }

      if (existTask.assignedUser && existTask.assignedUser !== taskData.assignedUser) {
        await User.findByIdAndUpdate(
          existTask.assignedUser,
          { $pull: { pendingTasks: taskId } },
          { session },
        );
      }

      if (taskData.assignedUser) {
        const existUser = await User.findById(taskData.assignedUser).session(session);
        if (!existUser) {
          await session.abortTransaction();
          session.endSession();
          return notFound(res, `User not found: ${taskData.assignedUser}`);
        }

        await User.findByIdAndUpdate(
          taskData.assignedUser,
          { $push: { pendingTasks: taskId } },
          { session },
        );
      }

      await Task.findByIdAndUpdate(
        taskId,
        taskData,
        { new: true, runValidators: true, overwrite: true, session },
      );

      await session.commitTransaction();
      session.endSession();
      return success(res, 'Update task success');
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
    const taskId = req.params.id;

    const session = await Task.startSession();
    session.startTransaction();

    try {
      const deleteTask = Task.findByIdAndDelete(taskId).session(session);
      if (!deleteTask) {
        await session.abortTransaction();
        session.endSession();
        return notFound(res, `Task not found: ${taskId}`);
      }

      if (deleteTask.assignedUser) {
        await User.findByIdAndUpdate(
          deleteTask.assignedUser,
          { $pull: { pendingTasks: taskId } },
          { session },
        );
      }

      await session.commitTransaction();
      session.endSession();
      return deleteSuccess(res, 'Delete task success');
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      next(err);
    }
  },
);

module.exports = router;
