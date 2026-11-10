import { useState } from 'react';
import { api, today } from '../api';

export default function Planner({ onNewTasks, onCleared }) {
  const [goals, setGoals] = useState('');
  const [hours, setHours] = useState(8);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      const data = await api('/plan', 'POST', { goals, hoursPerWeek: Number(hours), startDate: today() });
      onNewTasks(data.tasks);
      setMessage(data.note || `Added ${data.tasks.length} sessions to your calendar.`);
      setGoals('');
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
    setLoading(false);
  }

  // removes all planned tasks that are not done, from today onward
  async function clearPlan() {
    if (!window.confirm('Remove all unfinished planned tasks from today onward?')) return;
    setIsError(false);
    try {
      const data = await api('/plan?from=' + today(), 'DELETE');
      onCleared(today());
      setMessage(`Removed ${data.deleted} planned tasks.`);
    } catch (err) {
      setIsError(true);
      setMessage(err.message);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Plan my week</h2>
      <textarea
        value={goals}
        onChange={(e) => setGoals(e.target.value)}
        placeholder="Example: Finish DSA arrays and strings, revise DBMS, 2 mock tests"
        minLength={5}
        maxLength={600}
        required
      />
      <div className="row">
        <label>Hours this week <input type="number" min="1" max="60" value={hours} onChange={(e) => setHours(e.target.value)} /></label>
        <button className="primary" disabled={loading}>{loading ? 'Planning...' : 'Generate plan'}</button>
        <button type="button" className="ghost" onClick={clearPlan}>Clear plan</button>
      </div>
      {message && <p className={isError ? 'err' : 'note'}>{message}</p>}
    </form>
  );
}
