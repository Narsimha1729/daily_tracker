import { useState, useEffect, useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const PALETTE = [
  '#60a5fa','#34d399','#f472b6','#fb923c','#a78bfa',
  '#38bdf8','#facc15','#f87171','#4ade80','#c084fc',
  '#22d3ee','#fb7185','#86efac','#fcd34d','#93c5fd',
  '#e879f9','#2dd4bf','#ff6b6b',
];

const DEFAULT_HABITS = [
  'Drink Water','Exercise','Read 30 min','Meditate',
  'Sleep 8hrs','Journal','Stretch','No Junk Food',
  'Cold Shower','Walk 10k Steps',
].map((name, i) => ({ id: `d${i}`, name, color: PALETTE[i] }));

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];
const DAY_LABELS = ['S','M','T','W','T','F','S'];

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const dk = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const dow = (y, m, d) => new Date(y, m, d).getDay();
const uid = () => Math.random().toString(36).slice(2, 9);

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [completions, setCompletions] = useState({});
  const [view, setView] = useState('grid');
  const [ready, setReady] = useState(false);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [toast, setToast] = useState('');

  // Load from localStorage on mount
  useEffect(() => {
    try { const h = localStorage.getItem('habitos_h'); if (h) setHabits(JSON.parse(h)); } catch(e) {}
    try { const c = localStorage.getItem('habitos_c'); if (c) setCompletions(JSON.parse(c)); } catch(e) {}
    setReady(true);
  }, []);

  // Save habits
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('habitos_h', JSON.stringify(habits)); } catch(e) {}
  }, [habits, ready]);

  // Save completions
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('habitos_c', JSON.stringify(completions)); } catch(e) {}
  }, [completions, ready]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const toggle = (hid, day) => {
    const k = dk(year, month, day);
    setCompletions(p => ({ ...p, [k]: { ...(p[k] || {}), [hid]: !(p[k]?.[hid]) } }));
  };

  const isChecked = useCallback((hid, day) =>
    !!completions[dk(year, month, day)]?.[hid],
  [completions, year, month]);

  const prevM = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextM = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const stats = useMemo(() => habits.map(h => {
    let count = 0;
    days.forEach(d => { if (!!completions[dk(year, month, d)]?.[h.id]) count++; });
    return { ...h, count, pct: totalDays ? Math.round(count / totalDays * 100) : 0 };
  }), [habits, completions, year, month, totalDays]);

  const weeklyStats = useMemo(() => {
    const weeks = [[], [], [], [], []];
    days.forEach(d => weeks[Math.floor((d - 1) / 7)].push(d));
    return weeks.filter(w => w.length > 0).map((wDays, wi) => {
      const total = wDays.length * habits.length;
      let done = 0;
      wDays.forEach(d => habits.forEach(h => { if (!!completions[dk(year, month, d)]?.[h.id]) done++; }));
      return { name: `W${wi + 1}`, pct: total ? Math.round(done / total * 100) : 0 };
    });
  }, [habits, completions, year, month]);

  const dailyPct = useMemo(() => days.map(d => {
    if (!habits.length) return { day: d, pct: 0 };
    let done = 0;
    habits.forEach(h => { if (!!completions[dk(year, month, d)]?.[h.id]) done++; });
    return { day: d, pct: Math.round(done / habits.length * 100) };
  }), [habits, completions, year, month]);

  const overallPct = useMemo(() => {
    const total = totalDays * habits.length;
    let done = 0;
    days.forEach(d => habits.forEach(h => { if (!!completions[dk(year, month, d)]?.[h.id]) done++; }));
    return total ? Math.round(done / total * 100) : 0;
  }, [habits, completions, year, month, totalDays]);

  const addHabit = () => {
    if (!newName.trim()) return;
    setHabits(p => [...p, { id: uid(), name: newName.trim(), color: PALETTE[p.length % PALETTE.length] }]);
    showToast(`✓ "${newName.trim()}" added`);
    setNewName('');
  };

  const deleteHabit = id => {
    const h = habits.find(x => x.id === id);
    setHabits(p => p.filter(h => h.id !== id));
    showToast(`Deleted "${h?.name}"`);
  };

  const startEdit = h => { setEditId(h.id); setEditName(h.name); setEditColor(h.color); };
  const saveEdit = () => {
    setHabits(p => p.map(h => h.id === editId ? { ...h, name: editName, color: editColor } : h));
    setEditId(null);
    showToast('Habit updated ✓');
  };

  const isToday = d => now.getFullYear() === year && now.getMonth() === month && now.getDate() === d;
  const isWeekStart = d => d > 1 && dow(year, month, d) === 0;
  const todayDone = habits.filter(h => isChecked(h.id, now.getDate())).length;

  return (
    <div style={{ background: '#07070e', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#6366f1', color: '#fff', padding: '10px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: '0 4px 20px #6366f140', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#0c0c18', borderBottom: '1px solid #1a1a2a', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', letterSpacing: '-0.02em' }}>
            habit<span style={{ color: '#6366f1' }}>OS</span>
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
            {month === now.getMonth() && year === now.getFullYear()
              ? `Today: ${todayDone}/${habits.length} habits done`
              : `${MONTHS[month]} ${year} · ${habits.length} habits`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[['grid', '▦ Grid'], ['dashboard', '◉ Dashboard'], ['manage', '✦ Habits']].map(([v, label]) => (
            <button key={v} className="nav-btn" onClick={() => setView(v)} style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid',
              borderColor: view === v ? '#6366f1' : '#1a1a2a',
              background: view === v ? '#6366f115' : 'transparent',
              color: view === v ? '#818cf8' : '#475569',
              cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Month Nav */}
      {view !== 'manage' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 0', background: '#07070e' }}>
          <button className="arrow-btn" onClick={prevM} style={{ background: '#111120', border: '1px solid #1e1e2e', color: '#94a3b8', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>‹</button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', minWidth: 160 }}>{MONTHS[month]} {year}</span>
          <button className="arrow-btn" onClick={nextM} style={{ background: '#111120', border: '1px solid #1e1e2e', color: '#94a3b8', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>›</button>
          {!(year === now.getFullYear() && month === now.getMonth()) && (
            <button onClick={goToday} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #2a2a3d', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>Today</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6366f1', fontWeight: 700, background: '#6366f115', padding: '4px 10px', borderRadius: 6 }}>
            {overallPct}% this month
          </span>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === 'grid' && (
        <div style={{ overflowX: 'auto', padding: '16px 20px 40px' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 'max-content' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 12px 10px 0', textAlign: 'left', fontSize: 11, color: '#475569', fontWeight: 600, position: 'sticky', left: 0, background: '#07070e', zIndex: 2, minWidth: 160, whiteSpace: 'nowrap' }}>HABIT</th>
                {days.map(d => (
                  <th key={d} style={{ padding: '0 2px 10px', fontSize: 10, textAlign: 'center', minWidth: 26, color: isToday(d) ? '#818cf8' : '#3a3a52', borderLeft: isWeekStart(d) ? '1px solid #1a1a2a' : 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                    <div style={{ fontWeight: isToday(d) ? 700 : 500, fontSize: 11 }}>{d}</div>
                    <div style={{ fontSize: 9, color: isToday(d) ? '#6366f1' : '#2a2a3d' }}>{DAY_LABELS[dow(year, month, d)]}</div>
                  </th>
                ))}
                <th style={{ padding: '0 0 10px 10px', fontSize: 10, color: '#475569', fontWeight: 600, whiteSpace: 'nowrap', textAlign: 'right' }}>DONE</th>
                <th style={{ padding: '0 0 10px 8px', fontSize: 10, color: '#475569', fontWeight: 600, textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {habits.map((h, hi) => (
                <tr key={h.id} className="habit-row" style={{ borderTop: '1px solid #10101c' }}>
                  <td style={{ padding: '5px 12px 5px 0', fontSize: 12, color: '#c4c4d8', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', position: 'sticky', left: 0, background: '#07070e', zIndex: 1 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: h.color, marginRight: 8, verticalAlign: 'middle' }} />
                    {h.name}
                  </td>
                  {days.map(d => {
                    const done = isChecked(h.id, d);
                    const today = isToday(d);
                    return (
                      <td key={d} style={{ textAlign: 'center', padding: '3px 2px', borderLeft: isWeekStart(d) ? '1px solid #1a1a2a' : 'none', background: today ? '#0e0e1c' : 'transparent' }}>
                        <div className="cb-cell" onClick={() => toggle(h.id, d)} style={{ width: 20, height: 20, borderRadius: 5, margin: '0 auto', border: `1.5px solid ${done ? h.color : today ? '#2a2a40' : '#1a1a2a'}`, background: done ? h.color + '25' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: h.color, fontWeight: 700 }}>
                          {done && '✓'}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: '5px 0 5px 10px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>
                    {stats[hi]?.count}<span style={{ color: '#2a2a3d' }}>/{totalDays}</span>
                  </td>
                  <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: stats[hi]?.pct >= 70 ? '#34d399' : stats[hi]?.pct >= 40 ? '#facc15' : '#475569' }}>
                    {stats[hi]?.pct}%
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #2a2a3d', background: '#0c0c18' }}>
                <td style={{ padding: '8px 12px 8px 0', fontSize: 11, color: '#64748b', fontWeight: 700, position: 'sticky', left: 0, background: '#0c0c18', zIndex: 1 }}>TOTALS</td>
                {days.map(d => {
                  let cnt = 0;
                  habits.forEach(h => { if (isChecked(h.id, d)) cnt++; });
                  const pct = habits.length ? Math.round(cnt / habits.length * 100) : 0;
                  return (
                    <td key={d} style={{ textAlign: 'center', padding: '8px 2px', borderLeft: isWeekStart(d) ? '1px solid #1a1a2a' : 'none', background: isToday(d) ? '#0e0e1c' : 'transparent' }}>
                      <div style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: pct >= 70 ? '#34d399' : pct > 0 ? '#facc15' : '#2a2a3d', fontWeight: 600 }}>{pct > 0 ? `${pct}` : '·'}</div>
                    </td>
                  );
                })}
                <td colSpan={2} style={{ padding: '8px 0 8px 10px', textAlign: 'right', fontSize: 11, color: '#6366f1', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{overallPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── DASHBOARD VIEW ── */}
      {view === 'dashboard' && (
        <div style={{ padding: '20px', display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {[
              { label: 'Monthly %', value: `${overallPct}%`, color: '#6366f1' },
              { label: 'Habits', value: habits.length, color: '#34d399' },
              { label: 'Days Tracked', value: totalDays, color: '#60a5fa' },
              { label: 'Best Habit', value: stats.length ? `${Math.max(...stats.map(s => s.pct))}%` : '—', color: '#f472b6' },
            ].map(card => (
              <div key={card.label} style={{ background: '#0f0f1c', border: '1px solid #1a1a2a', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: card.color, fontFamily: "'JetBrains Mono', monospace" }}>{card.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#0f0f1c', border: '1px solid #1a1a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Weekly Completion %</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyStats} barSize={44} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={v => [`${v}%`, 'Completion']} contentStyle={{ background: '#0c0c18', border: '1px solid #2a2a3d', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>{weeklyStats.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: '#0f0f1c', border: '1px solid #1a1a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Monthly Heatmap</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, maxWidth: 380 }}>
              {DAY_LABELS.map((l, i) => <div key={i} style={{ fontSize: 10, color: '#3a3a52', textAlign: 'center', paddingBottom: 4, fontWeight: 600 }}>{l}</div>)}
              {Array.from({ length: dow(year, month, 1) }).map((_, i) => <div key={`e${i}`} />)}
              {dailyPct.map(({ day, pct }) => {
                const alpha = pct / 100;
                const bg = pct === 0 ? '#111120' : `rgba(99,102,241,${0.12 + alpha * 0.88})`;
                return (
                  <div key={day} style={{ aspectRatio: '1', borderRadius: 5, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: pct > 50 ? '#fff' : pct > 0 ? '#94a3b8' : '#2a2a3d', border: isToday(day) ? '1px solid #6366f1' : '1px solid transparent' }}>
                    {day}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 14, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#3a3a52' }}>0%</span>
              {[0.05, 0.25, 0.5, 0.75, 1].map(a => <div key={a} style={{ width: 22, height: 10, borderRadius: 2, background: `rgba(99,102,241,${0.12 + a * 0.88})` }} />)}
              <span style={{ fontSize: 10, color: '#3a3a52' }}>100%</span>
            </div>
          </div>

          <div style={{ background: '#0f0f1c', border: '1px solid #1a1a2a', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Habit Performance This Month</div>
            <div style={{ display: 'grid', gap: 11 }}>
              {[...stats].sort((a, b) => b.pct - a.pct).map(h => (
                <div key={h.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: h.color }} />
                      {h.name}
                    </span>
                    <span style={{ fontSize: 12, color: h.color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{h.count}/{totalDays}</span>
                  </div>
                  <div style={{ background: '#111120', borderRadius: 99, height: 7, overflow: 'hidden' }}>
                    <div className="bar-track" style={{ width: `${h.pct}%`, height: '100%', background: h.color, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE VIEW ── */}
      {view === 'manage' && (
        <div style={{ padding: '20px', maxWidth: 560 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Add New Habit</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <input
              style={{ flex: 1, background: '#0f0f1c', border: '1px solid #1e1e2e', borderRadius: 8, padding: '9px 14px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit' }}
              placeholder="e.g. No Sugar, Gratitude Journal..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHabit()}
            />
            <button className="action-btn" onClick={addHabit} style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
              + Add
            </button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Your Habits ({habits.length})</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {habits.map(h => (
              <div key={h.id} style={{ background: '#0f0f1c', border: '1px solid #1a1a2a', borderRadius: 10, padding: '12px 14px' }}>
                {editId === h.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input style={{ background: '#07070e', border: '1px solid #2a2a3d', borderRadius: 7, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit' }} value={editName} onChange={e => setEditName(e.target.value)} />
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: '#475569', marginRight: 4 }}>Color:</span>
                      {PALETTE.map(c => (
                        <div key={c} onClick={() => setEditColor(c)} style={{ width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer', border: editColor === c ? '2px solid #fff' : '2px solid transparent', outline: editColor === c ? '1px solid ' + c : 'none' }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="action-btn" onClick={saveEdit} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Save</button>
                      <button className="action-btn" onClick={() => setEditId(null)} style={{ padding: '7px 14px', borderRadius: 7, border: '1px solid #2a2a3d', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: '#c4c4d8', fontWeight: 500 }}>{h.name}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="action-btn" onClick={() => startEdit(h)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #2a2a3d', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Edit</button>
                      <button className="action-btn" onClick={() => deleteHabit(h.id)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #ef444430', background: '#ef444410', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
