import { useState } from 'react';

export default function Calendar({ tasks, selected, setSelected }) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = month.getFullYear();
  const monthNumber = month.getMonth();
  const daysInMonth = new Date(year, monthNumber + 1, 0).getDate();
  const emptySlots = month.getDay(); 

  // makes "2026-11-05" for a day number
  function dateText(day) {
    const d = new Date(year, monthNumber, day);
    return d.toLocaleDateString('sv');
  }

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = dateText(day);
    const dayTasks = tasks.filter((t) => t.date === date);
    const doneCount = dayTasks.filter((t) => t.done).length;
    const percent = dayTasks.length ? (doneCount / dayTasks.length) * 100 : 0;

    days.push(
      <button
        key={day}
        className={'day' + (date === selected ? ' sel' : '') + (date === new Date().toLocaleDateString('sv') ? ' today' : '')}
        style={{ '--fill': percent + '%' }}
        onClick={() => setSelected(date)}
      >
        {day}
        {dayTasks.length > 0 && <i className={percent === 100 ? 'full' : ''}>{dayTasks.length}</i>}
      </button>
    );
  }

  return (
    <section className="card">
      <div className="row">
        <button className="ghost" onClick={() => setMonth(new Date(year, monthNumber - 1, 1))}>‹</button>
        <h2>{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</h2>
        <button className="ghost" onClick={() => setMonth(new Date(year, monthNumber + 1, 1))}>›</button>
      </div>

      <div className="grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <b key={i} className="dow">{d}</b>)}
        {Array.from({ length: emptySlots }).map((_, i) => <span key={'e' + i} />)}
        {days}
      </div>
    </section>
  );
}
