import { useState, useEffect } from 'react';
import { today, timeText } from '../api';

function clock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + String(s).padStart(2, '0');
}

export default function Today({ tasks, habits, focus, onFocusDone, onFocusCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState('');

  // runs the focus timer
  useEffect(() => {
    if (!focus) return;
    setMessage('');

    function tick() {
      const left = Math.round((focus.endAt - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        setMessage(`Session finished. "${focus.task.title}" is marked done.`);
        onFocusDone(focus.task);
      } else {
        setSecondsLeft(left);
      }
    }

    const timer = setInterval(tick, 1000);
    tick();
    return () => clearInterval(timer);
  }, [focus]);

  const day = today();
  const todaysTasks = tasks.filter((t) => t.date === day);
  const tasksDone = todaysTasks.filter((t) => t.done).length;
  const minutesLeft = todaysTasks.filter((t) => !t.done).reduce((sum, t) => sum + t.minutes, 0);
  const habitsDone = habits.filter((h) => h.log.includes(day)).length;
  const missed = tasks.filter((t) => t.date < day && !t.done).length;

  const total = todaysTasks.length + habits.length;
  const done = tasksDone + habitsDone;

  return (
    <section className="card today">
      <h2>Today</h2>
      <p className="big">{total === 0 ? 'Nothing planned for today' : `${done} of ${total} done`}</p>
      {total > 0 && <div className="bar"><span style={{ width: (done / total) * 100 + '%' }} /></div>}

      <div className="stats">
        <span>Tasks: {tasksDone} of {todaysTasks.length} done, {timeText(minutesLeft)} left</span>
        <span>Habits: {habitsDone} of {habits.length} done</span>
      </div>
      {missed > 0 && <p className="warn">You have {missed} missed {missed === 1 ? 'task' : 'tasks'}. Move them to today in the task list.</p>}

      {focus ? (
        <div className="timer">
          <div className="clock">{clock(secondsLeft)}</div>
          <div className="grow"><b>Focusing</b><br />{focus.task.title}</div>
          <button className="ghost" onClick={onFocusCancel}>Cancel</button>
        </div>
      ) : (
        <p className="note">{message || 'Press Focus next to a task to start a timer of up to 25 minutes.'}</p>
      )}
    </section>
  );
}
