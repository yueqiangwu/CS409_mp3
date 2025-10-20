const express = require('express');
const router = express.Router();

const { celebrate, Segments } = require('celebrate');

const User = require('../models/user');
const Task = require('../models/task');
const {
  idPattern,
  getListPattern,
  getPattern,
  createTaskPattern,
  updateTaskPattern,
} = require('../util/validator');
const {
  success,
  createSuccess,
  deleteSuccess,
  notFound,
} = require('../util/httpCode');
const parseQueryStr = require('../util/parseQueryStr');

router.get(
  '/',
  celebrate({ [Segments.QUERY]: getListPattern }),
  async (req, res, next) => {
    const { where, sort, select, skip, limit, count } = req.query;

    if (count) {
      const taskCount = await Task.countDocuments(parseQueryStr(where));
      return success(res, 'Count task success', taskCount);
    }

    const query = Task.find(parseQueryStr(where));
    if (sort) {
      query.sort(parseQueryStr(sort));
    }
    if (select) {
      query.select(parseQueryStr(select));
    }
    if (skip) {
      query.skip(skip);
    }
    query.limit(limit || 100);
    const taskList = await query.exec();
    return success(res, 'Get task list success', taskList);
  },
);

router.post(
  '/',
  celebrate({ [Segments.BODY]: createTaskPattern }),
  async (req, res, next) => {
    const taskData = req.body;

    let warning = null;
    if (taskData.assignedUser) {
      const existingUser = await User.findById(taskData.assignedUser);
      if (!existingUser) {
        return notFound(res, `User not found: ${taskData.assignedUser}`);
      }
      if (taskData.assignedUserName !== existingUser.name) {
        warning = `User name [${existingUser.name}] and task assigned user name [${taskData.assignedUserName}] do not match`;
        taskData.assignedUserName = existingUser.name;
      }
    } else {
      if (taskData.assignedUserName && taskData.assignedUserName !== 'unassigned') {
        warning = `Task assigned user name should be empty or unassigned instead of [${taskData.assignedUserName}]`;
        taskData.assignedUserName = 'unassigned';
      }
    }

    const session = await Task.startSession();
    session.startTransaction();

    try {
      const [taskCreated] = await Task.create([taskData], { session });

      if (taskData.assignedUser && !taskData.completed) {
        await User.findByIdAndUpdate(
          taskData.assignedUser,
          { $push: { pendingTasks: taskCreated._id } },
          { session },
        );
      }

      await session.commitTransaction();
      const message = warning ? `Create task success: Warning(${warning})` : 'Create task success';
      return createSuccess(res, message, taskCreated);
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
    const taskId = req.params.id;
    const { select } = req.query;

    const query = Task.findById(taskId);
    if (select) {
      query.select(parseQueryStr(select));
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
  celebrate({ [Segments.PARAMS]: idPattern, [Segments.BODY]: updateTaskPattern }),
  async (req, res, next) => {
    const taskId = req.params.id;

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return notFound(res, `Task not found: ${taskId}`);
    }

    const taskData = {
      name: existingTask.name,
      description: existingTask.description,
      deadline: existingTask.deadline,
      completed: existingTask.completed,
      assignedUser: existingTask.assignedUser,
      assignedUserName: existingTask.assignedUserName,
      dateCreated: existingTask.dateCreated,
      ...req.body,
    };

    const oldUser = existingTask.assignedUser;
    const newUser = taskData.assignedUser;
    const unassignedUser = (oldUser && oldUser !== newUser) ? oldUser : null;
    const overlapUser = (oldUser && oldUser === newUser) ? oldUser : null;
    const assignedUser = (newUser && newUser !== oldUser) ? newUser : null;

    let warning = null;

    if (overlapUser) {
      if (existingTask.assignedUserName !== taskData.assignedUserName) {
        warning = `User name [${existingTask.assignedUserName}] and task assigned user name [${taskData.assignedUserName}] do not match`;
        taskData.assignedUserName = existingTask.assignedUserName;
      }
    }

    if (assignedUser) {
      const validUser = await User.findById(assignedUser);
      if (!validUser) {
        return notFound(res, `User not found: ${assignedUser}`);
      }

      if (validUser.name !== taskData.assignedUserName) {
        warning = `User name [${validUser.name}] and task assigned user name [${taskData.assignedUserName}] do not match`;
        taskData.assignedUserName = validUser.name;
      }
    }

    const session = await Task.startSession();
    session.startTransaction();

    try {
      const taskUpdated = await Task.findByIdAndUpdate(
        taskId,
        taskData,
        { new: true, runValidators: true, session },
      );

      if (unassignedUser) {
        await User.findByIdAndUpdate(
          unassignedUser,
          { $pull: { pendingTasks: taskId } },
          { session },
        );
      }

      if (assignedUser && !taskData.completed) {
        await User.findByIdAndUpdate(
          assignedUser,
          { $push: { pendingTasks: taskId } },
          { session },
        );
      }

      await session.commitTransaction();
      const message = warning ? `Update task success: Warning(${warning})` : 'Update task success';
      return success(res, message, taskUpdated);
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
    const taskId = req.params.id;

    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return notFound(res, `Task not found: ${taskId}`);
    }

    const session = await Task.startSession();
    session.startTransaction();

    try {
      await Task.findByIdAndDelete(taskId, { session });

      if (existingTask.assignedUser) {
        await User.findByIdAndUpdate(
          existingTask.assignedUser,
          { $pull: { pendingTasks: taskId } },
          { session },
        );
      }

      await session.commitTransaction();
      return deleteSuccess(res, 'Delete task success');
    } catch (err) {
      await session.abortTransaction();
      next(err);
    } finally {
      session.endSession();
    }
  },
);

module.exports = router;
