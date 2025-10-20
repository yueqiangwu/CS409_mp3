const express = require('express');
const router = express.Router();

const {
  getTaskListCelebrate,
  createTaskCelebrate,
  getTaskCelebrate,
  updateTaskCelebrate,
  deleteTaskCelebrate,
} = require('../celebrate/task');
const {
  getTaskListHandler,
  createTaskHandler,
  getTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
} = require('../handler/task');

router.get('/', getTaskListCelebrate, getTaskListHandler);
router.post('/', createTaskCelebrate, createTaskHandler);
router.get('/:id', getTaskCelebrate, getTaskHandler);
router.put('/:id', updateTaskCelebrate, updateTaskHandler);
router.delete('/:id', deleteTaskCelebrate, deleteTaskHandler);

module.exports = router;
