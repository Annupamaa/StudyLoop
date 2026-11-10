import { useState } from 'react';
import { api, today } from '../api';

// how many days in a row, counting back from today (or yesterday)
function currentStreak(log) {
  const day = new Date();
  if (!log.includes(day.toLocaleDateString('sv'))) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (log.includes(day.toLocaleDateString('sv'))) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

// the longest run of days in a row, ever
function bestStreak(log) {
  const days = [...new Set(log)].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const d of days) {
    if (previous && new Date(d) - new Date(previous) === 24 * 60 * 60 * 1000) run++;
    else run = 1;
    best = Math.max(best, run);
    previous = d;
  }
  return best;
}

// percent of the last 30 days this habit was done
function percent30(log) {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  const from = start.toLocaleDateString('sv');
  const count = new Set(log.filter((d) => d >= from && d <= today())).size;
  return Math.round((count / 30) * 100);
}

// the last 7 days, oldest first
function lastWeek() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function Habits({ habits, setHabits }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const todayText = today();
  const doneToday = habits.filter((h) => h.log.includes(todayText)).length;

  async function addHabit(e) {
    e.preventDefault();
    setError('');
    try {
      const habit = await api('/habits', 'POST', { name });
      setHabits([...habits, habit]);
      setName('');
    } catch (err) {
      setError(err.message);
    }
  }

  // works for today and for the past days in the 7-day row
  async function toggle(habit, date) {
    setError('');
    try {
      const updated = await api(`/habits/${habit._id}/toggle`, 'POST', { date });
      setHabits(habits.map((h) => (h._id === habit._id ? updated : h)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(habit) {
    try {
      await api('/habits/' + habit._id, 'DELETE');
      setHabits(habits.filter((h) => h._id !== habit._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      <h2>Habits</h2>
      {habits.length > 0 && <p className="note">{doneToday} of {habits.length} done today</p>}

      {habits.map((habit) => (
        <div key={habit._id} className="habit">
          <div className="row">
            <b className="grow">{habit.name}</b>
            <button className="ghost" onClick={() => remove(habit)}>×</button>
          </div>
          <div className="stats">
            <span>Streak: {currentStreak(habit.log)}</span>
            <span>Best: {bestStreak(habit.log)}</span>
            <span>Last 30 days: {percent30(habit.log)}%</span>
          </div>
          <div className="week">
            {lastWeek().map((d) => {
              const date = d.toLocaleDateString('sv');
              const done = habit.log.includes(date);
              return (
                <button
                  key={date}
                  className={'wd' + (done ? ' on' : '') + (date === todayText ? ' now' : '')}
                  onClick={() => toggle(habit, date)}
                  title={date}
                  aria-label={`${habit.name} on ${date}: ${done ? 'done' : 'not done'}`}
                >
                  {d.toLocaleDateString('en', { weekday: 'narrow' })}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {habits.length === 0 && <p className="empty">Add a daily habit to start a streak.</p>}

      <form className="row" onSubmit={addHabit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Solve 1 problem" maxLength={60} required />
        <button className="primary">Add</button>
      </form>
      {error && <p className="err">{error}</p>}
    </section>
  );
}
