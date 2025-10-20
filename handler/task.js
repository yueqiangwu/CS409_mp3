const User = require('../models/user');
const Task = require('../models/task');
const {
  success,
  createSuccess,
  deleteSuccess,
  notFound,
} = require('../util/httpCode');
const parseQueryStr = require('../util/parseQueryStr');

const getTaskListHandler = async (req, res, next) => {
  const { where, filter, sort, select, skip, limit, count } = req.query;

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
  if (filter) {
    query.select(parseQueryStr(filter));
  }
  if (skip || skip === 0) {
    query.skip(skip);
  }
  if (limit || limit === 0) {
    query.limit(limit);
  } else {
    query.limit(100);
  }
  const taskList = await query.exec();
  return success(res, 'Get task list success', taskList);
};

const createTaskHandler = async (req, res, next) => {
  const taskData = req.body;

  let warning = null;

  if (taskData.assignedUser) {
    const existingUser = await User.findById(taskData.assignedUser);
    if (!existingUser) {
      return notFound(res, `User [${taskData.assignedUser}] does not exist`);
    }

    if (taskData.assignedUserName && taskData.assignedUserName !== existingUser.name) {
      warning = `User name [${existingUser.name}] and task assigned user name [${taskData.assignedUserName}] do not match`;
    }
    taskData.assignedUserName = existingUser.name;
  } else {
    taskData.assignedUser = '';
    if (taskData.assignedUserName && taskData.assignedUserName !== 'unassigned') {
      warning = `Task assigned user name should be "unassigned" instead of [${taskData.assignedUserName}]`;
    }
    taskData.assignedUserName = 'unassigned';
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
};

const getTaskHandler = async (req, res, next) => {
  const taskId = req.params.id;
  const { select } = req.query;

  const query = Task.findById(taskId);
  if (select) {
    query.select(parseQueryStr(select));
  }
  const task = await query.exec();
  if (!task) {
    return notFound(res, `Task [${taskId}] does not exist`);
  }
  return success(res, 'Get task success', task);
};

const updateTaskHandler = async (req, res, next) => {
  const taskId = req.params.id;

  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    return notFound(res, `Task [${taskId}] does not exist`);
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
    _id: taskId,
  };

  const oldUser = existingTask.assignedUser;
  const newUser = taskData.assignedUser;
  const unassignedUser = (oldUser && oldUser !== newUser) ? oldUser : null;
  const assignedUser = (newUser && newUser !== oldUser) ? newUser : null;

  let warning = null;

  if (oldUser && oldUser === newUser) {
    if (taskData.assignedUserName && taskData.assignedUserName !== existingTask.assignedUserName) {
      warning = `User name [${existingTask.assignedUserName}] and task assigned user name [${taskData.assignedUserName}] do not match`;
    }
    taskData.assignedUserName = existingTask.assignedUserName;
  }

  if (assignedUser) {
    const validUser = await User.findById(assignedUser);
    if (!validUser) {
      return notFound(res, `User [${assignedUser}] does not exist`);
    }

    if (taskData.assignedUserName && taskData.assignedUserName !== validUser.name) {
      warning = `User name [${validUser.name}] and task assigned user name [${taskData.assignedUserName}] do not match`;
    }
    taskData.assignedUserName = validUser.name;
  }

  const session = await Task.startSession();
  session.startTransaction();

  try {
    const taskUpdated = await Task.findByIdAndUpdate(
      taskId,
      taskData,
      { new: true, runValidators: true, session },
    );

    if (unassignedUser && !existingTask.completed) {
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
};

const deleteTaskHandler = async (req, res, next) => {
  const taskId = req.params.id;

  const existingTask = await Task.findById(taskId);
  if (!existingTask) {
    return notFound(res, `Task [${taskId}] does not exist`);
  }

  const session = await Task.startSession();
  session.startTransaction();

  try {
    await Task.findByIdAndDelete(taskId, { session });

    if (existingTask.assignedUser && !existingTask.completed) {
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
};

module.exports = {
  getTaskListHandler,
  createTaskHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
};
