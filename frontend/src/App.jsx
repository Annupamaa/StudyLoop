import { useState, useEffect } from 'react';
import { api, today } from './api';
import Login from './components/Login';
import Today from './components/Today';
import Planner from './components/Planner';
import Calendar from './components/Calendar';
import Tasks from './components/Tasks';
import Habits from './components/Habits';

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [selected, setSelected] = useState(today());
  const [focus, setFocus] = useState(null); // { task, endAt } while the timer runs

  // load data after login
  useEffect(() => {
    if (!user) return;
    api('/tasks').then(setTasks).catch(() => {});
    api('/habits').then(setHabits).catch(() => {});
  }, [user]);

  // changes a task (done or date) and updates the list
  async function updateTask(task, changes) {
    const updated = await api('/tasks/' + task._id, 'PATCH', changes);
    setTasks((list) => list.map((t) => (t._id === task._id ? updated : t)));
  }

  // focus timer: up to 25 minutes
  function startFocus(task) {
    const minutes = Math.min(25, task.minutes);
    setFocus({ task, endAt: Date.now() + minutes * 60 * 1000 });
  }

  async function finishFocus(task) {
    setFocus(null);
    try {
      await updateTask(task, { done: true });
    } catch (err) {
      console.log(err.message);
    }
  }

  function logout() {
    localStorage.clear();
    setUser(null);
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <>
      <header>
        <h1>Studyloop</h1>
        <div className="row">
          <span>{user.name}</span>
          <button className="ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <div className="top">
        <Today tasks={tasks} habits={habits} focus={focus} onFocusDone={finishFocus} onFocusCancel={() => setFocus(null)} />
      </div>

      <main className="dash">
        <div>
          <Planner
            onNewTasks={(newTasks) => setTasks((list) => [...list, ...newTasks])}
            onCleared={(from) => setTasks((list) => list.filter((t) => !(t.fromPlan && !t.done && t.date >= from)))}
          />
          <Calendar tasks={tasks} selected={selected} setSelected={setSelected} />
        </div>
        <div>
          <Tasks date={selected} tasks={tasks} setTasks={setTasks} updateTask={updateTask} onFocus={startFocus} focusId={focus?.task._id} />
          <Habits habits={habits} setHabits={setHabits} />
        </div>
      </main>
    </>
  );
}
