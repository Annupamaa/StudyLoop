const API = import.meta.env.VITE_API_URL || 'http://localhost:5010';

// gives today's date as "2026-11-10" (local time)
export function today() {
  return new Date().toLocaleDateString('sv');
}

export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');

  const response = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  // token expired -> go back to the login page
  if (response.status === 401 && token) {
    localStorage.clear();
    window.location.reload();
  }
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// "1h 20m" style text from minutes
export function timeText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + 'm';
  return m ? `${h}h ${m}m` : `${h}h`;
}

// the same tag always gets the same colour
export function tagColor(tag) {
  let n = 0;
  for (const c of tag) n = (n * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${n} 55% 38%)`;
}
