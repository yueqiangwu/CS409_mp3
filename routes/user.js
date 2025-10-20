const express = require('express');
const router = express.Router();

const {
  getUserListCelebrate,
  createUserCelebrate,
  getUserCelebrate,
  updateUserCelebrate,
  deleteUserCelebrate,
} = require('../celebrate/user');
const {
  getUserListHandler,
  createUserHandler,
  getUserHandler,
  updateUserHandler,
  deleteUserHandler,
} = require('../handler/user');

router.get('/', getUserListCelebrate, getUserListHandler);
router.post('/', createUserCelebrate, createUserHandler);
router.get('/:id', getUserCelebrate, getUserHandler);
router.put('/:id', updateUserCelebrate, updateUserHandler);
router.delete('/:id', deleteUserCelebrate, deleteUserHandler);

module.exports = router;
