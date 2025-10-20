const User = require('../models/user');
const Task = require('../models/task');
const {
  success,
  createSuccess,
  deleteSuccess,
  notFound,
  badRequest,
} = require('../util/httpCode');
const parseQueryStr = require('../util/parseQueryStr');

const getUserListHandler = async (req, res, next) => {
  const { where, filter, sort, select, skip, limit, count } = req.query;

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
  if (filter) {
    query.select(parseQueryStr(filter));
  }
  if (skip || skip === 0) {
    query.skip(skip);
  }
  if (limit || limit === 0) {
    query.limit(limit);
  }
  const userList = await query.exec();
  return success(res, 'Get user list success', userList);
};

const createUserHandler = async (req, res, next) => {
  const userData = req.body;

  const existingEmail = await User.findOne({ email: userData.email });
  if (existingEmail) {
    return badRequest(res, `Email [${userData.email}] already exists`);
  }

  if (userData.pendingTasks) {
    const validTasks = await Task.find({ _id: { $in: userData.pendingTasks }, completed: false, assignedUser: '' }, { _id: 1 });
    if (validTasks.length < userData.pendingTasks.length) {
      const validTasksSet = new Set(validTasks);
      const invalidTasks = userData.pendingTasks.filter(item => !validTasksSet.has(item));
      return badRequest(res, `PendingTasks [${invalidTasks.join(', ')}] completed, occupied, or do not exist`);
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
};

const getUserHandler = async (req, res, next) => {
  const userId = req.params.id;
  const { select } = req.query;

  const query = User.findById(userId);
  if (select) {
    query.select(parseQueryStr(select));
  }
  const user = await query.exec();
  if (!user) {
    return notFound(res, `User [${userId}] does not exist`);
  }
  return success(res, 'Get user success', user);
};

const updateUserHandler = async (req, res, next) => {
  const userId = req.params.id;

  const existingUser = await User.findById(userId);
  if (!existingUser) {
    return notFound(res, `User [${userId}] does not exist`);
  }

  const userData = {
    name: existingUser.name,
    email: existingUser.email,
    pendingTasks: existingUser.pendingTasks,
    dateCreated: existingUser.dateCreated,
    ...req.body,
    _id: userId,
  };

  if (userData.email !== existingUser.email) {
    const existingEmail = await Task.findOne({ email: userData.email });
    if (existingEmail) {
      return badRequest(res, `Email [${userData.email}] already exists`);
    }
  }

  const oldTasksSet = new Set(existingUser.pendingTasks);
  const newTasksSet = new Set(userData.pendingTasks);
  const unassignedTasks = existingUser.pendingTasks.filter(item => !newTasksSet.has(item));
  const assignedTasks = userData.pendingTasks.filter(item => !oldTasksSet.has(item));

  if (assignedTasks) {
    const validTasks = await Task.find({ _id: { $in: assignedTasks }, completed: false, assignedUser: '' }, { _id: 1 });
    if (validTasks.length < assignedTasks.length) {
      const validTasksSet = new Set(validTasks);
      const invalidTasks = assignedTasks.filter(item => !validTasksSet.has(item));
      return badRequest(res, `PendingTasks [${invalidTasks.join(', ')}] completed, occupied, or do not exist`);
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
};

const deleteUserHandler = async (req, res, next) => {
  const userId = req.params.id;

  const existingUser = await User.findById(userId);
  if (!existingUser) {
    return notFound(res, `User [${userId}] does not exist`);
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
};

module.exports = {
  getUserListHandler,
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
};
