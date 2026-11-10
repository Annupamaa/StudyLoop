import { useState } from 'react';
import { api, today, tagColor, timeText } from '../api';

const DURATIONS = [15, 30, 45, 60];

export default function Tasks({ date, tasks, setTasks, updateTask, onFocus, focusId }) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  const todayText = today();

  // tasks from earlier days that are not done
  const missed = tasks.filter((t) => t.date < todayText && !t.done).sort((a, b) => a.date.localeCompare(b.date));

  const dayTasks = tasks.filter((t) => t.date === date);
  const dayTags = [...new Set(dayTasks.map((t) => t.tag).filter(Boolean))];
  const allTags = [...new Set(tasks.map((t) => t.tag).filter(Boolean))];
  const activeFilter = dayTags.includes(filter) ? filter : 'All';
  const shown = activeFilter === 'All' ? dayTasks : dayTasks.filter((t) => t.tag === activeFilter);

  const doneCount = dayTasks.filter((t) => t.done).length;
  const minutesLeft = dayTasks.filter((t) => !t.done).reduce((sum, t) => sum + t.minutes, 0);

  async function addTask(e) {
    e.preventDefault();
    setError('');
    try {
      const newTask = await api('/tasks', 'POST', { title, date, minutes, tag });
      setTasks([...tasks, newTask]);
      setTitle('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function change(task, changes) {
    setError('');
    try {
      await updateTask(task, changes);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(task) {
    setError('');
    try {
      await api('/tasks/' + task._id, 'DELETE');
      setTasks(tasks.filter((t) => t._id !== task._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="card">
      {missed.length > 0 && (
        <div className="missed">
          <b>Missed ({missed.length})</b>
          <ul className="list">
            {missed.map((t) => (
              <li key={t._id}>
                <span className="grow">{t.title} <small>{t.date}</small></span>
                <button className="small" onClick={() => change(t, { date: todayText })}>Move to today</button>
                <button className="ghost" onClick={() => remove(t)}>×</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2>{new Date(date + 'T00:00').toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
      {dayTasks.length > 0 && (
        <>
          <p className="note">{doneCount} of {dayTasks.length} done, {timeText(minutesLeft)} left</p>
          <div className="bar"><span style={{ width: (doneCount / dayTasks.length) * 100 + '%' }} /></div>
        </>
      )}

      {dayTags.length > 1 && (
        <div className="chips">
          {['All', ...dayTags].map((name) => (
            <button key={name} className={'chip' + (activeFilter === name ? ' on' : '')} onClick={() => setFilter(name)}>{name}</button>
          ))}
        </div>
      )}

      <ul className="list">
        {shown.map((task) => (
          <li key={task._id} className={task.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={task.done} onChange={() => change(task, { done: !task.done })} /> {task.title}
            </label>
            {task.tag && <span className="tag" style={{ background: tagColor(task.tag) }}>{task.tag}</span>}
            {task.fromAI && <span className="tag ai">AI</span>}
            <small>{task.minutes}m</small>
            {!task.done && (
              <button className="small" onClick={() => onFocus(task)}>{focusId === task._id ? 'Focusing' : 'Focus'}</button>
            )}
            <button className="ghost" onClick={() => remove(task)}>×</button>
          </li>
        ))}
        {shown.length === 0 && <li className="empty">Nothing planned. Add a task or generate a plan.</li>}
      </ul>

      <form onSubmit={addTask}>
        <div className="row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" maxLength={120} required />
          <input className="num" list="tag-list" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" maxLength={20} />
          <datalist id="tag-list">{allTags.map((name) => <option key={name} value={name} />)}</datalist>
        </div>
        <div className="row mins">
          {DURATIONS.map((m) => (
            <button type="button" key={m} className={'chip' + (minutes === m ? ' on' : '')} onClick={() => setMinutes(m)}>{m} min</button>
          ))}
          <button className="primary">Add task</button>
        </div>
      </form>
      {error && <p className="err">{error}</p>}
    </section>
  );
}
