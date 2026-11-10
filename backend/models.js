const mongoose = require('mongoose');

const User = mongoose.model('User', new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
}));

// date is saved as text like "2026-11-10"
const Task = mongoose.model('Task', new mongoose.Schema({
  user: String,
  title: String,
  date: String,
  minutes: Number,
  done: { type: Boolean, default: false },
  fromAI: { type: Boolean, default: false },
  fromPlan: { type: Boolean, default: false }, // made by "Generate plan" (AI or simple)
  tag: String, // subject label like DSA
}));

// log = list of dates when the habit was done
const Habit = mongoose.model('Habit', new mongoose.Schema({
  user: String,
  name: String,
  log: [String],
}));

// we save every AI request so we can limit how many a user makes per day
const PlanUse = mongoose.model('PlanUse', new mongoose.Schema({
  user: String,
  createdAt: { type: Date, default: Date.now },
}));

module.exports = { User, Task, Habit, PlanUse };
