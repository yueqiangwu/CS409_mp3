const express = require('express');
const router = express.Router();

const User = require('../models/user');
const Task = require('../models/task');
const validator = require('../util/validator');
const {
  success,
  createSuccess,
  deleteSuccess,
  badRequest,
  notFound,
} = require('../util/code');

router.get('/', async (req, res) => {
  try {
    const { where, sort, select, skip, limit, count } = validator(req.query);
    if (count) {
      const countTask = await Task.countDocuments(where);
      return success(res, countTask);
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
    return success(res, taskList);
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.post('/', async (req, res) => {
  const session = await Task.startSession();
  session.startTransaction();

  try {
    const taskData = req.body;
    if (taskData.assignedUser) {
      const existUser = await User.findById(taskData.assignedUser).session(session);
      if (!existUser) {
        throw new Error(`User not found: ${taskData.assignedUser}`);
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
    return createSuccess(res, 'Task created');
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    session.endSession();
    return badRequest(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);
    if (!task) {
      return notFound(res, `Task not found: ${taskId}`);
    }
    return success(res, task);
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.put('/:id', async (req, res) => {
  const session = await Task.startSession();
  session.startTransaction();

  try {
    const taskId = req.params.id;
    const taskData = req.body;

    const existTask = Task.findById(taskId).session(session);
    if (!existTask) {
      throw new Error(`Task not found: ${taskId}`);
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
        throw new Error(`User not found: ${taskData.assignedUser}`);
      }

      await User.findByIdAndUpdate(
        taskData.assignedUser,
        { $push: { pendingTasks: taskId } },
        { session },
      );
    }

    const updateTask = await Task.findByIdAndUpdate(
      taskId,
      taskData,
      { new: true, runValidators: true, overwrite: true },
    );

    await session.commitTransaction();
    session.endSession();
    return success(res, null, 'Task updated');
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    session.endSession();
    return badRequest(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  const session = await Task.startSession();
  session.startTransaction();

  try {
    const taskId = req.params.id;
    const deleteTask = Task.findByIdAndDelete(taskId).session(session);
    if (!deleteTask) {
      throw new Error(`Task not found: ${taskId}`);
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
    return deleteSuccess(res, 'Task deleted');
  } catch (err) {
    console.error(err);
    await session.abortTransaction();
    session.endSession();
    return badRequest(res, err.message);
  }
});

module.exports = router;
