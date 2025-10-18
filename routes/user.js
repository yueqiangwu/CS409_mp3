const express = require('express');
const router = express.Router();

const User = require('../models/user');
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
      const countUser = await User.countDocuments(where);
      return success(res, countUser);
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
    return success(res, userList);
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.post('/', async (req, res) => {
  try {
    const user = new User(req.body);
    const createUser = await user.save();
    return createSuccess(res, 'User created');
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return notFound(res, `User not found: ${userId}`);
    }
    return success(res, user);
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const userData = req.body;
    const updateUser = await User.findByIdAndUpdate(
      userId,
      userData,
      { new: true, runValidators: true, overwrite: true },
    );
    if (!updateUser) {
      return notFound(res, `User not found: ${userId}`);
    }
    return success(res, null, 'User updated');
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const deleteUser = await User.findByIdAndDelete(userId);
    if (!deleteUser) {
      return notFound(res, `User not found: ${userId}`);
    }
    return deleteSuccess(res, 'User deleted');
  } catch (err) {
    console.error(err);
    return badRequest(res, err.message);
  }
});

module.exports = router;
