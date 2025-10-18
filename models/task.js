const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  deadline: Date,
  completed: {
    type: Boolean,
    default: false,
  },
  assignedUser: {
    type: String,
    default: null,
  },
  assignedUserName: {
    type: String,
    default: '',
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Task', TaskSchema);
