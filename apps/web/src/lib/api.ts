const API_BASE = import.meta.env.VITE_API_URL || '';

export async function analyzeText(payload: {
  filename: string;
  textContent: string;
  companyName?: string;
  fiscalYear?: number;
}) {
  const res = await fetch(`${API_BASE}/api/analyze/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }
  return res.json();
}

export async function analyzeStructured(payload: {
  current: unknown;
  prior?: unknown;
  dataQuality?: number;
}) {
  const res = await fetch(`${API_BASE}/api/analyze/structured`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Analysis failed (${res.status})`);
  }
  return res.json();
}

export async function askCfo(payload: {
  question: string;
  current: unknown;
  dataQuality?: number;
}) {
  const res = await fetch(`${API_BASE}/api/cfo-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `CFO chat failed (${res.status})`);
  }
  return res.json();
}
