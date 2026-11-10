require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Task, Habit, PlanUse } = require('./models');
const { makePlan } = require('./ai');

const app = express();
app.set('trust proxy', 1); // needed on Vercel for rate limiting
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB error:', err.message));

// ---------- helpers ----------

// catches errors in async routes so the server never crashes
const safe = (fn) => (req, res) => fn(req, res).catch((err) => {
  console.log(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

// checks the login token
function checkLogin(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    req.userId = jwt.verify(token, process.env.JWT_SECRET).id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Please log in again' });
  }
}

function makeToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

const isDate = (text) => /^\d{4}-\d{2}-\d{2}$/.test(text || '');

// max 20 login attempts per 15 minutes
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, message: { error: 'Too many attempts. Try later.' } });
// max 5 AI requests per hour from one IP
const aiLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, message: { error: 'Too many AI requests. Try again in an hour.' } });

// ---------- routes ----------

app.get('/', (req, res) => res.send('Study planner API is running'));

app.post('/register', loginLimit, safe(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Fill in all fields' });
  if (!email.includes('@')) return res.status(400).json({ error: 'Enter a valid email' });
  if (password.length < 8) return res.status(400).json({ error: 'Password needs at least 8 characters' });

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ error: 'This email is already registered' });

  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: makeToken(user), user: { name: user.name } });
}));

app.post('/login', loginLimit, safe(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: makeToken(user), user: { name: user.name } });
}));

// ----- tasks -----
app.get('/tasks', checkLogin, safe(async (req, res) => {
  res.json(await Task.find({ user: req.userId }));
}));

app.post('/tasks', checkLogin, safe(async (req, res) => {
  const { title, date, minutes, tag } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'Write a task title' });
  if (!isDate(date)) return res.status(400).json({ error: 'Date is not valid' });
  const task = await Task.create({ user: req.userId, title: title.trim().slice(0, 120), date, minutes: Number(minutes) || 30, tag: (tag || '').trim().slice(0, 20) });
  res.status(201).json(task);
}));

app.patch('/tasks/:id', checkLogin, safe(async (req, res) => {
  const changes = {};
  if (typeof req.body.done === 'boolean') changes.done = req.body.done;
  if (req.body.date !== undefined) {
    if (!isDate(req.body.date)) return res.status(400).json({ error: 'Date is not valid' });
    changes.date = req.body.date;
  }
  const task = await Task.findOneAndUpdate({ _id: req.params.id, user: req.userId }, changes, { new: true });
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
}));

app.delete('/tasks/:id', checkLogin, safe(async (req, res) => {
  await Task.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ ok: true });
}));

// ----- habits -----
app.get('/habits', checkLogin, safe(async (req, res) => {
  res.json(await Habit.find({ user: req.userId }));
}));

app.post('/habits', checkLogin, safe(async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Write a habit name' });
  res.status(201).json(await Habit.create({ user: req.userId, name: name.trim().slice(0, 60) }));
}));

// marks the habit done for a date, or unmarks it if already done
app.post('/habits/:id/toggle', checkLogin, safe(async (req, res) => {
  const { date } = req.body;
  if (!isDate(date)) return res.status(400).json({ error: 'Date is not valid' });
  const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
  if (!habit) return res.status(404).json({ error: 'Habit not found' });

  if (habit.log.includes(date)) habit.log = habit.log.filter((d) => d !== date);
  else habit.log.push(date);

  await habit.save();
  res.json(habit);
}));

app.delete('/habits/:id', checkLogin, safe(async (req, res) => {
  await Habit.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ ok: true });
}));

// ----- AI weekly plan -----
app.post('/plan', checkLogin, aiLimit, async (req, res) => {
  try {
    const { goals, hoursPerWeek, startDate } = req.body;
    const hours = Number(hoursPerWeek);

    if (!goals || goals.trim().length < 5) return res.status(400).json({ error: 'Write your goals (at least 5 letters)' });
    if (!hours || hours < 1 || hours > 60) return res.status(400).json({ error: 'Hours must be between 1 and 60' });
    if (!isDate(startDate)) return res.status(400).json({ error: 'Date is not valid' });

    // max 10 plans per user per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const used = await PlanUse.countDocuments({ user: req.userId, createdAt: { $gt: oneDayAgo } });
    if (used >= 10) return res.status(429).json({ error: 'You used all 10 AI plans for today' });

    // ask the AI (if it fails, makePlan gives a simple plan instead)
    const plan = await makePlan(goals.trim().slice(0, 600), hours);

    // turn "day 0..6" into real dates
    const rows = plan.tasks.map((task) => {
      const d = new Date(startDate + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() + task.day);
      return { user: req.userId, title: task.title, minutes: task.minutes, date: d.toISOString().slice(0, 10), tag: task.tag, fromPlan: true, fromAI: !plan.usedFallback };
    });

    if (!plan.usedFallback) await PlanUse.create({ user: req.userId });
    const saved = await Task.insertMany(rows);

    const note = plan.usedFallback
      ? `The AI is not available right now (${plan.reason}). I made a simple plan instead. Try again later for an AI plan.`
      : '';
    res.status(201).json({ tasks: saved, note });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  }
});

// removes planned tasks (AI or simple) that are not done, from a date onward
app.delete('/plan', checkLogin, safe(async (req, res) => {
  const from = req.query.from;
  if (!isDate(from)) return res.status(400).json({ error: 'Date is not valid' });
  const result = await Task.deleteMany({ user: req.userId, fromPlan: true, done: false, date: { $gte: from } });
  res.json({ deleted: result.deletedCount });
}));

// ---------- start ----------
if (!process.env.VERCEL) {
  const port = process.env.PORT || 5010;
  app.listen(port, () => console.log('Server running on http://localhost:' + port));
}

module.exports = app;
