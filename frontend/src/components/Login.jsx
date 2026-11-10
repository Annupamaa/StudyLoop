import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = isRegister ? '/register' : '/login';
      const data = await api(path, 'POST', { name, email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <main className="auth">
      <h1>Studyloop</h1>
      <p className="sub">Tell it your goals and hours. Get a week of sessions, then keep your streak alive.</p>

      <form onSubmit={handleSubmit}>
        {isRegister && (
          <label>Name <input value={name} onChange={(e) => setName(e.target.value)} required /></label>
        )}
        <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>

        {error && <p className="err">{error}</p>}
        <button className="primary" disabled={loading}>
          {loading ? 'Please wait...' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>

      <button className="link" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
        {isRegister ? 'Have an account? Log in' : 'New here? Create an account'}
      </button>
    </main>
  );
}
