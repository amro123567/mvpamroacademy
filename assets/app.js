/* Amro Academy MVP — runs fully in the browser. Data is saved in this browser (localStorage). */
(function () {
'use strict';
const KEY = 'amro_mvp_v1', MEKEY = 'amro_mvp_me';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => (n < 0 ? '-' : '') + '$' + Math.abs(n).toFixed(2);
const uid = () => Math.random().toString(36).slice(2, 10);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const SKILLS = ['Algebra', 'Advanced Math', 'Problem-Solving & Data Analysis', 'Geometry & Trigonometry', 'Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions'];
const H = 3600e3, D = 24 * H;
let db, me = null, mute = false, timer = null, mem = {};

/* ---------- storage ---------- */
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } }
};
const save = () => ls.set(KEY, JSON.stringify(db));
function blank() {
  return {
    settings: { academy: 'Amro Academy', adminName: 'Admin', adminEmail: '', lateHours: 24, chargeLate: true, payTutorLate: true, chargeNoShow: true, noShowTutorPct: 50, master: true, libPlan: 'Full SAT Library · 1 year', libPrice: 150, minSat: 1450, commissionPct: 30, defaultPrice: 45 },
    tutors: [], parents: [], students: [], enrollments: [], packages: [], sessions: [], ledger: [], tutorLedger: [],
    scores: [], tests: [], assignments: [], attempts: [], progress: {}, messages: [],
    libTopics: [], subscriptions: [], libProgress: {}, applications: [],
    rules: [
      ['booking_confirm', 'Booking confirmation', 'Session booked', 'Parent, tutor'],
      ['reminder_24h', 'Session reminder', '24 hours before (checked when the app is open)', 'Parent, tutor'],
      ['session_change', 'Reschedule / cancel notice', 'Session changed', 'Parent, tutor'],
      ['session_summary', 'Session summary', 'Session logged', 'Parent'],
      ['log_reminder', 'Log reminder', '12 hours after an unlogged session', 'Tutor'],
      ['payment_receipt', 'Payment confirmation', 'Payment recorded', 'Parent'],
      ['package_low', 'Package running low', '2 sessions left', 'Parent'],
      ['practice_assigned', 'Practice test assigned', 'Test assigned', 'Student'],
      ['practice_result', 'Practice result', 'Test submitted', 'Tutor, admin'],
      ['library_welcome', 'Library subscription activated', 'Subscription activated', 'Parent, student'],
      ['library_renewal', 'Library renewal reminder', '30, 7 and 1 days before access ends', 'Parent'],
      ['library_expired', 'Library access ended', 'Subscription ended', 'Parent, student'],
      ['application_received', 'Tutor application received', 'Application submitted', 'Applicant'],
      ['tutor_payout', 'Tutor paid for a session', 'Session payout recorded', 'Tutor']
    ].map(r => ({ id: r[0], name: r[1], trigger: r[2], to: r[3], on: true }))
  };
}

/* ---------- lookups ---------- */
const by = (list, id) => db[list].find(x => x.id === id);
const tut = id => by('tutors', id), par = id => by('parents', id), stu = id => by('students', id), enr = id => by('enrollments', id);
const sEnr = s => enr(s.enrollmentId), sStu = s => stu(sEnr(s).studentId), sTut = s => tut(sEnr(s).tutorId);
const sEnd = s => new Date(s.start).getTime() + s.duration * 60000;
const dayIdx = d => (d.getDay() + 6) % 7;
const pad = n => String(n).padStart(2, '0');
const fmtD = iso => { const d = new Date(iso); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); };
const fmtT = iso => { const d = new Date(iso); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const fmtDT = iso => fmtD(iso) + ' · ' + fmtT(iso);
const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
const balance = pid => db.ledger.filter(l => l.parentId === pid).reduce((a, l) => a + (l.type === 'payment' || l.type === 'credit' ? -l.amount : l.amount), 0);
const tutorOwed = tid => db.tutorLedger.filter(l => l.tutorId === tid).reduce((a, l) => a + (l.type === 'earning' || l.type === 'bonus' ? l.amount : -l.amount), 0);
const activePkg = eid => db.packages.find(p => p.enrollmentId === eid && p.used < p.total);
const myEnrollments = () => db.enrollments.filter(e => e.active && (me.role === 'admin' || (me.role === 'tutor' && e.tutorId === me.id) || (me.role === 'parent' && stu(e.studentId).parentId === me.id) || (me.role === 'student' && e.studentId === me.id)));
const myStudents = () => me.role === 'admin' ? db.students : me.role === 'parent' ? db.students.filter(s => s.parentId === me.id) : me.role === 'student' ? db.students.filter(s => s.id === me.id) : db.students.filter(s => db.enrollments.some(e => e.active && e.studentId === s.id && e.tutorId === me.id));
const mySessions = () => { const ids = new Set(myEnrollments().concat(me.role === 'admin' ? db.enrollments : []).map(e => e.id)); return db.sessions.filter(s => ids.has(s.enrollmentId)); };
function person(kind, id) {
  if (kind === 'admin') return { name: db.settings.adminName || 'Admin', email: db.settings.adminEmail, phone: '' };
  if (kind === 'applicant') { const a = db.applications.find(x => x.id === id); return a ? { name: a.name, email: a.email, phone: a.phone } : {}; }
  if (kind === 'student') { const s = stu(id); return s ? { name: s.name, email: s.email || '', phone: '' } : {}; }
  return (kind === 'tutor' ? tut(id) : par(id)) || { name: '?' };
}

/* ---------- business logic ---------- */
function notify(ruleId, kind, id, subject, body) {
  if (mute) return;
  const r = db.rules.find(x => x.id === ruleId);
  if (ruleId !== 'manual' && (!db.settings.master || !r || !r.on)) return;
  const p = person(kind, id);
  db.messages.unshift({ id: uid(), date: new Date().toISOString(), rule: r ? r.name : 'Manual message', toKind: kind, toId: id || '', toName: p.name, email: p.email || '', phone: p.phone || '', subject, body });
}
function clash(tutorId, studentId, start, end, ignoreId) {
  return db.sessions.find(s => s.id !== ignoreId && (s.status === 'booked' || s.status === 'completed') &&
    (sEnr(s).tutorId === tutorId || sEnr(s).studentId === studentId) && new Date(s.start).getTime() < end && sEnd(s) > start);
}
function sessionLine(s) { const e = sEnr(s); return `${e.subject} · ${fmtDT(s.start)} · ${s.duration} min · ${s.mode}`; }
function bookSession(o, force) {
  const e = enr(o.enrollmentId), start = new Date(o.start).getTime(), end = start + o.duration * 60000;
  if (!e) return 'Choose a student and subject.';
  if (isNaN(start)) return 'Choose a date and time.';
  if (!force && start < Date.now()) return 'That time is in the past.';
  const c = clash(e.tutorId, e.studentId, start, end);
  if (c) return 'Clash with another session: ' + sStu(c).name + ' · ' + fmtDT(c.start);
  const s = { id: uid(), enrollmentId: e.id, start: new Date(start).toISOString(), duration: +o.duration, mode: o.mode || 'Online', status: 'booked' };
  db.sessions.push(s);
  const st = stu(e.studentId), t = tut(e.tutorId);
  notify('booking_confirm', 'parent', st.parentId, `Session booked for ${st.name}`, `A session is confirmed for ${st.name} with ${t.name}.\n${sessionLine(s)}\n\nYou will get a reminder the day before. To change it, open Schedule in the parent portal.`);
  notify('booking_confirm', 'tutor', t.id, `Session booked: ${st.name}`, `You booked ${st.name}.\n${sessionLine(s)}`);
  return s;
}
function addLedger(parentId, type, amount, desc, extra) { db.ledger.push(Object.assign({ id: uid(), parentId, type, amount: +amount, desc, date: new Date().toISOString() }, extra)); }
function addTutorLedger(tutorId, type, amount, desc, extra) { db.tutorLedger.push(Object.assign({ id: uid(), tutorId, type, amount: +amount, desc, date: new Date().toISOString() }, type === 'earning' ? { payStatus: 'due' } : {}, extra)); }
function chargeSession(s, label, tutorPct) {
  const e = sEnr(s), st = stu(e.studentId), pk = activePkg(e.id), date = s.start;
  if (pk) {
    pk.used++;
    addLedger(st.parentId, 'package', 0, `${label}: ${st.name} · ${e.subject} (package ${pk.used}/${pk.total})`, { date, sessionId: s.id });
    if (pk.total - pk.used === 2) notify('package_low', 'parent', st.parentId, `${st.name}'s package has 2 sessions left`, `${st.name}'s ${e.subject} package has 2 sessions left. Reply to renew.`);
  } else addLedger(st.parentId, 'charge', e.price, `${label}: ${st.name} · ${e.subject}`, { date, sessionId: s.id });
  if (tutorPct > 0) addTutorLedger(e.tutorId, 'earning', e.tutorRate * tutorPct / 100, `${label}: ${st.name} · ${e.subject}`, { date, sessionId: s.id });
}
function logSession(id, f) {
  const s = by('sessions', id), e = sEnr(s), st = stu(e.studentId), t = tut(e.tutorId);
  if (s.status !== 'booked') return 'This session is already closed.';
  s.log = { attendance: f.attendance, summary: f.summary || '', homework: f.homework || '', prevHw: f.prevHw || '', skills: f.skills || [], parentNote: f.parentNote || '', adminNote: f.adminNote || '', loggedAt: new Date().toISOString() };
  if (f.attendance === 'noshow') {
    s.status = 'noshow';
    if (db.settings.chargeNoShow) chargeSession(s, 'No-show', db.settings.noShowTutorPct);
    else if (db.settings.noShowTutorPct > 0) addTutorLedger(e.tutorId, 'earning', e.tutorRate * db.settings.noShowTutorPct / 100, `No-show: ${st.name}`, { date: s.start, sessionId: s.id });
  } else { s.status = 'completed'; chargeSession(s, 'Session', 100); }
  const cash = +f.cash || 0;
  if (cash > 0) {
    addLedger(st.parentId, 'payment', cash, `Cash collected by ${t.name}`, { method: 'Cash via tutor', date: s.start });
    addTutorLedger(t.id, 'cash', cash, `Cash collected from ${par(st.parentId).name}`, { date: s.start });
    db.tutorLedger.filter(l => l.sessionId === s.id && l.type === 'earning').forEach(l => l.payStatus = 'cash');
  }
  if (s.status === 'completed') notify('session_summary', 'parent', st.parentId, `${st.name}'s session summary · ${fmtD(s.start)}`,
    `${e.subject} with ${t.name} · ${s.duration} min\n\nWhat we did: ${s.log.summary || '-'}\nSkills: ${s.log.skills.join(', ') || '-'}\nHomework: ${s.log.homework || 'None'}\nLast homework: ${s.log.prevHw || '-'}${s.log.parentNote ? '\n\nNote from the tutor: ' + s.log.parentNote : ''}`);
}
function cancelSession(id, byWho, reason) {
  const s = by('sessions', id), e = sEnr(s), st = stu(e.studentId);
  if (s.status !== 'booked') return 'This session is already closed.';
  const late = byWho === 'parent' && new Date(s.start).getTime() - Date.now() < db.settings.lateHours * H;
  s.status = 'cancelled'; s.cancel = { by: byWho, reason: reason || '', late, at: new Date().toISOString() };
  if (late && db.settings.chargeLate) chargeSession(s, 'Late cancellation', db.settings.payTutorLate ? 100 : 0);
  else if (late && db.settings.payTutorLate) addTutorLedger(e.tutorId, 'earning', e.tutorRate, `Late cancellation: ${st.name}`, { sessionId: s.id });
  const txt = `Cancelled by ${byWho}: ${st.name} · ${sessionLine(s)}${reason ? '\nReason: ' + reason : ''}${late && db.settings.chargeLate ? `\nThis was inside ${db.settings.lateHours} hours, so the session is charged.` : ''}`;
  notify('session_change', 'parent', st.parentId, `Session cancelled: ${st.name}`, txt);
  notify('session_change', 'tutor', e.tutorId, `Session cancelled: ${st.name}`, txt);
}
function reschedule(id, newStart) {
  const s = by('sessions', id), e = sEnr(s), st = stu(e.studentId), start = new Date(newStart).getTime();
  if (isNaN(start) || start < Date.now()) return 'Choose a time in the future.';
  const c = clash(e.tutorId, e.studentId, start, start + s.duration * 60000, s.id);
  if (c) return 'Clash with another session: ' + sStu(c).name + ' · ' + fmtDT(c.start);
  const old = fmtDT(s.start); s.start = new Date(start).toISOString(); s.rem24 = false;
  const txt = `${st.name}'s session moved from ${old} to ${fmtDT(s.start)}.\n${sessionLine(s)}`;
  notify('session_change', 'parent', st.parentId, `Session rescheduled: ${st.name}`, txt);
  notify('session_change', 'tutor', e.tutorId, `Session rescheduled: ${st.name}`, txt);
}
function recordPayment(f) {
  if (!(+f.amount > 0)) return 'Enter an amount above 0.';
  addLedger(f.parentId, 'payment', +f.amount, 'Payment' + (f.ref ? ' · ' + f.ref : ''), { method: f.method, date: f.date ? new Date(f.date).toISOString() : new Date().toISOString() });
  notify('payment_receipt', 'parent', f.parentId, `Payment received: ${money(+f.amount)}`, `Thank you. We received ${money(+f.amount)} by ${f.method}${f.ref ? ' (' + f.ref + ')' : ''}.\nYour balance is now ${money(balance(f.parentId))}.`);
}
function buyPackage(f, date) {
  const e = enr(f.enrollmentId); if (!e) return 'Choose an enrollment.';
  if (!(+f.total > 0) || !(+f.price >= 0)) return 'Enter the number of sessions and the price.';
  db.packages.push({ id: uid(), enrollmentId: e.id, total: +f.total, used: 0, price: +f.price, date: date || new Date().toISOString() });
  addLedger(stu(e.studentId).parentId, 'charge', +f.price, `Package of ${f.total} sessions: ${stu(e.studentId).name} · ${e.subject}`, date ? { date } : {});
}
function submitAttempt(aid) {
  const a = by('assignments', aid), t = by('tests', a.testId), pr = db.progress[aid] || { answers: {} };
  let correct = 0; const bySkill = {};
  t.questions.forEach((q, i) => { const ok = pr.answers[i] === q.answer; if (ok) correct++; const k = bySkill[q.skill] = bySkill[q.skill] || { c: 0, n: 0 }; k.n++; if (ok) k.c++; });
  const scaled = 200 + Math.round(600 * correct / t.questions.length / 10) * 10;
  const at = { id: uid(), assignmentId: aid, testId: t.id, studentId: a.studentId, date: new Date().toISOString(), answers: pr.answers, correct, total: t.questions.length, scaled, bySkill };
  db.attempts.push(at); a.status = 'done'; a.attemptId = at.id; delete db.progress[aid];
  db.scores.push({ id: uid(), studentId: a.studentId, date: at.date, type: 'practice', name: t.name, math: t.section === 'Math' ? scaled : null, rw: t.section === 'Reading & Writing' ? scaled : null, total: null });
  const st = stu(a.studentId), txt = `${st.name} finished "${t.name}": ${correct}/${t.questions.length} correct, estimated ${t.section} score ${scaled}.`;
  new Set(db.enrollments.filter(e => e.active && e.studentId === st.id).map(e => e.tutorId)).forEach(tid => notify('practice_result', 'tutor', tid, `Practice result: ${st.name}`, txt));
  notify('practice_result', 'admin', '', `Practice result: ${st.name}`, txt);
  return at;
}
function runDue() {
  const now = Date.now(); let n = 0;
  db.sessions.forEach(s => {
    if (s.status !== 'booked') return;
    const start = new Date(s.start).getTime(), e = sEnr(s), st = stu(e.studentId);
    if (!s.rem24 && start > now && start - now <= D) {
      s.rem24 = true; n++;
      notify('reminder_24h', 'parent', st.parentId, `Reminder: ${st.name}'s session ${fmtDT(s.start)}`, `Reminder for ${st.name}.\n${sessionLine(s)}`);
      notify('reminder_24h', 'tutor', e.tutorId, `Reminder: ${st.name} ${fmtDT(s.start)}`, sessionLine(s));
    }
    if (!s.logRem && now - sEnd(s) > 12 * H) { s.logRem = true; n++; notify('log_reminder', 'tutor', e.tutorId, `Please log your session with ${st.name}`, `The session on ${fmtDT(s.start)} is not logged yet.`); }
  });
  n += libRunDue();
  if (n) save();
}
function mastery(studentId) {
  const m = {};
  db.attempts.filter(a => a.studentId === studentId).forEach(a => Object.entries(a.bySkill).forEach(([k, v]) => { m[k] = m[k] || { c: 0, n: 0 }; m[k].c += v.c; m[k].n += v.n; }));
  const lp = db.libProgress[studentId] || {};
  db.libTopics.forEach(t => t.items.forEach(it => { const r = lp[it.id]; if (it.type !== 'practice' || !r) return; Object.entries(r.answers).forEach(([qi, c]) => { const q = it.questions[qi]; if (!q) return; const k = q.skill || t.domain; m[k] = m[k] || { c: 0, n: 0 }; m[k].n++; if (c === q.answer) m[k].c++; }); }));
  return m;
}

/* ---------- demo data ---------- */
function seed() {
  db = blank(); mute = true;
  const at = (d, h) => { const x = new Date(); x.setHours(h, 0, 0, 0); return new Date(x.getTime() + d * D).toISOString(); };
  const ft = hrs => { const o = {}; hrs.forEach(([d, a, b]) => { for (let h = a; h < b; h++) o[d + '-' + h] = true; }); return o; };
  db.settings.adminEmail = 'admin@example.com';
  db.tutors = [{ id: 't1', name: 'Mohamad Amro', email: 'mohamad@example.com', phone: '', rate: 31.5, subjects: 'SAT Math', university: 'AUB', satTotal: 1540 }, { id: 't2', name: 'Rana Sleiman', email: 'rana@example.com', phone: '', rate: 28, university: 'LAU', satTotal: 1510, subjects: 'SAT Reading & Writing' }, { id: 't3', name: 'Hadi Karam', email: 'hadi@example.com', phone: '', rate: 31.5, subjects: 'SAT Math', university: 'USJ', satTotal: 1490 }];
  db.parents = [{ id: 'p1', name: 'Rima Haddad', email: 'rima@example.com', phone: '' }, { id: 'p2', name: 'Fadi Nassar', email: 'fadi@example.com', phone: '' }, { id: 'p3', name: 'Hiba Saleh', email: 'hiba@example.com', phone: '' }, { id: 'p4', name: 'Joelle Khoury', email: 'joelle@example.com', phone: '' }];
  const S = (id, name, parentId, grade, target, months, free) => ({ id, name, parentId, grade, school: '', target, testDate: new Date(Date.now() + months * 30 * D).toISOString().slice(0, 10), mode: 'Online', status: 'active', freeTime: ft(free) });
  db.students = [S('s1', 'Lara Haddad', 'p1', '11', 1450, 1, [[0, 16, 20], [1, 15, 18], [2, 16, 19], [3, 14, 17], [5, 14, 19], [6, 17, 19]]), S('s2', 'Karim Nassar', 'p2', '12', 1400, 1, [[0, 17, 20], [2, 17, 20], [3, 17, 20], [5, 10, 14]]), S('s3', 'Omar Saleh', 'p3', '12', 1350, 1, [[1, 16, 20], [3, 16, 20], [5, 15, 18]]), S('s4', 'Maya Khoury', 'p4', '11', 1500, 4, [[0, 15, 18], [2, 15, 18], [4, 15, 18], [6, 10, 13]])];
  const E = (id, studentId, tutorId, subject, price, tutorRate) => ({ id, studentId, tutorId, subject, price, tutorRate, active: true });
  db.enrollments = [E('e1', 's1', 't1', 'SAT Math', 45, 31.5), E('e2', 's1', 't2', 'SAT Reading & Writing', 40, 28), E('e3', 's2', 't2', 'SAT Reading & Writing', 40, 28), E('e4', 's3', 't1', 'SAT Math', 45, 31.5), E('e5', 's4', 't3', 'SAT Math', 45, 31.5)];
  buyPackage({ enrollmentId: 'e1', total: 6, price: 240 }, at(-30, 12));
  db.ledger.push({ id: uid(), parentId: 'p1', type: 'payment', amount: 240, desc: 'Payment · WH-88213', method: 'Whish', date: at(-30, 13) });
  const past = (eid, d, h, dur, f) => { const s = bookSession({ enrollmentId: eid, start: at(d, h), duration: dur, mode: 'Online' }, true); if (f) logSession(s.id, f); return s; };
  const L = (summary, homework, skills, note) => ({ attendance: 'present', summary, homework, prevHw: 'Done', skills, parentNote: note || '' });
  past('e1', -14, 16, 90, L('Linear equations and systems. Strong on substitution.', '15 systems problems', ['Algebra']));
  past('e1', -10, 16, 90, L('Quadratics: factoring and the vertex form.', 'Quadratics set A', ['Advanced Math']));
  past('e1', -7, 16, 90, L('Ratios, percentages and data tables.', '10 percentage problems', ['Problem-Solving & Data Analysis']));
  past('e1', -3, 16, 90, L('Circle equations and arc length. Still slow on radians.', '12 circle problems', ['Geometry & Trigonometry'], 'Lara is ready for a full practice test.'));
  past('e2', -12, 17, 60, L('Transitions and rhetorical synthesis.', 'Transitions worksheet', ['Expression of Ideas']));
  past('e2', -5, 17, 60, L('Semicolons vs. colons: 5/10 to 8/10 in session.', 'Boundaries worksheet', ['Standard English Conventions']));
  past('e3', -9, 18, 60, L('Words in context with the predict-then-match method.', '15 words-in-context questions', ['Craft & Structure']));
  past('e3', -2, 18, 60, L('Command of evidence with charts.', '10 data-evidence questions', ['Information & Ideas']));
  past('e4', -8, 17, 60, L('Linear functions and slope.', 'Slope problems', ['Algebra']));
  past('e4', -6, 17, 60, { attendance: 'noshow' });
  past('e4', -1, 17, 60, null);
  past('e5', -4, 15, 60, L('Diagnostic review and study plan.', 'Algebra warm-up set', ['Algebra']));
  [['e1', 1, 16, 90], ['e3', 1, 18, 60], ['e2', 2, 17, 60], ['e4', 2, 18, 60], ['e5', 3, 15, 60]].forEach(x => bookSession({ enrollmentId: x[0], start: at(x[1], x[2]), duration: x[3], mode: 'Online' }, true));
  db.ledger.push({ id: uid(), parentId: 'p2', type: 'payment', amount: 40, desc: 'Payment · cash', method: 'Cash', date: at(-8, 12) });
  const SC = (studentId, d, type, math, rw, name) => ({ id: uid(), studentId, date: at(d, 10), type, name, math, rw, total: math + rw });
  db.scores = [SC('s1', -60, 'diagnostic', 600, 580, 'Diagnostic'), SC('s1', -30, 'practice', 640, 610, 'Full test 2'), SC('s1', -5, 'practice', 690, 640, 'Full test 4'), SC('s2', -40, 'diagnostic', 620, 640, 'Diagnostic'), SC('s3', -35, 'diagnostic', 560, 590, 'Diagnostic'), SC('s4', -20, 'diagnostic', 700, 680, 'Diagnostic')];
  const Q = (q, choices, answer, skill) => ({ q, choices, answer, skill });
  db.tests = [{ id: 'x1', name: 'Math Quick Check', section: 'Math', minutes: 15, questions: [
    Q('If 3x + 7 = 22, what is the value of 6x − 4?', ['20', '26', '30', '34'], 1, 'Algebra'),
    Q('A line passes through the points (0, 3) and (2, 7). What is its slope?', ['1', '2', '3', '4'], 1, 'Algebra'),
    Q('If x + y = 10 and x − y = 4, what is the value of x?', ['3', '6', '7', '8'], 2, 'Algebra'),
    Q('What is the sum of the solutions of x² − 5x + 6 = 0?', ['2', '3', '5', '6'], 2, 'Advanced Math'),
    Q('If f(x) = 2x² − 3, what is f(−2)?', ['−11', '1', '5', '11'], 2, 'Advanced Math'),
    Q('What is 20% of 150?', ['15', '20', '30', '45'], 2, 'Problem-Solving & Data Analysis'),
    Q('What is the mean of 4, 8, 10 and 14?', ['8', '9', '10', '12'], 1, 'Problem-Solving & Data Analysis'),
    Q('A car travels 150 kilometers in 2.5 hours. What is its average speed in kilometers per hour?', ['50', '55', '60', '75'], 2, 'Problem-Solving & Data Analysis'),
    Q('A right triangle has legs of length 6 and 8. What is the length of its hypotenuse?', ['9', '10', '12', '14'], 1, 'Geometry & Trigonometry'),
    Q('A circle has a radius of 6. What is the length of an arc with a central angle of π/3 radians?', ['π', '2π', '3π', '6π'], 1, 'Geometry & Trigonometry')] },
  { id: 'x2', name: 'Reading & Writing Quick Check', section: 'Reading & Writing', minutes: 10, questions: [
    Q('Which choice completes the sentence correctly? "The committee ___ its decision tomorrow."', ['will announce', 'announce', 'announcing', 'have announced'], 0, 'Standard English Conventions'),
    Q('Which transition fits best? "Maya studied all night; ___, she felt confident before the exam."', ['however', 'therefore', 'otherwise', 'meanwhile'], 1, 'Expression of Ideas'),
    Q('Which sentence is punctuated correctly?', ['The lab needs three things: beakers, burners, and gloves.', 'The lab needs: three things beakers, burners, and gloves.', 'The lab needs three things; beakers, burners, and gloves.', 'The lab needs three things, beakers: burners and gloves.'], 0, 'Standard English Conventions'),
    Q('Which choice completes the sentence correctly? "Each of the students ___ a notebook."', ['have', 'has', 'are having', 'were having'], 1, 'Standard English Conventions'),
    Q('"The scientist\'s explanation was lucid, so the audience understood it easily." As used here, "lucid" most nearly means', ['clear', 'long', 'doubtful', 'technical'], 0, 'Craft & Structure'),
    Q('Which choice completes the sentence correctly? "The company updated ___ policy last week."', ["it's", 'its', "its'", 'their'], 1, 'Standard English Conventions')] }];
  db.assignments = [{ id: uid(), testId: 'x1', studentId: 's1', due: at(5, 20).slice(0, 10), status: 'assigned' }, { id: uid(), testId: 'x1', studentId: 's3', due: at(4, 20).slice(0, 10), status: 'assigned' }, { id: uid(), testId: 'x2', studentId: 's2', due: at(3, 20).slice(0, 10), status: 'assigned' }, { id: uid(), testId: 'x2', studentId: 's1', due: at(6, 20).slice(0, 10), status: 'assigned' }];
  db.tutorLedger.filter(l => l.type === 'earning' && new Date(l.date) < Date.now() - 6 * D).forEach(l => payEarning(l.id, ['Whish', 'OMT', 'Cash'][l.tutorId.slice(1) % 3]));
  const AP = (name, university, major, year, satMath, satRW, subjects, hours, mode, status, days, extra) => Object.assign({ id: uid(), name, email: name.split(' ')[0].toLowerCase() + '@example.com', phone: '', university, major, year, satTotal: satMath + satRW, satMath, satRW, satDate: '2025-10', proof: '', subjects, hours, mode, why: 'I improved my own score with a clear plan and want to help students do the same.', status, date: at(-days, 11), notes: '', history: [{ status: 'applied', at: at(-days, 11) }] }, extra || {});
  db.applications = [
    AP('Nour Fakhoury', 'AUB', 'Computer Engineering', '3rd year', 790, 730, ['SAT Math'], 8, 'Online', 'applied', 1),
    AP('Ali Hamdan', 'LAU', 'Economics', '2nd year', 760, 740, ['SAT Math', 'SAT Reading & Writing'], 10, 'Both', 'applied', 2),
    AP('Lea Rizk', 'USJ', 'English Literature', '4th year', 700, 780, ['SAT Reading & Writing'], 6, 'Online', 'screening', 4, { notes: 'Score report checked. Strong writing sample.' }),
    AP('Karim Mansour', 'AUB', 'Mathematics', 'Graduate student', 800, 720, ['SAT Math'], 12, 'In person', 'demo', 7, { demoAt: at(1, 17), notes: 'Screening call went well.' }),
    AP('Sara Khalil', 'NDU', 'Biology', '3rd year', 770, 760, ['SAT Math', 'SAT Reading & Writing'], 8, 'Online', 'offer', 10, { demoRating: 5, notes: 'Excellent demo lesson: clear, patient, used Desmos well.' }),
    AP('Rana Sleiman', 'LAU', 'English Literature', '4th year', 730, 780, ['SAT Reading & Writing'], 10, 'Both', 'hired', 120, { tutorId: 't2', demoRating: 5 }),
    AP('Hadi Karam', 'USJ', 'Civil Engineering', '3rd year', 770, 720, ['SAT Math'], 8, 'Online', 'hired', 90, { tutorId: 't3', demoRating: 4 }),
    AP('Jad Haddad', 'LIU', 'Business', '1st year', 740, 720, ['SAT Math'], 5, 'Online', 'rejected', 12, { rejectReason: 'Demo lesson: explanations not clear enough yet', demoRating: 2 })];
  seedLibrary();
  const sub = (sid, startDays, pid, method) => { const start = at(startDays, 10), end = new Date(new Date(start).getTime() + 365 * D).toISOString(); db.subscriptions.push({ id: uid(), studentId: sid, plan: db.settings.libPlan, price: db.settings.libPrice, start, end, status: 'active' }); addLedger(pid, 'charge', db.settings.libPrice, `${db.settings.libPlan}: ${stu(sid).name}`, { date: start }); addLedger(pid, 'payment', db.settings.libPrice, 'Payment · library subscription', { method, date: start }); };
  sub('s1', -60, 'p1', 'Whish'); sub('s2', -360, 'p2', 'Cash');
  const lp = libP('s1'); sortedTopics().slice(0, 6).forEach((t, i) => t.items.forEach(it => { if (it.type === 'guide') lp[it.id] = { done: true }; if (it.type === 'practice' && i < 4) { const ans = {}; it.questions.forEach((q, qi) => ans[qi] = (i === 2 && qi === 0) ? (q.answer + 1) % 4 : q.answer); lp[it.id] = { done: true, answers: ans, correct: it.questions.filter((q, qi) => ans[qi] === q.answer).length }; } }));
  lp._last = sortedTopics()[4].id;
  db.students.find(x => x.id === 's4').libRequested = new Date().toISOString();
  mute = false; save();
}

/* ---------- UI helpers ---------- */
function toast(t) { const el = $('#toast'); el.textContent = t; el.style.opacity = 1; clearTimeout(toast.t); toast.t = setTimeout(() => el.style.opacity = 0, 2400); }
const chip = (t, c) => `<span class="chip ${c || ''}">${esc(t)}</span>`;
const statusChip = s => s.status === 'completed' ? chip('Completed', 'green') : s.status === 'cancelled' ? chip(s.cancel && s.cancel.late ? 'Cancelled late' : 'Cancelled', 'red') : s.status === 'noshow' ? chip('No-show', 'amber') : sEnd(s) < Date.now() ? chip('Needs log', 'amber') : chip('Confirmed', 'blue');
const table = (heads, rows, empty) => rows.length ? `<div class="tablewrap"><table class="tbl"><thead><tr>${heads.map(h => `<th${h.startsWith('#') ? ' class="num"' : ''}>${esc(h.replace('#', ''))}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<div class="muted">${esc(empty || 'Nothing here yet.')}</div>`;
const card = (title, body, right) => `<div class="card">${title ? `<div class="cardhead"><h2>${esc(title)}</h2>${right || ''}</div>` : ''}${body}</div>`;
const stat = (label, big, sub) => `<div class="card"><div class="label">${esc(label)}</div><div class="big">${esc(big)}</div><div class="small muted">${esc(sub || '')}</div></div>`;
const btn = (label, act, data, cls) => `<button type="button" class="btn sm ${cls || ''}" data-act="${act}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${esc(label)}</button>`;
const field = (label, name, type, value, extra) => `<div class="field"><label for="f_${name}">${esc(label)}</label>${type === 'textarea' ? `<textarea id="f_${name}" name="${name}" ${extra || ''}>${esc(value)}</textarea>` : `<input id="f_${name}" name="${name}" type="${type || 'text'}" value="${esc(value)}" ${extra || ''}>`}</div>`;
const select = (label, name, opts, value) => `<div class="field"><label for="f_${name}">${esc(label)}</label><select id="f_${name}" name="${name}">${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(value) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>`;
const bar = (label, pct, val) => `<div><div style="display:flex;justify-content:space-between" class="small"><span>${esc(label)}</span><span>${esc(val)}</span></div><div class="bar ${pct < 60 ? 'amber' : pct >= 80 ? 'green' : ''}"><span style="width:${pct}%"></span></div></div>`;
function modal(title, body, onSubmit, okLabel) {
  const d = $('#dlg');
  d.innerHTML = `<form><h2>${esc(title)}</h2><div id="dlgerr"></div>${body}<div style="display:flex;gap:10px;justify-content:flex-end"><button type="button" class="btn" data-close>Close</button>${onSubmit ? `<button class="btn primary">${esc(okLabel || 'Save')}</button>` : ''}</div></form>`;
  $('form', d).onsubmit = ev => {
    ev.preventDefault(); if (!onSubmit) return d.close();
    const fd = new FormData(ev.target), o = {}; fd.forEach((v, k) => { if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v; });
    const err = onSubmit(o);
    if (typeof err === 'string') { $('#dlgerr').innerHTML = `<div class="err">${esc(err)}</div>`; return; }
    save(); d.close(); render();
  };
  $('[data-close]', d).onclick = () => d.close();
  d.showModal(); d.scrollTop = 0;
}
const page = (h1, sub, actions, body) => `<div class="topbar"><div class="title"><h1>${esc(h1)}</h1><p>${esc(sub || '')}</p></div><div class="actions">${actions || ''}</div></div>${body}`;

/* ---------- views ---------- */
const NAV = {
  admin: [['dashboard', 'Dashboard'], ['students', 'Students & families'], ['tutors', 'Tutors'], ['hiring', 'Tutor hiring'], ['sessions', 'Sessions'], ['book', 'Book a session'], ['finance', 'Finance'], ['practice', 'Practice tests'], ['library', 'SAT Library'], ['subs', 'Library subscriptions'], ['messages', 'Automations & messages'], ['settings', 'Settings']],
  tutor: [['students', 'My students'], ['sessions', 'Sessions'], ['book', 'Book a session'], ['practice', 'Practice results'], ['library', 'SAT Library'], ['earnings', 'My earnings'], ['messages', 'Messages']],
  parent: [['home', 'Home'], ['freetime', 'Free time'], ['sessions', 'Schedule'], ['billing', 'Billing'], ['messages', 'Messages']],
  student: [['home', 'Home'], ['library', 'SAT Library'], ['mytests', 'Practice tests'], ['scores', 'My scores'], ['sessions', 'My sessions']]
};
const meName = () => me.role === 'admin' ? db.settings.adminName : person(me.role, me.id).name;
function shell(route, content) {
  const toLog = me.role === 'tutor' || me.role === 'admin' ? mySessions().filter(s => s.status === 'booked' && sEnd(s) < Date.now()).length : 0;
  const inbox = me.role !== 'admin' ? 0 : 0;
  return `<div class="app"><aside class="side">
<div class="brandmark"><img class="logo" src="assets/logo-icon.png" alt="Amro Academy logo"><div><div class="brandname">${esc(db.settings.academy)}</div><div class="brandsub">${me.role[0].toUpperCase() + me.role.slice(1)} portal</div></div></div>
${NAV[me.role].map(n => `<a class="nav ${n[0] === route ? 'active' : ''}" href="#/${n[0]}">${esc(n[1])}${n[0] === 'sessions' && toLog && n[0] !== route ? ` <span class="chip amber" style="margin-left:auto">${toLog}</span>` : ''}</a>`).join('')}
<div class="sidefoot"><div class="avatar">${esc(initials(meName()))}</div><div><div style="font-weight:700">${esc(meName())}</div><button type="button" data-act="logout" style="background:none;border:0;padding:0;color:#E0F2FE;font:inherit;font-size:12px;text-decoration:underline;cursor:pointer">Switch user</button></div></div>
</aside><main class="main">${content}</main></div>`;
}
function loginView() {
  const group = (title, kind, list, cls) => `<div class="label" style="margin-top:6px">${title}</div>${list.map(p => `<button type="button" class="rolelink" style="background:#fff;font:inherit;cursor:pointer;width:100%" data-act="login" data-role="${kind}" data-id="${esc(p.id || '')}"><span>${esc(p.name)}</span><span class="chip ${cls}">${kind}</span></button>`).join('') || '<div class="small muted">None yet. Sign in as admin to add.</div>'}`;
  return `<div class="auth"><section class="authart"><div style="display:flex;gap:16px;align-items:center"><div style="background:#fff;border-radius:16px;padding:10px 14px"><img src="assets/logo-full.png" alt="Amro Academy logo" style="height:110px;display:block"></div><div class="brandsub" style="font-size:14px">Digital SAT tutoring<br>Online &amp; in person</div></div>
<div style="max-width:520px;display:flex;flex-direction:column;gap:16px"><h1 style="margin:0;font-size:42px;line-height:1.1;font-weight:800">Every session tracked. Every point measured.</h1><p style="margin:0;font-size:16px;color:#E0F2FE">Working MVP: bookings, session logs, payments, tutor pay, messages and practice tests. Your data is saved in this browser.</p></div><p class="small" style="margin:0;color:#E0F2FE">amroacademy.org</p></section>
<section class="authform"><div style="width:100%;max-width:440px;display:flex;flex-direction:column;gap:10px"><h2 style="margin:0;font-size:26px;font-weight:800">Choose who you are</h2><p class="muted" style="margin:0 0 6px">No passwords in this version. Pick a user to open their portal.</p>
<a class="rolelink" href="#/apply" style="background:#F0F9FF;border-color:#7DD3FC"><span>University student with a high SAT score? Apply to teach</span><span class="chip blue">Tutors</span></a>${group('ADMIN', 'admin', [{ name: db.settings.adminName }], 'blue')}${group('TUTORS', 'tutor', db.tutors, 'violet')}${group('PARENTS', 'parent', db.parents, 'green')}${group('STUDENTS', 'student', db.students, 'amber')}</div></section></div>`;
}

function sessionRow(s) {
  const e = sEnr(s), st = stu(e.studentId), t = tut(e.tutorId), open = s.status === 'booked', past = sEnd(s) < Date.now();
  let a = '';
  if (open && past && (me.role === 'tutor' || me.role === 'admin')) a += btn('Log session', 'log', { id: s.id }, 'primary');
  if (open && !past && me.role !== 'student') a += btn('Reschedule', 'resched', { id: s.id }) + btn('Cancel', 'cancel', { id: s.id }, 'danger');
  if (open && past && me.role !== 'student' && me.role !== 'parent') a += btn('Cancel', 'cancel', { id: s.id }, 'danger');
  if (s.log) a += btn('Summary', 'summary', { id: s.id });
  return `<tr><td><b>${esc(fmtD(s.start))}</b><div class="small muted">${fmtT(s.start)} · ${s.duration} min</div></td><td>${esc(st.name)}</td><td>${esc(e.subject)}</td><td>${esc(t.name)}</td><td>${esc(s.mode)}</td><td>${statusChip(s)}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap">${a}</div></td></tr>`;
}
const sessionTable = (list, empty) => table(['Date', 'Student', 'Subject', 'Tutor', 'Mode', 'Status', ''], list.map(sessionRow), empty);
function sessionsView() {
  const all = mySessions(), now = Date.now();
  const up = all.filter(s => s.status === 'booked' && sEnd(s) >= now).sort((a, b) => a.start.localeCompare(b.start));
  const tolog = all.filter(s => s.status === 'booked' && sEnd(s) < now).sort((a, b) => a.start.localeCompare(b.start));
  const viewer = me.role === 'parent' || me.role === 'student';
  const past = all.filter(s => s.status !== 'booked' || (viewer && sEnd(s) < now)).sort((a, b) => b.start.localeCompare(a.start));
  return page(me.role === 'parent' ? 'Schedule' : 'Sessions', `${up.length} upcoming · ${tolog.length} waiting for a log · ${past.length} past`,
    me.role === 'admin' || me.role === 'tutor' ? '<a class="btn primary" href="#/book">Book a session</a>' : me.role === 'parent' ? '<a class="btn" href="#/freetime">Update free time</a>' : '',
    (tolog.length && me.role !== 'student' && me.role !== 'parent' ? card('Waiting for a log', sessionTable(tolog)) : '') + card('Upcoming', sessionTable(up, 'No upcoming sessions.')) + card('Past', sessionTable(past, 'No past sessions yet.')));
}
function freeSlots(e, duration) {
  const st = stu(e.studentId), out = [], now = Date.now(), need = Math.ceil(duration / 60);
  for (let i = 0; i < 14; i++) {
    const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + i); const d = dayIdx(day);
    HOURS.forEach(h => {
      for (let k = 0; k < need; k++) if (!st.freeTime[d + '-' + (h + k)]) return;
      const start = new Date(day); start.setHours(h); const ms = start.getTime();
      if (ms > now && !clash(e.tutorId, e.studentId, ms, ms + duration * 60000)) out.push(start.toISOString());
    });
  }
  return out;
}
let bookState = { eid: '', duration: 60, mode: 'Online' };
function bookView() {
  const es = myEnrollments(); if (!es.find(e => e.id === bookState.eid)) bookState.eid = es[0] ? es[0].id : '';
  const e = enr(bookState.eid);
  const form = `<div class="grid g3" style="gap:12px">${select('Student and subject', 'eid', es.map(x => [x.id, `${stu(x.studentId).name} · ${x.subject} · ${tut(x.tutorId).name}`]), bookState.eid)}${select('Length', 'duration', [[60, '60 minutes'], [90, '90 minutes'], [120, '120 minutes']], bookState.duration)}${select('Mode', 'mode', [['Online', 'Online'], ['In person', 'In person']], bookState.mode)}</div>`;
  let slots = '<div class="muted">Add an enrollment first (Students &amp; families, then open a student).</div>';
  if (e) {
    const fs = freeSlots(e, +bookState.duration), groups = {};
    fs.forEach(iso => (groups[fmtD(iso)] = groups[fmtD(iso)] || []).push(iso));
    slots = fs.length ? Object.entries(groups).map(([d, l]) => `<div class="li"><div style="width:110px;font-weight:700">${esc(d)}</div><div style="display:flex;gap:8px;flex-wrap:wrap">${l.map(iso => `<button type="button" class="slotbtn" data-act="bookslot" data-start="${iso}">${fmtT(iso)}</button>`).join('')}</div></div>`).join('')
      : `<div class="warn">No open slots in the next 14 days. ${esc(stu(e.studentId).name)}'s parent has not marked free time that fits, or it is already booked.</div>`;
  }
  return page('Book a session', 'Open slots come from the parent\'s free time, minus anything already booked', '',
    card('1. Choose', `<form id="bookform">${form}</form>`) + card('2. Pick an open slot (next 14 days)', `<div class="list">${slots}</div>`) +
    (me.role === 'admin' && e ? card('Or book any time (admin only)', `<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="flex:1 1 220px"><label for="anytime">Date and time</label><input id="anytime" type="datetime-local"></div>${btn('Book this time', 'bookany', {}, 'primary')}</div>`) : ''));
}
function gridView(st, editable) {
  return `<div class="tablewrap"><div class="week" style="grid-template-columns:56px repeat(7,minmax(70px,1fr))"><div></div>${DAYS.map(d => `<div class="calhead" style="border:0">${d}</div>`).join('')}${HOURS.map(h => `<div class="small muted" style="align-self:center">${pad(h)}:00</div>` + DAYS.map((d, i) => `<button type="button" class="slot ${st.freeTime[i + '-' + h] ? 'on' : ''}" ${editable ? `data-act="ft" data-sid="${st.id}" data-k="${i}-${h}"` : 'disabled'} aria-label="${d} ${h}:00 ${st.freeTime[i + '-' + h] ? 'free' : 'busy'}"></button>`).join('')).join('')}</div></div>`;
}
function scoreChart(list) {
  const full = list.filter(s => s.total).sort((a, b) => a.date.localeCompare(b.date)); if (full.length < 2) return '';
  const X = i => 50 + i * (560 / (full.length - 1)), Y = v => 200 - (v - 400) / 1200 * 180;
  return `<svg viewBox="0 0 640 220" style="width:100%;height:auto" role="img" aria-label="Score timeline">${[400, 800, 1200, 1600].map(v => `<line x1="40" x2="630" y1="${Y(v)}" y2="${Y(v)}" stroke="#E2E8F0"/><text x="2" y="${Y(v) + 4}" font-size="11" fill="#475569">${v}</text>`).join('')}<polyline fill="none" stroke="#0369A1" stroke-width="3" points="${full.map((s, i) => X(i) + ',' + Y(s.total)).join(' ')}"/>${full.map((s, i) => `<circle cx="${X(i)}" cy="${Y(s.total)}" r="5" fill="#3CACDC"/><text x="${X(i) - 14}" y="${Y(s.total) - 10}" font-size="12" font-weight="700" fill="#0F172A">${s.total}</text>`).join('')}</svg>`;
}
const scoreRows = list => list.slice().sort((a, b) => b.date.localeCompare(a.date)).map(s => `<tr><td>${esc(fmtD(s.date))}</td><td>${esc(s.name || s.type)}</td><td>${chip(s.type, s.type === 'official' ? 'green' : s.type === 'diagnostic' ? '' : 'blue')}</td><td class="num">${s.math ?? '—'}</td><td class="num">${s.rw ?? '—'}</td><td class="num"><b>${s.total ?? '—'}</b></td></tr>`);
function masteryCard(sid) {
  const m = mastery(sid), ks = SKILLS.filter(k => m[k]);
  return card('Skill mastery', ks.length ? ks.map(k => bar(k, Math.round(100 * m[k].c / m[k].n), `${m[k].c}/${m[k].n}`)).join('') : '<div class="muted">Appears after the first practice test.</div>', '<span class="small muted">From practice answers</span>');
}
function latestTotal(sid) { const l = db.scores.filter(s => s.studentId === sid && s.total).sort((a, b) => b.date.localeCompare(a.date)); return l[0] ? l[0].total : null; }
function studentsView() {
  const list = myStudents(), admin = me.role === 'admin';
  const rows = list.map(s => { const p = par(s.parentId), lt = latestTotal(s.id), es = db.enrollments.filter(e => e.active && e.studentId === s.id && (admin || e.tutorId === me.id));
    return `<tr><td><a href="#/student/${s.id}" style="font-weight:700">${esc(s.name)}</a><div class="small muted">Grade ${esc(s.grade)}</div></td>${admin ? `<td>${esc(p ? p.name : '')}</td>` : ''}<td>${es.map(e => esc(e.subject) + (admin ? ' · ' + esc(tut(e.tutorId).name) : '')).join('<br>') || '<span class="muted">No enrollment</span>'}</td><td>${s.target || '—'}</td><td>${lt || '—'}</td><td>${esc(s.testDate || '—')}</td>${admin ? `<td class="num">${money(balance(s.parentId))}</td>` : ''}</tr>`; });
  return page(admin ? 'Students & families' : 'My students', `${list.length} student${list.length === 1 ? '' : 's'}`, admin ? btn('Add student', 'addStudent', {}, 'primary') : '',
    card('', table(['Student'].concat(admin ? ['Parent'] : [], ['Subjects', 'Target', 'Latest', 'SAT date'], admin ? ['#Family balance'] : []), rows, 'No students yet. Add your first student.')));
}
function studentView(id) {
  const s = stu(id); if (!s || !myStudents().includes(s)) return page('Not found', '', '', '');
  const admin = me.role === 'admin', p = par(s.parentId), es = db.enrollments.filter(e => e.studentId === s.id && e.active && (admin || me.role !== 'tutor' || e.tutorId === me.id));
  const sc = db.scores.filter(x => x.studentId === s.id), lt = latestTotal(s.id);
  const sess = db.sessions.filter(x => es.some(e => e.id === x.enrollmentId)).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  return page(s.name, `Grade ${s.grade}${s.school ? ' · ' + s.school : ''} · ${s.mode} · SAT ${s.testDate || 'date not set'}`,
    (admin ? btn('Edit', 'editStudent', { id: s.id }) + btn('Delete', 'delStudent', { id: s.id }, 'danger') : '') + (me.role !== 'parent' ? btn('Add score', 'addScore', { id: s.id }) + btn('Assign test', 'assign', { sid: s.id }) : ''),
    `<div class="grid g4">${stat('Target', s.target || '—', 'Goal score')}${stat('Latest total', lt || '—', lt && s.target ? (s.target - lt > 0 ? (s.target - lt) + ' points to go' : 'Target reached') : '')}${stat('Sessions done', db.sessions.filter(x => es.some(e => e.id === x.enrollmentId) && x.status === 'completed').length, '')}${admin ? stat('Family balance', money(balance(s.parentId)), p ? p.name : '') : stat('Status', s.status, '')}</div>
<div class="grid g21">${card('Score timeline', (scoreChart(sc) || '<div class="muted">Add two full scores to see the chart.</div>') + table(['Date', 'Test', 'Type', '#Math', '#R&W', '#Total'], scoreRows(sc), 'No scores yet.'))}${masteryCard(s.id)}</div>
<div class="grid g2">${card('Enrollments', `<div class="list">${es.map(e => { const pk = activePkg(e.id); return `<div class="li"><div class="grow"><div class="t">${esc(e.subject)} · ${esc(tut(e.tutorId).name)}</div><div class="small muted">${admin ? `Parent pays ${money(e.price)} · tutor earns ${money(e.tutorRate)}` : me.role === 'tutor' ? `You earn ${money(e.tutorRate)} per session` : ''}${pk ? ` · package ${pk.total - pk.used} of ${pk.total} left` : admin ? ' · per session' : ''}</div></div>${admin ? btn('Sell package', 'sellPkg', { eid: e.id }) + btn('End', 'endEnr', { id: e.id }, 'danger') : ''}</div>`; }).join('') || '<div class="muted">No enrollments yet.</div>'}</div>`, admin ? btn('Add enrollment', 'addEnr', { sid: s.id }, 'primary') : '')}
${admin && p ? card('Parent', `<div class="list"><div class="li"><div class="grow"><div class="t">${esc(p.name)}</div><div class="small muted">${esc(p.email || 'no email')} · ${esc(p.phone || 'no phone')}</div></div>${btn('Edit', 'editParent', { id: p.id })}<a class="btn sm" href="#/family/${p.id}">Ledger</a></div></div>`) : card('Contact', '<div class="muted">Family contact details are managed by the academy. Use Messages to reach them.</div>')}</div>
${libStudentCard(s.id)}${card('Recent sessions', sessionTable(sess, 'No sessions yet.'))}${card('Free time set by the parent', gridView(s, false))}`);
}
function studentForm(s) {
  s = s || {};
  return field('Student name', 'name', 'text', s.name, 'required') + `<div class="grid g2" style="gap:12px">${field('Grade', 'grade', 'text', s.grade || '11')}${field('School', 'school', 'text', s.school)}${field('Target score', 'target', 'number', s.target || 1400, 'min="400" max="1600" step="10"')}${field('SAT date', 'testDate', 'date', s.testDate)}</div>` + select('Mode', 'mode', [['Online', 'Online'], ['In person', 'In person'], ['Both', 'Both']], s.mode) +
    (s.id ? '' : select('Parent', 'parentId', [['', 'New parent (fill below)']].concat(db.parents.map(p => [p.id, p.name])), '') + `<div class="grid g2" style="gap:12px">${field('New parent name', 'pname')}${field('Parent email', 'pemail', 'email')}</div>` + field('Parent WhatsApp number (with country code)', 'pphone', 'tel'));
}
function tutorsView() {
  const rows = db.tutors.map(t => `<tr><td><b>${esc(t.name)}</b><div class="small muted">${esc([t.university, t.satTotal ? 'SAT ' + t.satTotal : '', t.email].filter(Boolean).join(' · '))}</div></td><td>${esc(t.subjects || '')}</td><td class="num">${db.enrollments.filter(e => e.active && e.tutorId === t.id).length}</td><td class="num">${money(t.rate)}</td><td class="num"><b>${money(tutorOwed(t.id))}</b></td><td><div style="display:flex;gap:6px">${btn('Record payout', 'payout', { id: t.id }, 'primary')}${btn('Bonus', 'bonus', { id: t.id })}${btn('Edit', 'editTutor', { id: t.id })}</div></td></tr>`);
  return page('Tutors', `${db.tutors.length} tutors`, '<a class="btn" href="#/hiring">Tutor hiring</a>' + btn('Add tutor', 'addTutor', {}, 'primary'), card('', table(['Tutor', 'Subjects', '#Students', '#Share per session', '#Owed', ''], rows, 'No tutors yet.')));
}
const ledgerRows = list => list.slice().sort((a, b) => b.date.localeCompare(a.date)).map(l => `<tr><td>${esc(fmtD(l.date))}</td><td>${esc(l.desc)}${l.method ? `<div class="small muted">${esc(l.method)}</div>` : ''}</td><td>${l.type === 'payment' ? chip('Payment', 'green') : l.type === 'credit' ? chip('Credit', 'violet') : l.type === 'package' ? chip('Package use') : chip('Charge', 'blue')}</td><td class="num" style="${l.type === 'payment' || l.type === 'credit' ? 'color:#065F46' : ''}">${l.type === 'payment' || l.type === 'credit' ? '−' + money(l.amount) : l.type === 'package' ? '1 session' : money(l.amount)}</td></tr>`);
function financeView() {
  const now = new Date(), inMonth = l => { const d = new Date(l.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); };
  const charged = db.ledger.filter(l => l.type === 'charge' && inMonth(l)).reduce((a, l) => a + l.amount, 0), paid = db.ledger.filter(l => l.type === 'payment' && inMonth(l)).reduce((a, l) => a + l.amount, 0);
  const owed = db.tutors.reduce((a, t) => a + Math.max(0, tutorOwed(t.id)), 0), earn = db.tutorLedger.filter(l => l.type === 'earning' && inMonth(l)).reduce((a, l) => a + l.amount, 0);
  const fam = db.parents.map(p => `<tr><td><b>${esc(p.name)}</b><div class="small muted">${db.students.filter(s => s.parentId === p.id).map(s => esc(s.name)).join(', ')}</div></td><td class="num" style="${balance(p.id) > 0 ? 'color:#991B1B;font-weight:700' : ''}">${money(balance(p.id))}</td><td><div style="display:flex;gap:6px">${btn('Record payment', 'pay', { pid: p.id }, 'primary')}<a class="btn sm" href="#/family/${p.id}">Ledger</a></div></td></tr>`);
  const pay = db.tutors.map(t => `<tr><td>${esc(t.name)}</td><td class="num">${money(db.tutorLedger.filter(l => l.tutorId === t.id && l.type === 'earning' && inMonth(l)).reduce((a, l) => a + l.amount, 0))}</td><td class="num">${money(db.tutorLedger.filter(l => l.tutorId === t.id && l.type === 'cash').reduce((a, l) => a + l.amount, 0))}</td><td class="num"><b>${tutorOwed(t.id) < 0 ? 'Owes academy ' + money(-tutorOwed(t.id)) : money(tutorOwed(t.id))}</b></td><td>${btn('Record payout', 'payout', { id: t.id })}</td></tr>`);
  return page('Finance', 'This month · USD', btn('Record payment', 'pay', {}, 'primary'),
    `<div class="grid g4">${stat('Charged this month', money(charged), 'Sessions and packages')}${stat('Collected this month', money(paid), 'All payment methods')}${stat('Owed to tutors', money(owed), 'After cash they hold')}${stat('Academy commission this month', money(db.tutorLedger.filter(l => l.type === 'earning' && inMonth(l) && l.sessionId).reduce((x, l) => { const ss = by('sessions', l.sessionId); return x + (ss ? Math.max(0, sEnr(ss).price - l.amount) : 0); }, 0)), 'Session prices minus tutor shares')}</div>
${payoutsCard()}<div class="grid g2">${card('Family balances', table(['Family', '#Balance', ''], fam, 'No families yet.'))}${card('Tutor payroll', table(['Tutor', '#Earned this month', '#Cash held', '#Owed', ''], pay, 'No tutors yet.'))}</div>
${card('All entries', table(['Date', 'Description', 'Type', '#Amount'], ledgerRows(db.ledger).slice(0, 25), 'No entries yet.'))}`);
}
function familyView(pid) {
  const p = par(pid); if (!p || (me.role === 'parent' && me.id !== pid) || (me.role !== 'parent' && me.role !== 'admin')) return page('Not found', '', '', '');
  const b = balance(pid), pk = db.packages.filter(k => stu(enr(k.enrollmentId).studentId).parentId === pid && k.used < k.total);
  return page(me.role === 'admin' ? p.name + ' · ledger' : 'Billing', 'All amounts in USD', me.role === 'admin' ? btn('Record payment', 'pay', { pid }, 'primary') : '',
    `<div class="grid g3">${stat('Balance', money(b), b > 0 ? 'Amount due' : 'Nothing due')}${stat('Active packages', pk.length, pk.map(k => `${stu(enr(k.enrollmentId).studentId).name}: ${k.total - k.used} of ${k.total} left`).join(' · '))}${stat('Paid in total', money(db.ledger.filter(l => l.parentId === pid && l.type === 'payment').reduce((a, l) => a + l.amount, 0)), '')}</div>
${card('Charges and payments', table(['Date', 'Description', 'Type', '#Amount'], ledgerRows(db.ledger.filter(l => l.parentId === pid)), 'No entries yet.'))}
${me.role === 'parent' ? card('SAT Library subscriptions', `<div class="list">${db.students.filter(s => s.parentId === pid).map(s => `<div class="li"><div class="grow"><div class="t">${esc(s.name)}</div><div class="small muted">${esc(libStatusLine(s.id))}</div></div>${hasLib(s.id) ? '' : s.libRequested ? chip('Request sent', 'amber') : btn('Request', 'libRequest', { sid: s.id })}</div>`).join('')}</div><div class="small muted">${esc(db.settings.libPlan)} · ${money(db.settings.libPrice)} per student per year. Tutoring sessions do not need a subscription.</div>`) : ''}${me.role === 'parent' ? card('How to pay', `<div class="muted">Cash, Whish, OMT or bank transfer. Late cancellations (under ${db.settings.lateHours} hours) are charged.</div>`) : ''}`);
}
function earningsView() {
  const l = db.tutorLedger.filter(x => x.tutorId === me.id), sum = t => l.filter(x => x.type === t).reduce((a, x) => a + x.amount, 0);
  const due = l.filter(x => x.type === 'earning' && x.payStatus === 'due').reduce((a, x) => a + x.amount, 0);
  const rows = l.filter(x => x.type === 'earning').sort((a, b) => b.date.localeCompare(a.date)).map(x => { const ss = x.sessionId && by('sessions', x.sessionId), e = ss && sEnr(ss), price = e ? e.price : null, cut = price != null ? Math.max(0, price - x.amount) : null;
    return `<tr><td>${esc(fmtD(x.date))}</td><td>${esc(x.desc)}</td><td class="num">${price != null ? money(price) : '—'}</td><td class="num">${cut != null ? money(cut) : '—'}</td><td class="num"><b>${money(x.amount)}</b></td><td>${x.payStatus === 'paid' ? chip('Paid · ' + (x.payMethod || ''), 'green') : x.payStatus === 'cash' ? chip('Kept from cash', 'violet') : chip('Due', 'amber')}</td></tr>`; });
  return page('My earnings', 'You are paid after each completed session', '',
    `<div class="grid g4">${stat('Earned', money(sum('earning') + sum('bonus')), 'All sessions and bonuses')}${stat('Waiting for payout', money(due), 'Sessions logged, not yet paid')}${stat('Paid to you', money(sum('payout')), 'All time')}${stat('Cash you collected', money(sum('cash')), tutorOwed(me.id) < 0 ? 'You owe the academy ' + money(-tutorOwed(me.id)) : 'Counted against your earnings')}</div>
${card('Sessions and payouts', table(['Date', 'Session', '#Session price', '#Academy cut', '#Your share', 'Status'], rows, 'No sessions logged yet.'))}
${card('Your contract', contractHtml(meName()))}`);
}
function dashboardView() {
  const now = new Date(), t0 = new Date(now); t0.setHours(0, 0, 0, 0); const mon = new Date(t0); mon.setDate(mon.getDate() - dayIdx(now));
  const week = db.sessions.filter(s => s.status !== 'cancelled' && new Date(s.start) >= mon && new Date(s.start) < new Date(mon.getTime() + 7 * D)).length;
  const income = db.ledger.filter(l => l.type === 'payment' && new Date(l.date).getMonth() === now.getMonth() && new Date(l.date).getFullYear() === now.getFullYear()).reduce((a, l) => a + l.amount, 0);
  const owing = db.parents.filter(p => balance(p.id) > 0), out = owing.reduce((a, p) => a + balance(p.id), 0);
  const today = db.sessions.filter(s => new Date(s.start) >= t0 && new Date(s.start) < new Date(t0.getTime() + D)).sort((a, b) => a.start.localeCompare(b.start));
  const unlogged = db.sessions.filter(s => s.status === 'booked' && sEnd(s) < Date.now()), low = db.packages.filter(p => p.used < p.total && p.total - p.used <= 2);
  const nofree = db.students.filter(s => !Object.values(s.freeTime).some(Boolean)), pending = db.assignments.filter(a => a.status !== 'done' && a.due < now.toISOString().slice(0, 10));
  const al = (color, t, sub, href) => `<div class="alert"><span class="dot" style="background:${color}"></span><div class="grow" style="flex:1"><div style="font-weight:600">${esc(t)}</div><div class="small muted">${esc(sub)}</div></div><a class="btn sm" href="${href}">Open</a></div>`;
  const alerts = (unlogged.length ? al('#D97706', `${unlogged.length} session${unlogged.length > 1 ? 's' : ''} not logged`, unlogged.map(s => sStu(s).name).join(', '), '#/sessions') : '') + (owing.length ? al('#DC2626', `${owing.length} famil${owing.length > 1 ? 'ies owe' : 'y owes'} ${money(out)}`, owing.map(p => p.name).join(', '), '#/finance') : '') + (low.length ? al('#0369A1', `${low.length} package${low.length > 1 ? 's' : ''} running low`, low.map(p => stu(enr(p.enrollmentId).studentId).name).join(', '), '#/students') : '') + (nofree.length ? al('#64748B', `${nofree.length} student${nofree.length > 1 ? 's have' : ' has'} no free time set`, nofree.map(s => s.name).join(', '), '#/students') : '') + (db.applications.filter(a => a.status === 'applied').length ? al('#0369A1', `${db.applications.filter(a => a.status === 'applied').length} new tutor application${db.applications.filter(a => a.status === 'applied').length > 1 ? 's' : ''}`, db.applications.filter(a => a.status === 'applied').map(a => a.name + ' · SAT ' + a.satTotal).join(', '), '#/hiring') : '') + (dueEarnings().length ? al('#D97706', `${dueEarnings().length} tutor payout${dueEarnings().length > 1 ? 's' : ''} due (${money(dueEarnings().reduce((x, l) => x + l.amount, 0))})`, 'Tutors are paid after each session', '#/finance') : '') + (db.students.filter(s => s.libRequested && !hasLib(s.id)).length ? al('#059669', 'Library subscription requests', db.students.filter(s => s.libRequested && !hasLib(s.id)).map(s => s.name).join(', '), '#/subs') : '') + (db.students.filter(s => hasLib(s.id) && new Date(subOf(s.id).end) - Date.now() < 30 * D).length ? al('#D97706', 'Library access ending within 30 days', db.students.filter(s => hasLib(s.id) && new Date(subOf(s.id).end) - Date.now() < 30 * D).map(s => s.name).join(', '), '#/subs') : '') + (pending.length ? al('#7C3AED', `${pending.length} practice test${pending.length > 1 ? 's are' : ' is'} overdue`, pending.map(a => stu(a.studentId).name).join(', '), '#/practice') : '');
  return page('Dashboard', now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }), '<a class="btn" href="#/book">New booking</a>' + btn('Record payment', 'pay', {}, 'primary'),
    `<div class="grid g4">${stat('Sessions this week', week, '')}${stat('Collected this month', money(income), '')}${stat('Outstanding balances', money(out), owing.length + ' families')}${stat('Active students', db.students.filter(s => s.status === 'active').length, db.tutors.length + ' tutors')}</div>
<div class="grid g21">${card("Today's sessions", sessionTable(today, 'No sessions today.'), '<a class="btn sm" href="#/sessions">All sessions</a>')}${card('Needs attention', alerts || '<div class="muted">All clear.</div>')}</div>
${card('Latest messages', messageList(db.messages.slice(0, 4)), '<a class="btn sm" href="#/messages">Open</a>')}`);
}
function messageList(list) {
  return list.length ? `<div class="list">${list.map(m => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t">${esc(m.subject)}</div><div class="small muted">To ${esc(m.toName)} (${m.toKind}) · ${esc(fmtDT(m.date))} · ${esc(m.rule)}</div></div>${btn('Read', 'readMsg', { id: m.id })}</div>`).join('')}</div>` : '<div class="muted">No messages yet.</div>';
}
function messagesView() {
  if (me.role !== 'admin') { const mine = db.messages.filter(m => m.toKind === me.role && m.toId === me.id); return page('Messages', 'Confirmations, reminders and summaries sent to you', '', card('Inbox', messageList(mine))); }
  const rules = db.rules.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.trigger)}</td><td>${esc(r.to)}</td><td class="num">${db.messages.filter(m => m.rule === r.name).length}</td><td><button type="button" class="toggle ${r.on ? 'on' : ''}" data-act="rule" data-id="${r.id}" aria-label="${esc(r.name)}" aria-pressed="${r.on}"></button></td></tr>`);
  return page('Automations & messages', 'Every automatic message is a rule you can switch off', btn('Send a message', 'manual', {}, 'primary'),
    `<div class="card" style="flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between"><div><div style="font-weight:800;font-size:17px">${db.settings.master ? 'Automations are running' : 'All automations are paused'}</div><div class="muted">${db.rules.filter(r => r.on).length} of ${db.rules.length} rules on · ${db.messages.length} messages created</div></div><div style="display:flex;gap:12px;align-items:center"><b>Master switch</b><button type="button" class="toggle ${db.settings.master ? 'on' : ''}" data-act="master" aria-label="Master switch" aria-pressed="${db.settings.master}"></button></div></div>
<div class="note small">This version has no server, so messages are created here and you send each one with its Email or WhatsApp button. The full system sends them by itself.</div>
${card('Rules', table(['Rule', 'Trigger', 'Sends to', '#Created', 'On'], rules))}${card('Message log', messageList(db.messages.slice(0, 40)))}`);
}
function practiceView() {
  const admin = me.role === 'admin', sids = new Set(myStudents().map(s => s.id));
  const res = db.attempts.filter(a => sids.has(a.studentId)).sort((a, b) => b.date.localeCompare(a.date)).map(a => `<tr><td>${esc(fmtD(a.date))}</td><td><a href="#/student/${a.studentId}">${esc(stu(a.studentId).name)}</a></td><td>${esc(by('tests', a.testId).name)}</td><td class="num">${a.correct}/${a.total}</td><td class="num"><b>${a.scaled}</b></td><td>${btn('Review', 'review', { id: a.id })}</td></tr>`);
  const asg = db.assignments.filter(a => sids.has(a.studentId) && a.status !== 'done').map(a => `<tr><td>${esc(stu(a.studentId).name)}</td><td>${esc(by('tests', a.testId).name)}</td><td>${esc(a.due)}</td><td>${db.progress[a.id] ? chip('In progress', 'blue') : chip('Not started')}</td><td>${btn('Remove', 'unassign', { id: a.id }, 'danger')}</td></tr>`);
  const tests = db.tests.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.section)}</td><td class="num">${t.questions.length}</td><td class="num">${t.minutes} min</td><td><div style="display:flex;gap:6px">${btn('Assign', 'assign', { tid: t.id }, 'primary')}${btn('Preview', 'previewTest', { id: t.id })}${admin ? btn('Delete', 'delTest', { id: t.id }, 'danger') : ''}</div></td></tr>`);
  return page(admin ? 'Practice tests' : 'Practice results', 'Students take tests in their portal; results arrive here', admin ? btn('New test', 'newTest', {}, 'primary') : '',
    card('Results', table(['Date', 'Student', 'Test', '#Correct', '#Est. score', ''], res, 'No results yet. Assign a test, then sign in as the student to take it.')) + card('Waiting', table(['Student', 'Test', 'Due', 'Status', ''], asg, 'Nothing assigned.')) + card('Test library', table(['Test', 'Section', '#Questions', '#Time', ''], tests, 'No tests yet.')));
}
function reviewHtml(a) {
  const t = by('tests', a.testId);
  return `<div class="grid g2" style="gap:12px"><div><div class="label">Correct</div><div class="big">${a.correct}/${a.total}</div></div><div><div class="label">Estimated ${esc(t.section)} score</div><div class="big">${a.scaled}</div></div></div>${Object.entries(a.bySkill).map(([k, v]) => bar(k, Math.round(100 * v.c / v.n), `${v.c}/${v.n}`)).join('')}<div class="list">${t.questions.map((q, i) => { const ok = a.answers[i] === q.answer; return `<div class="li" style="align-items:flex-start"><span class="chip ${ok ? 'green' : 'red'}">${i + 1}</span><div class="grow"><div>${esc(q.q)}</div><div class="small ${ok ? '' : 'muted'}">Answered: ${a.answers[i] == null ? 'skipped' : esc(q.choices[a.answers[i]])}${ok ? '' : ' · Correct: <b>' + esc(q.choices[q.answer]) + '</b>'}</div></div></div>`; }).join('')}</div>`;
}
function parentHome() {
  const kids = myStudents(), b = balance(me.id);
  return page('Hello ' + meName().split(' ')[0], 'Your children at Amro Academy', '<a class="btn" href="#/freetime">Update free time</a>',
    `<div class="grid g3">${stat('Balance', money(b), b > 0 ? 'Amount due' : 'Nothing due')}${stat('Children', kids.length, kids.map(k => k.name).join(', '))}${stat('Unread messages', db.messages.filter(m => m.toKind === 'parent' && m.toId === me.id).length, 'Confirmations and summaries')}</div>` +
    kids.map(k => {
      const ss = db.sessions.filter(s => sEnr(s).studentId === k.id), next = ss.filter(s => s.status === 'booked' && sEnd(s) > Date.now()).sort((a, b2) => a.start.localeCompare(b2.start))[0], last = ss.filter(s => s.status === 'completed').sort((a, b2) => b2.start.localeCompare(a.start))[0], lt = latestTotal(k.id);
      return card(k.name, `<div class="grid g3" style="gap:14px"><div><div class="label">NEXT SESSION</div>${next ? `<b>${esc(fmtDT(next.start))}</b><div class="small muted">${esc(sEnr(next).subject)} · ${esc(sTut(next).name)} · ${esc(next.mode)}</div>` : '<span class="muted">Nothing booked</span>'}</div><div><div class="label">SCORE</div><b>${lt || '—'}</b> <span class="small muted">target ${k.target || '—'}</span></div><div><div class="label">SAT DATE</div><b>${esc(k.testDate || '—')}</b></div></div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid #E2E8F0;padding-top:12px"><div><div class="label">SAT LIBRARY</div><b>${esc(libStatusLine(k.id))}</b></div>${hasLib(k.id) ? '' : k.libRequested ? chip('Request sent', 'amber') : btn('Request a subscription', 'libRequest', { sid: k.id }, 'primary')}</div>
${last ? `<div class="note"><b>Latest session · ${esc(fmtD(last.start))} · ${esc(sEnr(last).subject)}</b><div>${esc(last.log.summary)}</div><div class="small"><b>Homework:</b> ${esc(last.log.homework || 'None')}</div>${last.log.parentNote ? `<div class="small"><b>Tutor's note:</b> ${esc(last.log.parentNote)}</div>` : ''}</div>` : ''}${scoreChart(db.scores.filter(x => x.studentId === k.id))}`, `<a class="btn sm" href="#/sessions">Schedule</a>`);
    }).join(''));
}
let ftChild = '';
function freetimeView() {
  const kids = myStudents(); if (!kids.find(k => k.id === ftChild)) ftChild = kids[0] ? kids[0].id : '';
  const k = stu(ftChild); if (!k) return page('Free time', '', '', card('', '<div class="muted">No children on this account.</div>'));
  return page(k.name + "'s free time", 'Tap the hours your child can study each week. Tutors can only book inside green hours. Saved automatically.', kids.length > 1 ? kids.map(c => btn(c.name, 'ftchild', { id: c.id }, c.id === ftChild ? 'primary' : '')).join('') : '',
    card('Every week', gridView(k, true), `<span class="small muted">${Object.values(k.freeTime).filter(Boolean).length} hours marked free</span>`));
}
function studentHome() {
  const s = stu(me.id), ss = db.sessions.filter(x => sEnr(x).studentId === s.id), next = ss.filter(x => x.status === 'booked' && sEnd(x) > Date.now()).sort((a, b) => a.start.localeCompare(b.start))[0];
  const todo = db.assignments.filter(a => a.studentId === s.id && a.status !== 'done'), hw = ss.filter(x => x.status === 'completed' && x.log.homework).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 5), lt = latestTotal(s.id);
  const days = s.testDate ? Math.ceil((new Date(s.testDate) - Date.now()) / D) : null;
  return page('Hi ' + s.name.split(' ')[0], days != null && days >= 0 ? `${days} days to your SAT` : 'Welcome back', '',
    `<div class="grid g3">${stat('Latest score', lt || '—', 'Target ' + (s.target || '—'))}${stat('Next session', next ? fmtDT(next.start) : '—', next ? sEnr(next).subject + ' · ' + sTut(next).name : 'Nothing booked')}${stat('Tests to take', todo.length, todo.map(a => by('tests', a.testId).name).join(', '))}</div>
<div class="grid g2">${card('Homework', hw.length ? `<div class="list">${hw.map(x => `<div class="li"><button type="button" class="check ${x.log.hwDone ? 'done' : ''}" data-act="hw" data-id="${x.id}" aria-label="Mark homework done" style="cursor:pointer;background:${x.log.hwDone ? '#059669' : '#fff'}"></button><div class="grow"><div class="t" style="${x.log.hwDone ? 'text-decoration:line-through' : ''}">${esc(x.log.homework)}</div><div class="small muted">${esc(sEnr(x).subject)} · set ${esc(fmtD(x.start))}</div></div></div>`).join('')}</div>` : '<div class="muted">No homework yet.</div>')}${card('Practice tests', todo.length ? `<div class="list">${todo.map(a => `<div class="li"><div class="grow"><div class="t">${esc(by('tests', a.testId).name)}</div><div class="small muted">Due ${esc(a.due)}</div></div><a class="btn sm primary" href="#/take/${a.id}">${db.progress[a.id] ? 'Resume' : 'Start'}</a></div>`).join('')}</div>` : '<div class="muted">Nothing assigned.</div>')}</div><div class="grid g2">${card('SAT Library', hasLib(s.id) ? `<div class="muted">${esc(libStatusLine(s.id))}</div>${bar('Course progress', libPct(s.id), libPct(s.id) + '%')}<a class="btn primary" href="#/library" style="align-self:flex-start">Open the library</a>` : `<div class="muted">The full SAT Library (videos, guides and practice for every topic) is a yearly subscription. Free preview topics are open now.</div><a class="btn" href="#/library" style="align-self:flex-start">Browse the library</a>`)}${masteryCard(s.id)}</div>`);
}
function myTestsView() {
  const todo = db.assignments.filter(a => a.studentId === me.id && a.status !== 'done'), done = db.attempts.filter(a => a.studentId === me.id).sort((a, b) => b.date.localeCompare(a.date));
  return page('Practice tests', 'Timed tests assigned by your tutor', '',
    card('To take', table(['Test', 'Questions', 'Time', 'Due', ''], todo.map(a => { const t = by('tests', a.testId); return `<tr><td><b>${esc(t.name)}</b></td><td>${t.questions.length}</td><td>${t.minutes} min</td><td>${esc(a.due)}</td><td><a class="btn sm primary" href="#/take/${a.id}">${db.progress[a.id] ? 'Resume' : 'Start'}</a></td></tr>`; }), 'Nothing assigned right now.')) +
    card('Finished', table(['Date', 'Test', '#Correct', '#Est. score', ''], done.map(a => `<tr><td>${esc(fmtD(a.date))}</td><td>${esc(by('tests', a.testId).name)}</td><td class="num">${a.correct}/${a.total}</td><td class="num"><b>${a.scaled}</b></td><td>${btn('Review answers', 'review', { id: a.id })}</td></tr>`), 'No finished tests yet.')));
}
function scoresView() {
  const sc = db.scores.filter(s => s.studentId === me.id);
  return page('My scores', 'Every test, and where to focus next', '', `<div class="grid g21">${card('Score timeline', (scoreChart(sc) || '') + table(['Date', 'Test', 'Type', '#Math', '#R&W', '#Total'], scoreRows(sc), 'No scores yet.'))}${masteryCard(me.id)}</div>`);
}
function takeView(aid) {
  const a = by('assignments', aid); if (!a || a.studentId !== me.id || a.status === 'done') return shell('mytests', page('Test not available', '', '<a class="btn" href="#/mytests">Back</a>', ''));
  const t = by('tests', a.testId); let p = db.progress[aid];
  if (!p) { p = db.progress[aid] = { answers: {}, flags: {}, i: 0, startedAt: Date.now() }; save(); }
  const q = t.questions[p.i], left = () => Math.max(0, Math.round(t.minutes * 60 - (Date.now() - p.startedAt) / 1000)), mmss = s => pad(Math.floor(s / 60)) + ':' + pad(s % 60);
  timer = setInterval(() => { const el = $('#timer'); if (!el) return; const l = left(); el.textContent = mmss(l); if (l <= 0) { clearInterval(timer); finishTest(aid, true); } }, 1000);
  const answered = Object.keys(p.answers).length;
  return `<div class="player"><div class="ptop"><div><div style="font-weight:800">${esc(t.name)}</div><div class="small muted">${esc(t.section)} · practice mode · answers save automatically</div></div><div class="timer" id="timer">${mmss(left())}</div><div class="ptools"><a class="tool" href="#/mytests" style="text-decoration:none">Save &amp; exit</a></div></div>
<div class="pbody"><div class="pane" style="display:flex;flex-direction:column;gap:20px;max-width:820px;margin:0 auto">
<div style="display:flex;justify-content:space-between;align-items:center;background:#F1F5F9;border-radius:10px;padding:8px 12px"><div style="display:flex;gap:10px;align-items:center"><span style="background:#0F172A;color:#fff;border-radius:6px;padding:2px 10px;font-weight:800">${p.i + 1}</span><button type="button" class="btn sm" data-act="flag" data-aid="${aid}" style="border:0;background:transparent">${p.flags[p.i] ? 'Marked for review ✓' : 'Mark for review'}</button></div><span class="small muted">${answered} of ${t.questions.length} answered</span></div>
<p style="margin:0;font-size:18px;line-height:1.6">${esc(q.q)}</p>
<div style="display:flex;flex-direction:column;gap:12px">${q.choices.map((c, i) => `<button type="button" class="choice ${p.answers[p.i] === i ? 'sel' : ''}" data-act="answer" data-aid="${aid}" data-c="${i}" aria-pressed="${p.answers[p.i] === i}"><span class="letter">${'ABCD'[i]}</span>${esc(c)}</button>`).join('')}</div></div></div>
<div class="pbottom"><div class="qnav">${t.questions.map((_, i) => `<button type="button" class="qn ${p.answers[i] != null ? 'done' : ''} ${i === p.i ? 'cur' : ''} ${p.flags[i] ? 'flag' : ''}" data-act="goto" data-aid="${aid}" data-i="${i}" aria-label="Question ${i + 1}" style="cursor:pointer;font:inherit;font-size:13px;font-weight:600">${i + 1}</button>`).join('')}</div>
<div style="display:flex;gap:10px"><button type="button" class="btn" data-act="goto" data-aid="${aid}" data-i="${Math.max(0, p.i - 1)}">Back</button>${p.i < t.questions.length - 1 ? `<button type="button" class="btn primary" data-act="goto" data-aid="${aid}" data-i="${p.i + 1}">Next</button>` : `<button type="button" class="btn primary" data-act="finish" data-aid="${aid}">Submit test</button>`}</div></div></div>`;
}
function finishTest(aid, auto) {
  const at = submitAttempt(aid); save(); location.hash = '#/mytests'; render();
  modal(auto ? 'Time is up — test submitted' : 'Test submitted', reviewHtml(at) + '<div class="small muted">Your tutor has been notified.</div>');
}
function settingsView() {
  const s = db.settings, tg = (label, key, sub) => `<div class="li"><div class="grow"><div class="t">${label}</div><div class="small muted">${sub || ''}</div></div><button type="button" class="toggle ${s[key] ? 'on' : ''}" data-act="setting" data-k="${key}" aria-label="${label}" aria-pressed="${!!s[key]}"></button></div>`;
  return page('Settings', 'Academy rules and your data', '',
    `<div class="grid g2">${card('Academy', `<form id="setform" style="display:flex;flex-direction:column;gap:12px">${field('Academy name', 'academy', 'text', s.academy)}${field('Admin name', 'adminName', 'text', s.adminName)}${field('Admin email', 'adminEmail', 'email', s.adminEmail)}<div class="grid g2" style="gap:12px">${field('Late cancellation window (hours)', 'lateHours', 'number', s.lateHours, 'min="0"')}${field('Tutor pay for a no-show (%)', 'noShowTutorPct', 'number', s.noShowTutorPct, 'min="0" max="100"')}</div><div class="grid g2" style="gap:12px">${field('Minimum SAT score to apply as a tutor', 'minSat', 'number', s.minSat, 'min="400" max="1600" step="10"')}${field('Academy commission per session (%)', 'commissionPct', 'number', s.commissionPct, 'min="0" max="90"')}${field('Standard session price (USD)', 'defaultPrice', 'number', s.defaultPrice, 'min="0" step="0.5"')}<div></div>${field('Library plan name', 'libPlan', 'text', s.libPlan)}${field('Library price per student per year (USD)', 'libPrice', 'number', s.libPrice, 'min="0" step="1"')}</div><button class="btn primary" style="align-self:flex-start">Save</button></form>`)}
${card('Policies', `<div class="list">${tg('Charge late cancellations', 'chargeLate', 'When a parent cancels inside the window')}${tg('Pay the tutor for late cancellations', 'payTutorLate')}${tg('Charge student no-shows', 'chargeNoShow')}</div>`)}</div>
${card('Your data', `<div class="muted">Everything is stored in this browser only. Download a backup often, and use it to move to another device.</div><div style="display:flex;gap:10px;flex-wrap:wrap">${btn('Download backup', 'export', {}, 'primary')}<label class="btn sm" style="cursor:pointer">Restore from backup<input type="file" id="importfile" accept="application/json" style="display:none"></label>${btn('Load demo data', 'reseed')}${btn('Erase everything and start empty', 'wipe', {}, 'danger')}</div>`)}`);
}


/* ---------- Tutor hiring and per-session pay ---------- */
const STAGES = [['applied', 'Applied'], ['screening', 'Screening'], ['demo', 'Demo lesson'], ['offer', 'Contract sent'], ['hired', 'Hired']];
const UNIS = ['AUB', 'LAU', 'USJ', 'NDU', 'LIU', 'BAU', 'Lebanese University', 'Other'];
const app_ = id => db.applications.find(a => a.id === id);
const share = price => Math.round(price * (100 - db.settings.commissionPct)) / 100;
function contractHtml(name) {
  const s = db.settings, p = s.defaultPrice;
  return `<div style="background:#F8FAFC;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px">
<div style="font-weight:800;font-size:16px">Independent Tutor Agreement · summary</div>
<div><b>Tutor:</b> ${esc(name)} · <b>Academy:</b> ${esc(s.academy)}</div>
<ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">
<li>The tutor works as an <b>independent contractor</b>, not an employee. There is no salary and no fixed hours.</li>
<li>The tutor is <b>paid per completed session</b>. The tutor's share is paid after each session is logged in the platform.</li>
<li>The academy keeps a <b>commission of ${s.commissionPct}%</b> of the session price. At the standard price of ${money(p)}, the tutor receives ${money(share(p))} per session.</li>
<li>Parent cancellations inside ${s.lateHours} hours are ${s.payTutorLate ? 'paid in full' : 'not paid'}; student no-shows are paid at ${s.noShowTutorPct}%.</li>
<li>The tutor sets weekly availability; sessions are booked only inside it. Every session must be logged within 24 hours.</li>
<li>All contact with families goes through the platform. Students introduced by the academy are not taught privately outside it.</li>
<li>Either side can end the agreement with notice. Sessions already completed are always paid.</li>
</ul></div><div class="small muted">Demo summary only. Use a full agreement reviewed by a lawyer before signing tutors.</div>`;
}
function applyView() {
  if (mem.applied) return `<div class="auth"><section class="authform" style="flex:1"><div style="max-width:520px;display:flex;flex-direction:column;gap:14px;align-items:flex-start"><img src="assets/logo-full.png" alt="Amro Academy logo" style="height:110px"><h1 style="margin:0;font-size:30px">Thank you, ${esc(mem.applied)}.</h1><p class="muted" style="margin:0">Your application was received. We review every application and will contact you for a short screening call, then a demo lesson.</p><a class="btn" href="#/">Back</a></div></section></div>`;
  const s = db.settings, opt = l => l.map(x => [x, x]);
  return `<div style="max-width:880px;margin:0 auto;padding:40px 20px;display:flex;flex-direction:column;gap:20px">
<div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><img src="assets/logo-full.png" alt="Amro Academy logo" style="height:96px;background:#fff;border-radius:14px;padding:6px 10px"><div><h1 style="margin:0;font-size:32px;font-weight:800">Teach the SAT with Amro Academy</h1><p class="muted" style="margin:6px 0 0">For university students with a high SAT score. Flexible hours, online or in person.</p></div></div>
<div class="grid g3">${stat('Who we hire', s.minSat + '+', 'SAT total, from a recent official test')}${stat('How you work', 'Contractor', 'Choose your own weekly hours')}${stat('How you are paid', 'After each session', `${100 - s.commissionPct}% of the session price`)}</div>
<div class="card"><form id="applyform" style="display:flex;flex-direction:column;gap:14px">
<div class="grid g2" style="gap:12px">${field('Full name', 'name', 'text', '', 'required')}${field('Email', 'email', 'email', '', 'required')}${field('WhatsApp number (with country code)', 'phone', 'tel', '', 'required')}${select('University', 'university', opt(UNIS))}${field('Major', 'major', 'text', '', 'required')}${select('Year', 'year', opt(['1st year', '2nd year', '3rd year', '4th year', 'Graduate student']))}</div>
<div class="grid g3" style="gap:12px">${field('SAT total (400–1600)', 'satTotal', 'number', '', 'min="400" max="1600" step="10" required')}${field('Math (200–800)', 'satMath', 'number', '', 'min="200" max="800" step="10" required')}${field('Reading & Writing (200–800)', 'satRW', 'number', '', 'min="200" max="800" step="10" required')}</div>
<div class="grid g2" style="gap:12px">${field('When did you take it? (month and year)', 'satDate', 'month', '', 'required')}${field('Link to your official score report (optional)', 'proof', 'url', '', 'placeholder="https://"')}</div>
<div class="field"><span style="font-size:13px;font-weight:600">What can you teach?</span><div style="display:flex;gap:10px;flex-wrap:wrap"><label class="chip" style="cursor:pointer"><input type="checkbox" name="subjects" value="SAT Math" checked> SAT Math</label><label class="chip" style="cursor:pointer"><input type="checkbox" name="subjects" value="SAT Reading & Writing"> SAT Reading &amp; Writing</label></div></div>
<div class="grid g2" style="gap:12px">${field('Hours per week you can teach', 'hours', 'number', 6, 'min="1" max="40" required')}${select('Mode', 'mode', opt(['Online', 'In person', 'Both']))}</div>
${field('Why do you want to tutor, and how did you prepare for your SAT?', 'why', 'textarea', '')}
<label style="display:flex;gap:8px;align-items:flex-start" class="small"><input type="checkbox" name="agree" required> I understand this is an independent contractor role paid per session, not employment.</label>
<div id="applyerr"></div><button class="btn primary" style="align-self:flex-start">Submit application</button></form></div></div>`;
}
function submitApplication(f) {
  const s = db.settings, t = +f.satTotal, m = +f.satMath, r = +f.satRW;
  if (!(t >= 400 && t <= 1600) || !(m >= 200 && m <= 800) || !(r >= 200 && r <= 800)) return 'Enter valid SAT scores.';
  if (m + r !== t) return 'Math plus Reading & Writing must equal your total score.';
  if (t < s.minSat) return `Thank you for your interest. We currently hire tutors with an SAT total of ${s.minSat} or higher.`;
  if (f.proof && !/^https?:\/\//i.test(f.proof)) return 'The score report link must start with https://';
  if (db.applications.some(a => a.email.toLowerCase() === String(f.email).toLowerCase() && a.status !== 'rejected')) return 'An application with this email is already being reviewed.';
  const a = { id: uid(), name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), university: f.university, major: f.major.trim(), year: f.year, satTotal: t, satMath: m, satRW: r, satDate: f.satDate, proof: f.proof || '', subjects: [].concat(f.subjects || []), hours: +f.hours, mode: f.mode, why: f.why || '', status: 'applied', date: new Date().toISOString(), notes: '', history: [{ status: 'applied', at: new Date().toISOString() }] };
  db.applications.push(a);
  notify('application_received', 'applicant', a.id, 'We received your tutor application', `Hi ${a.name.split(' ')[0]},\n\nThank you for applying to teach at ${s.academy}. We will review your application and contact you for a short screening call.\n\nTutors work as independent contractors and are paid after each completed session.`);
  notify('manual', 'admin', '', `New tutor application: ${a.name}`, `${a.name} · ${a.university} ${a.major} · SAT ${t} (Math ${m}, R&W ${r}). Open Tutor hiring to review.`);
  return a;
}
function setStage(a, status, extra) { a.status = status; Object.assign(a, extra || {}); a.history.push({ status, at: new Date().toISOString() }); }
function hireApplicant(a) {
  const t = { id: uid(), name: a.name, email: a.email, phone: a.phone, subjects: a.subjects.join(', '), rate: share(db.settings.defaultPrice), university: a.university, satTotal: a.satTotal };
  db.tutors.push(t); setStage(a, 'hired', { tutorId: t.id, contractSigned: new Date().toISOString() });
  return t;
}
function hiringView() {
  const s = db.settings, act = db.applications.filter(a => !['hired', 'rejected'].includes(a.status)), hired = db.applications.filter(a => a.status === 'hired');
  const avg = hired.length ? Math.round(hired.reduce((x, a) => x + a.satTotal, 0) / hired.length) : '—';
  const acts = a => ({ applied: btn('Move to screening', 'stage', { id: a.id, to: 'screening' }, 'primary'), screening: btn('Book demo lesson', 'demo', { id: a.id }, 'primary'), demo: btn('Passed · send contract', 'demoPass', { id: a.id }, 'primary'), offer: btn('Contract', 'contract', { id: a.id }, 'primary'), hired: chip('Tutor account created', 'green') }[a.status] || '');
  const cardA = a => `<div class="card" style="padding:14px;gap:8px"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><div style="font-weight:700">${esc(a.name)}</div><div class="small muted">${esc(a.university)} · ${esc(a.major)} · ${esc(a.year)}</div></div>${chip('SAT ' + a.satTotal, a.satTotal >= 1500 ? 'green' : 'blue')}</div><div class="small muted">${esc(a.subjects.join(', '))} · ${a.hours} h/week · ${esc(a.mode)}</div>${a.demoAt && a.status === 'demo' ? `<div class="small"><b>Demo:</b> ${esc(fmtDT(a.demoAt))}</div>` : ''}${a.demoRating ? `<div class="small"><b>Demo rating:</b> ${a.demoRating}/5</div>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap">${acts(a)}${btn('Open', 'openApp', { id: a.id })}${a.status !== 'hired' ? btn('Reject', 'rejectApp', { id: a.id }, 'danger') : ''}</div></div>`;
  const cols = STAGES.map(([k, label]) => { const l = db.applications.filter(a => a.status === k).sort((x, y) => y.satTotal - x.satTotal); return `<div style="flex:1;min-width:196px;display:flex;flex-direction:column;gap:10px"><div style="display:flex;justify-content:space-between;align-items:center"><b>${label}</b>${chip(l.length)}</div>${l.map(cardA).join('') || '<div class="small muted">None</div>'}</div>`; }).join('');
  const rej = db.applications.filter(a => a.status === 'rejected');
  return page('Tutor hiring', 'University students with high SAT scores, hired as contractors', '<a class="btn" href="#/apply" target="_blank" rel="noopener">Open the application form</a>',
    `<div class="grid g4">${stat('Applications', db.applications.length, 'All time')}${stat('In progress', act.length, 'Being reviewed')}${stat('Hired', hired.length, 'Average SAT ' + avg)}${stat('Tutor share', (100 - s.commissionPct) + '%', `Academy keeps ${s.commissionPct}% · paid after each session`)}</div>
<div class="note small"><b>How we hire:</b> 1. Apply online (SAT ${s.minSat}+ only) → 2. Screening call and score check → 3. Demo lesson → 4. Contractor agreement → 5. Tutor account. Change the minimum score and commission in Settings.</div>
${card('Pipeline', `<div class="tablewrap"><div style="display:flex;gap:12px;min-width:1040px;padding-bottom:4px">${cols}</div></div>`)}
${rej.length ? card('Not selected', `<div class="list">${rej.map(a => `<div class="li"><div class="grow"><div class="t">${esc(a.name)}</div><div class="small muted">${esc(a.university)} · SAT ${a.satTotal} · ${esc(a.rejectReason || '')}</div></div>${btn('Open', 'openApp', { id: a.id })}</div>`).join('')}</div>`) : ''}`);
}
function dueEarnings() { return db.tutorLedger.filter(l => l.type === 'earning' && l.payStatus === 'due').sort((a, b) => a.date.localeCompare(b.date)); }
function payEarning(id, method) {
  const e = db.tutorLedger.find(l => l.id === id); if (!e || e.payStatus !== 'due') return 'Already paid.';
  addTutorLedger(e.tutorId, 'payout', e.amount, 'Payout · ' + e.desc, { method, earningId: e.id });
  e.payStatus = 'paid'; e.paidAt = new Date().toISOString(); e.payMethod = method;
  notify('tutor_payout', 'tutor', e.tutorId, `You were paid ${money(e.amount)}`, `${money(e.amount)} by ${method} for: ${e.desc}.`);
}
function payoutsCard() {
  const due = dueEarnings(), tot = due.reduce((a, l) => a + l.amount, 0);
  return card('Tutor payouts due', due.length ? table(['Session', 'Tutor', '#Tutor share', ''], due.map(l => `<tr><td>${esc(l.desc)}<div class="small muted">${esc(fmtD(l.date))}</div></td><td>${esc((tut(l.tutorId) || {}).name || '')}</td><td class="num"><b>${money(l.amount)}</b></td><td>${btn('Pay now', 'payNow', { id: l.id }, 'primary')}</td></tr>`)) : '<div class="muted">All tutors are paid. Each logged session appears here until its payout is recorded.</div>', `<span class="small muted">${due.length} due · ${money(tot)} · paid after each session</span>`);
}

/* ---------- SAT Library ---------- */
const SECTIONS = ['Math', 'Reading & Writing', 'Strategy'];
const DOMAINS = SKILLS.concat(['Test strategy']);
const secOf = d => { const i = SKILLS.indexOf(d); return i < 0 ? 'Strategy' : i < 4 ? 'Math' : 'Reading & Writing'; };
const TYPE_LABEL = { video: 'Video lesson', guide: 'Study guide', practice: 'Practice', resource: 'Resource' };
const LOCK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px;margin-right:6px"><rect x="4" y="11" width="16" height="10" rx="2"></rect><path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';
function seedLibrary() {
  db.libTopics = (window.AMRO_LIB_SEED || []).map((t, i) => ({ id: 'lt' + (i + 1), domain: t.domain, section: secOf(t.domain), title: t.title, order: i, items: [
    { id: uid(), type: 'video', title: 'Video lesson', url: '', minutes: 0, free: !!t.free },
    { id: uid(), type: 'guide', title: 'Study guide', body: t.guide, free: !!t.free || i === 0 },
    { id: uid(), type: 'practice', title: 'Practice set', questions: t.practice.map(p => ({ q: p[0], choices: p[1], answer: p[2], explain: p[3], skill: t.domain })), free: !!t.free }
  ].concat((t.resources || []).map(r => ({ id: uid(), type: 'resource', title: r[0], url: r[1], body: r[2] || '', free: true }))) }));
  db.libSeeded = true;
}
const sortedTopics = () => db.libTopics.slice().sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || a.order - b.order);
const subOf = sid => db.subscriptions.filter(s => s.studentId === sid && s.status !== 'cancelled').sort((a, b) => b.end.localeCompare(a.end))[0];
const hasLib = sid => { const s = subOf(sid); return !!s && new Date(s.start).getTime() <= Date.now() && new Date(s.end).getTime() > Date.now(); };
const libP = sid => (db.libProgress[sid] = db.libProgress[sid] || {});
const realItems = t => t.items.filter(i => i.type !== 'video' || i.url);
const itemDone = (sid, it) => !!(db.libProgress[sid] && db.libProgress[sid][it.id] && db.libProgress[sid][it.id].done);
const topicPct = (sid, t) => { const its = realItems(t); return its.length ? Math.round(100 * its.filter(i => itemDone(sid, i)).length / its.length) : 0; };
function libPct(sid, section) { let n = 0, d = 0; db.libTopics.filter(t => !section || t.section === section).forEach(t => realItems(t).forEach(i => { n++; if (itemDone(sid, i)) d++; })); return n ? Math.round(100 * d / n) : 0; }
const canSee = it => me.role !== 'student' || hasLib(me.id) || it.free;
function findItem(id) { for (const t of db.libTopics) { const it = t.items.find(i => i.id === id); if (it) return { t, it }; } return {}; }
function md(text) {
  const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  let h = '', list = false;
  String(text || '').split('\n').forEach(line => {
    const l = line.trim();
    if (l.startsWith('- ')) { if (!list) { h += '<ul style="margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:6px">'; list = true; } h += '<li>' + inl(l.slice(2)) + '</li>'; return; }
    if (list) { h += '</ul>'; list = false; }
    if (!l) return;
    h += l.startsWith('# ') ? `<h3 style="margin:14px 0 6px;font-size:16px">${inl(l.slice(2))}</h3>` : `<p style="margin:0 0 10px">${inl(l)}</p>`;
  });
  return h + (list ? '</ul>' : '');
}
function embed(url, who) {
  const u = String(url || '').trim(); let m, src = '';
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/))) src = 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&modestbranding=1';
  else if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) src = 'https://player.vimeo.com/video/' + m[1];
  else if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/))) src = 'https://drive.google.com/file/d/' + m[1] + '/preview';
  const wm = who ? `<div style="position:absolute;right:12px;top:10px;font-size:12px;color:rgba(255,255,255,.6);pointer-events:none">${esc(who)}</div>` : '';
  if (src) return `<div style="position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#0B1220"><iframe src="${esc(src)}" title="Video lesson" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>${wm}</div>`;
  if (/\.(mp4|webm|m4v)(\?|#|$)/i.test(u)) return `<div style="position:relative"><video src="${esc(u)}" controls controlslist="nodownload" oncontextmenu="return false" style="width:100%;border-radius:12px;background:#000"></video>${wm}</div>`;
  return /^https?:\/\//i.test(u) ? `<a class="btn primary" href="${esc(u)}" target="_blank" rel="noopener">Open the video</a>` : '';
}
function parseQuestions(text, defSkill) {
  const qs = []; let err = '';
  String(text || '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean).forEach((b, n) => {
    const q = (b.match(/^Q:\s*(.+)$/m) || [])[1], ch = ['A', 'B', 'C', 'D'].map(L => (b.match(new RegExp('^' + L + '\\)\\s*(.+)$', 'm')) || [])[1]);
    const ans = 'ABCD'.indexOf(((b.match(/^ANSWER:\s*([A-D])/mi) || [])[1] || '').toUpperCase());
    const sk = ((b.match(/^SKILL:\s*(.+)$/mi) || [])[1] || defSkill || '').trim(), ex = ((b.match(/^EXPLAIN:\s*(.+)$/mi) || [])[1] || '').trim();
    if (!q || ch.some(c => !c) || ans < 0) err = err || `Question ${n + 1} needs Q:, A) to D) and ANSWER:.`;
    else if (!defSkill && !SKILLS.includes(sk)) err = err || `Question ${n + 1}: SKILL "${sk}" is not in the list.`;
    else qs.push({ q: q.trim(), choices: ch.map(c => c.trim()), answer: ans, skill: sk, explain: ex });
  });
  if (!err && !qs.length) err = 'Add at least one question.';
  return { qs, err };
}
const qText = qs => qs.map(q => `Q: ${q.q}\n${q.choices.map((c, i) => 'ABCD'[i] + ') ' + c).join('\n')}\nANSWER: ${'ABCD'[q.answer]}${q.explain ? '\nEXPLAIN: ' + q.explain : ''}`).join('\n\n');
function counts(t) {
  const v = t.items.filter(i => i.type === 'video'), vOk = v.filter(i => i.url).length, nq = t.items.filter(i => i.type === 'practice').reduce((a, i) => a + i.questions.length, 0), nr = t.items.filter(i => i.type === 'resource').length, ng = t.items.filter(i => i.type === 'guide').length;
  return [vOk ? vOk + ' video' + (vOk > 1 ? 's' : '') : '', ng ? 'Guide' : '', nq ? nq + ' practice questions' : '', nr ? nr + ' resource' + (nr > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
}
function outline(row) {
  return SECTIONS.map(sec => {
    const ts = sortedTopics().filter(t => t.section === sec); if (!ts.length) return '';
    return card(sec === 'Strategy' ? 'Test strategy' : sec, [...new Set(ts.map(t => t.domain))].map(d => `<div class="label" style="margin-top:8px">${esc(d.toUpperCase())}</div><div class="list">${ts.filter(t => t.domain === d).map(row).join('')}</div>`).join(''));
  }).join('');
}
function recommended(sid) {
  const m = mastery(sid), out = [];
  SKILLS.filter(k => m[k]).sort((a, b) => m[a].c / m[a].n - m[b].c / m[b].n).forEach(d => { const t = sortedTopics().find(x => x.domain === d && topicPct(sid, x) < 100); if (t && out.length < 3 && m[d].c / m[d].n < 0.85) out.push([t, `${d}: ${Math.round(100 * m[d].c / m[d].n)}% correct so far`]); });
  sortedTopics().forEach(t => { if (out.length < 3 && !out.some(o => o[0] === t) && topicPct(sid, t) < 100) out.push([t, 'Next in the course']); });
  return out;
}
const miniBar = pct => `<div style="width:130px"><div class="bar ${pct >= 100 ? 'green' : ''}"><span style="width:${pct}%"></span></div><div class="small muted" style="text-align:right">${pct}%</div></div>`;
function libraryView() {
  if (me.role === 'admin') return libAdminView();
  const sid = me.role === 'student' ? me.id : null, ok = !sid || hasLib(sid), s = sid && stu(sid), sub = sid && subOf(sid);
  const row = t => { const hasFree = t.items.some(i => i.free), locked = !ok && !hasFree;
    return `<a class="li" href="#/topic/${t.id}" style="text-decoration:none;color:inherit"><div class="grow"><div class="t" style="color:${locked ? '#64748B' : '#0F172A'}">${locked ? LOCK : ''}${esc(t.title)}</div><div class="small muted">${esc(counts(t))}</div></div>${sid && ok ? miniBar(topicPct(sid, t)) : ''}${!ok && hasFree ? chip('Free preview', 'green') : ''}</a>`; };
  let head = '';
  if (sid && ok) {
    const last = db.libTopics.find(t => t.id === libP(sid)._last), rec = recommended(sid);
    head = `<div class="grid g4">${stat('Course complete', libPct(sid) + '%', 'All topics')}${stat('Math', libPct(sid, 'Math') + '%', 'Complete')}${stat('Reading & Writing', libPct(sid, 'Reading & Writing') + '%', 'Complete')}${stat('Access until', fmtD(sub.end), db.settings.libPlan)}</div>
<div class="grid g2">${card('Continue', last ? `<div><div style="font-weight:800;font-size:17px">${esc(last.title)}</div><div class="small muted">${esc(last.domain)}</div></div>${miniBar(topicPct(sid, last))}<a class="btn primary" href="#/topic/${last.id}" style="align-self:flex-start">Resume</a>` : `<div class="muted">Start with the first topic, or pick a recommended one.</div><a class="btn primary" href="#/topic/${sortedTopics()[0] ? sortedTopics()[0].id : ''}" style="align-self:flex-start">Start the course</a>`)}
${card('Recommended for you', rec.length ? `<div class="list">${rec.map(r => `<a class="li" href="#/topic/${r[0].id}" style="text-decoration:none;color:inherit"><div class="grow"><div class="t">${esc(r[0].title)}</div><div class="small muted">${esc(r[1])}</div></div><span class="btn sm">Open</span></a>`).join('')}</div>` : '<div class="muted">You have finished every topic. Great work.</div>', '<span class="small muted">From your weakest skills</span>')}</div>`;
  } else if (sid) {
    head = `<div class="card" style="background:#0369A1;color:#fff;border-color:#0369A1;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:space-between"><div style="max-width:640px;display:flex;flex-direction:column;gap:6px"><div style="font-weight:800;font-size:20px">${LOCK}Unlock the full SAT Library</div><div style="color:#E0F2FE">Every SAT topic with video lessons, study guides, practice with explanations, and resources. ${esc(db.settings.libPlan)} · ${money(db.settings.libPrice)} per student per year. Your tutoring sessions are not affected.</div>${sub && new Date(sub.end) < Date.now() ? `<div style="color:#FEF3C7;font-weight:700">Your subscription ended on ${esc(fmtD(sub.end))}.</div>` : ''}</div>${s.libRequested ? '<span class="chip">Request sent to the academy</span>' : btn('Ask to subscribe', 'libRequest', { sid })}</div><div class="note small">Topics marked "Free preview" are open to you now.</div>`;
  }
  return page('SAT Library', sid ? 'Video lessons, study guides, practice and resources for every SAT topic' : 'Browse the library to assign topics to your students', '', head + outline(row));
}
function libAdminView() {
  const vids = db.libTopics.reduce((a, t) => a + t.items.filter(i => i.type === 'video').length, 0), vOk = db.libTopics.reduce((a, t) => a + t.items.filter(i => i.type === 'video' && i.url).length, 0);
  const nq = db.libTopics.reduce((a, t) => a + t.items.filter(i => i.type === 'practice').reduce((b, i) => b + i.questions.length, 0), 0);
  const row = t => { const v = t.items.filter(i => i.type === 'video'), missing = v.length && !v.some(i => i.url);
    return `<div class="li"><div class="grow"><a href="#/topic/${t.id}" class="t">${esc(t.title)}</a><div class="small muted">${esc(counts(t)) || 'Empty'}</div></div>${missing ? chip('Video missing', 'amber') : ''}${t.items.some(i => i.free) ? chip('Free preview', 'green') : ''}<a class="btn sm" href="#/topic/${t.id}">Open</a>${btn('Rename', 'editTopic', { id: t.id })}${btn('Delete', 'delTopic', { id: t.id }, 'danger')}</div>`; };
  return page('SAT Library', `${db.libTopics.length} topics · yearly subscription per student`, '<a class="btn" href="#/subs">Subscriptions</a>' + btn('Add topic', 'addTopic', {}, 'primary'),
    `<div class="grid g4">${stat('Topics', db.libTopics.length, 'Across Math, R&W and strategy')}${stat('Videos added', vOk + ' of ' + vids, 'Open a topic to add its video link')}${stat('Practice questions', nq, 'With explanations')}${stat('Active subscribers', db.students.filter(s => hasLib(s.id)).length, 'of ' + db.students.length + ' students')}</div>
<div class="note small">Add videos as links: an unlisted YouTube video, Vimeo, Google Drive (shared with "anyone with the link") or a direct .mp4 link. Students without a subscription see only items marked "Free preview".</div>` + outline(row));
}
function topicView(id) {
  const t = db.libTopics.find(x => x.id === id); if (!t) return page('Topic not found', '', '<a class="btn" href="#/library">Back to the library</a>', '');
  const admin = me.role === 'admin', sid = me.role === 'student' ? me.id : null, ts = sortedTopics(), k = ts.indexOf(t);
  if (sid && hasLib(sid) && libP(sid)._last !== t.id) { libP(sid)._last = t.id; save(); }
  const order = ['video', 'guide', 'practice', 'resource'], items = t.items.slice().sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  const nav = `<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">${k > 0 ? `<a class="btn" href="#/topic/${ts[k - 1].id}">← ${esc(ts[k - 1].title)}</a>` : '<span></span>'}${k < ts.length - 1 ? `<a class="btn" href="#/topic/${ts[k + 1].id}">${esc(ts[k + 1].title)} →</a>` : ''}</div>`;
  return page(t.title, `${t.section === 'Strategy' ? 'Test strategy' : t.section} › ${t.domain}`, '<a class="btn" href="#/library">All topics</a>' + (admin ? ['video', 'guide', 'practice', 'resource'].map(ty => btn('Add ' + TYPE_LABEL[ty].toLowerCase(), 'addItem', { tid: t.id, type: ty })).join('') : ''),
    (sid && hasLib(sid) ? card('', `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><b>Your progress on this topic</b>${miniBar(topicPct(sid, t))}</div>`) : '') +
    (items.map(it => itemCard(t, it, sid, admin)).join('') || card('', '<div class="muted">No materials yet.</div>')) + nav);
}
function itemCard(t, it, sid, admin) {
  const plain = it.title === TYPE_LABEL[it.type] || it.title === 'Practice set';
  const head = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${plain ? '' : chip(TYPE_LABEL[it.type], it.type === 'video' ? 'violet' : it.type === 'practice' ? 'blue' : it.type === 'resource' ? 'amber' : '')}${it.free ? chip('Free preview', 'green') : ''}${it.minutes ? `<span class="small muted">${it.minutes} min</span>` : ''}</div>`;
  const tools = admin ? btn('Edit', 'editItem', { id: it.id }) + btn('Delete', 'delItem', { id: it.id }, 'danger') : sid && it.type !== 'practice' && canSee(it) && (it.type !== 'video' || it.url) ? btn(itemDone(sid, it) ? 'Done ✓' : 'Mark as done', 'libDone', { id: it.id }, itemDone(sid, it) ? '' : 'primary') : '';
  let body;
  if (!canSee(it)) body = `<div class="warn">${LOCK}This ${TYPE_LABEL[it.type].toLowerCase()} is for SAT Library subscribers. <a href="#/library">See how to subscribe</a></div>`;
  else if (it.type === 'video') body = it.url ? embed(it.url, sid ? person('student', sid).name : '') : `<div style="height:180px;border-radius:12px;background:#F1F5F9;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:#475569"><b>${admin ? 'No video yet' : 'Video coming soon'}</b>${admin ? btn('Add the video link', 'editItem', { id: it.id }, 'primary') : '<span class="small">Use the study guide and practice below in the meantime.</span>'}</div>`;
  else if (it.type === 'guide') body = `<div style="max-width:760px;line-height:1.6">${md(it.body)}</div>`;
  else if (it.type === 'resource') body = `<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div class="muted">${esc(it.body || '')}</div><a class="btn sm primary" href="${esc(it.url)}" target="_blank" rel="noopener">Open resource</a></div>`;
  else body = practiceHtml(it, sid, admin);
  return `<div class="card"><div class="cardhead"><div style="display:flex;flex-direction:column;gap:6px"><h2>${esc(it.title)}</h2>${head}</div><div style="display:flex;gap:6px;flex-wrap:wrap">${tools}</div></div>${body}</div>`;
}
function practiceHtml(it, sid, admin) {
  const rec = sid ? (libP(sid)[it.id] || { answers: {} }) : null, n = it.questions.length, answered = rec ? Object.keys(rec.answers).length : 0;
  const qs = it.questions.map((q, qi) => {
    const a = rec ? rec.answers[qi] : (admin ? q.answer : undefined), shown = a != null;
    const choices = q.choices.map((c, ci) => { const right = ci === q.answer, picked = ci === a;
      const style = shown && right ? 'border-color:#059669;background:#D1FAE5' : shown && picked ? 'border-color:#DC2626;background:#FEE2E2' : '';
      return `<button type="button" class="choice" ${rec && !shown ? `data-act="libAns" data-id="${it.id}" data-q="${qi}" data-c="${ci}"` : 'disabled'} style="${style};${!rec || shown ? 'cursor:default' : ''}"><span class="letter">${'ABCD'[ci]}</span>${esc(c)}</button>`; }).join('');
    const fb = shown ? `<div class="${!rec || a === q.answer ? 'note' : 'warn'} small">${rec ? (a === q.answer ? '<b>Correct.</b> ' : `<b>Not quite.</b> The answer is ${'ABCD'[q.answer]}. `) : `<b>Answer: ${'ABCD'[q.answer]}.</b> `}${esc(q.explain || '')}</div>` : '';
    return `<div style="display:flex;flex-direction:column;gap:10px;padding:14px 0;border-top:1px solid #E2E8F0"><div><b>${qi + 1}.</b> ${esc(q.q)}</div><div style="display:flex;flex-direction:column;gap:8px">${choices}</div>${fb}</div>`;
  }).join('');
  const score = rec && answered === n ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><b>Score: ${rec.correct} of ${n}</b>${btn('Try again', 'libReset', { id: it.id })}</div>` : rec ? `<div class="small muted">${answered} of ${n} answered · pick an answer to see the explanation</div>` : '';
  return score + qs;
}
function subsView() {
  const now = Date.now(), act = db.students.filter(s => hasLib(s.id)), soon = act.filter(s => new Date(subOf(s.id).end) - now < 30 * D), req = db.students.filter(s => s.libRequested && !hasLib(s.id));
  const rows = db.students.map(s => { const sub = subOf(s.id), on = hasLib(s.id);
    const st = on ? chip('Active until ' + fmtD(sub.end), new Date(sub.end) - now < 30 * D ? 'amber' : 'green') : sub && new Date(sub.end) <= now ? chip('Expired ' + fmtD(sub.end), 'red') : sub ? chip('Starts ' + fmtD(sub.start), 'blue') : s.libRequested ? chip('Requested', 'amber') : chip('No subscription');
    return `<tr><td><a href="#/student/${s.id}"><b>${esc(s.name)}</b></a><div class="small muted">${esc((par(s.parentId) || {}).name || '')}</div></td><td>${st}</td><td class="num">${on ? libPct(s.id) + '%' : '—'}</td><td><div style="display:flex;gap:6px;flex-wrap:wrap">${on ? btn('Renew', 'sellSub', { sid: s.id }) + btn('Cancel', 'cancelSub', { id: sub.id }, 'danger') : btn('Activate', 'sellSub', { sid: s.id }, 'primary')}</div></td></tr>`; });
  return page('Library subscriptions', `${db.settings.libPlan} · ${money(db.settings.libPrice)} per student per year`, '<a class="btn" href="#/library">Manage content</a>' + btn('Activate a subscription', 'sellSub', {}, 'primary'),
    `<div class="grid g4">${stat('Active', act.length, 'of ' + db.students.length + ' students')}${stat('Ending in 30 days', soon.length, soon.map(s => s.name).join(', '))}${stat('Requests waiting', req.length, req.map(s => s.name).join(', '))}${stat('Subscription income', money(db.subscriptions.filter(x => x.status !== 'cancelled').reduce((a, x) => a + x.price, 0)), 'All time')}</div>
<div class="note small">The library is separate from tutoring: students without a subscription still book and attend sessions as usual. Change the plan name and price in Settings.</div>${card('Students', table(['Student', 'Status', '#Progress', ''], rows, 'No students yet.'))}`);
}
function libStatusLine(sid) { const sub = subOf(sid); return hasLib(sid) ? `Active until ${fmtD(sub.end)} · ${libPct(sid)}% complete` : sub && new Date(sub.end) <= Date.now() ? 'Expired ' + fmtD(sub.end) : 'Not subscribed'; }
function libStudentCard(sid) {
  const on = hasLib(sid);
  return card('SAT Library', on ? `<div class="muted">${esc(libStatusLine(sid))}</div>${['Math', 'Reading & Writing'].map(sec => bar(sec, libPct(sid, sec), libPct(sid, sec) + '%')).join('')}` : `<div class="muted">${esc(libStatusLine(sid))}${stu(sid).libRequested ? ' · subscription requested' : ''}</div>`, me.role === 'admin' ? btn(on ? 'Renew' : 'Activate', 'sellSub', { sid }, on ? '' : 'primary') : '');
}
function libRunDue() {
  const now = Date.now(); let n = 0;
  db.subscriptions.forEach(sub => {
    if (sub.status === 'cancelled' || subOf(sub.studentId) !== sub) return;
    const st = stu(sub.studentId); if (!st) return; sub.rem = sub.rem || {};
    const left = new Date(sub.end).getTime() - now;
    if (left > 0) { const k = [1, 7, 30].find(x => left <= x * D); if (k && !sub.rem[k]) { [1, 7, 30].filter(x => x >= k).forEach(x => sub.rem[x] = true); n++;
      notify('library_renewal', 'parent', st.parentId, `${st.name}'s SAT Library access ends ${fmtD(sub.end)}`, `${st.name}'s ${db.settings.libPlan} ends on ${fmtD(sub.end)}. Renew for ${money(db.settings.libPrice)} to keep access to every video, guide and practice set. Progress is kept.`); } }
    else if (!sub.rem.expired) { sub.rem.expired = true; n++;
      notify('library_expired', 'parent', st.parentId, `${st.name}'s SAT Library access has ended`, `${st.name}'s subscription ended on ${fmtD(sub.end)}. Tutoring sessions continue as usual. Renew any time; progress is kept.`);
      notify('library_expired', 'student', st.id, 'Your SAT Library access has ended', 'Ask your parent or the academy to renew. Your progress is saved.'); }
  });
  return n;
}

/* ---------- router ---------- */
function render() {
  clearInterval(timer);
  const app = $('#app');
  if (location.hash.startsWith('#/apply')) { app.innerHTML = applyView(); return; }
  delete mem.applied;
  if (!me) { app.innerHTML = loginView(); return; }
  if ((me.role !== 'admin') && !person(me.role, me.id).name) { me = null; ls.del(MEKEY); return render(); }
  const [r, arg] = location.hash.replace(/^#\//, '').split('/');
  const route = r || NAV[me.role][0][0], ok = v => shell(route, v);
  const V = {
    dashboard: () => me.role === 'admin' ? ok(dashboardView()) : null,
    students: () => me.role === 'admin' || me.role === 'tutor' ? ok(studentsView()) : null,
    student: () => me.role === 'admin' || me.role === 'tutor' ? shell('students', studentView(arg)) : null,
    tutors: () => me.role === 'admin' ? ok(tutorsView()) : null,
    sessions: () => ok(sessionsView()),
    book: () => me.role === 'admin' || me.role === 'tutor' ? ok(bookView()) : null,
    finance: () => me.role === 'admin' ? ok(financeView()) : null,
    family: () => me.role === 'admin' ? shell('finance', familyView(arg)) : null,
    billing: () => me.role === 'parent' ? ok(familyView(me.id)) : null,
    earnings: () => me.role === 'tutor' ? ok(earningsView()) : null,
    practice: () => me.role === 'admin' || me.role === 'tutor' ? ok(practiceView()) : null,
    messages: () => ok(messagesView()),
    settings: () => me.role === 'admin' ? ok(settingsView()) : null,
    library: () => me.role !== 'parent' ? ok(libraryView()) : null,
    topic: () => me.role !== 'parent' ? shell('library', topicView(arg)) : null,
    subs: () => me.role === 'admin' ? ok(subsView()) : null,
    hiring: () => me.role === 'admin' ? ok(hiringView()) : null,
    home: () => me.role === 'parent' ? ok(parentHome()) : me.role === 'student' ? ok(studentHome()) : null,
    freetime: () => me.role === 'parent' ? ok(freetimeView()) : null,
    mytests: () => me.role === 'student' ? ok(myTestsView()) : null,
    scores: () => me.role === 'student' ? ok(scoresView()) : null,
    take: () => me.role === 'student' ? takeView(arg) : null
  };
  const html = V[route] ? V[route]() : null;
  if (html == null) { location.hash = '#/' + NAV[me.role][0][0]; return; }
  app.innerHTML = html;
}

/* ---------- actions ---------- */
const A = {
  login(d) { me = { role: d.role, id: d.id || '' }; ls.set(MEKEY, JSON.stringify(me)); location.hash = '#/' + NAV[me.role][0][0]; runDue(); render(); },
  logout() { me = null; ls.del(MEKEY); location.hash = ''; render(); },
  addStudent() { modal('Add student', studentForm(), f => {
    let pid = f.parentId;
    if (!pid) { if (!f.pname) return 'Choose a parent or enter the new parent\'s name.'; pid = uid(); db.parents.push({ id: pid, name: f.pname.trim(), email: f.pemail, phone: f.pphone }); }
    db.students.push({ id: uid(), name: f.name.trim(), grade: f.grade, school: f.school, target: +f.target || null, testDate: f.testDate, mode: f.mode, status: 'active', parentId: pid, freeTime: {} });
    toast('Student added'); }); },
  editStudent(d) { const s = stu(d.id); modal('Edit student', studentForm(s), f => { Object.assign(s, { name: f.name.trim(), grade: f.grade, school: f.school, target: +f.target || null, testDate: f.testDate, mode: f.mode }); }); },
  delStudent(d) { const s = stu(d.id); modal('Delete ' + s.name + '?', '<div class="warn">This removes the student, their enrollments, sessions, scores and test results. Family payments stay in the ledger.</div>', () => {
    const eids = db.enrollments.filter(e => e.studentId === s.id).map(e => e.id);
    db.sessions = db.sessions.filter(x => !eids.includes(x.enrollmentId)); db.packages = db.packages.filter(x => !eids.includes(x.enrollmentId)); db.enrollments = db.enrollments.filter(e => e.studentId !== s.id);
    db.scores = db.scores.filter(x => x.studentId !== s.id); db.assignments = db.assignments.filter(x => x.studentId !== s.id); db.attempts = db.attempts.filter(x => x.studentId !== s.id); db.students = db.students.filter(x => x !== s);
    location.hash = '#/students'; }, 'Delete'); },
  editParent(d) { const p = par(d.id); modal('Edit parent', field('Name', 'name', 'text', p.name, 'required') + field('Email', 'email', 'email', p.email) + field('WhatsApp number (with country code)', 'phone', 'tel', p.phone), f => { Object.assign(p, { name: f.name.trim(), email: f.email, phone: f.phone }); }); },
  addEnr(d) { if (!db.tutors.length) return toast('Add a tutor first'); modal('Add enrollment', select('Tutor', 'tutorId', db.tutors.map(t => [t.id, t.name])) + select('Subject', 'subject', [['SAT Math', 'SAT Math'], ['SAT Reading & Writing', 'SAT Reading & Writing']]) + `<div class="grid g2" style="gap:12px"><div class="small muted">Standard: the academy keeps ${db.settings.commissionPct}% and the tutor receives ${100 - db.settings.commissionPct}% of the price, paid after each session.</div>${field('Price per session (parent pays)', 'price', 'number', db.settings.defaultPrice, 'min="0" step="0.5" required')}${field('Tutor share per session', 'tutorRate', 'number', share(db.settings.defaultPrice), 'min="0" step="0.5" required')}</div>`, f => {
    db.enrollments.push({ id: uid(), studentId: d.sid, tutorId: f.tutorId, subject: f.subject, price: +f.price, tutorRate: +f.tutorRate, active: true }); }); },
  endEnr(d) { enr(d.id).active = false; save(); render(); toast('Enrollment ended'); },
  sellPkg(d) { const e = enr(d.eid); modal('Sell a package', `<div class="muted">${esc(stu(e.studentId).name)} · ${esc(e.subject)}</div><div class="grid g2" style="gap:12px">${field('Sessions', 'total', 'number', 8, 'min="1" required')}${field('Package price', 'price', 'number', e.price * 8, 'min="0" step="0.5" required')}</div>`, f => buyPackage({ enrollmentId: e.id, total: f.total, price: f.price })); },
  addTutor() { modal('Add tutor', tutorForm({}), f => { db.tutors.push({ id: uid(), name: f.name.trim(), email: f.email, phone: f.phone, subjects: f.subjects, rate: +f.rate || 0 }); }); },
  editTutor(d) { const t = tut(d.id); modal('Edit tutor', tutorForm(t), f => { Object.assign(t, { name: f.name.trim(), email: f.email, phone: f.phone, subjects: f.subjects, rate: +f.rate || 0 }); }); },
  payout(d) { const t = tut(d.id), o = tutorOwed(t.id); modal('Record payout · ' + t.name, `<div class="muted">Currently owed: ${money(o)}</div>` + field('Amount', 'amount', 'number', Math.max(0, o).toFixed(2), 'min="0.01" step="0.01" required') + select('Method', 'method', ['Cash', 'Whish', 'OMT', 'Bank transfer'].map(x => [x, x])), f => { if (!(+f.amount > 0)) return 'Enter an amount.'; let left = +f.amount; dueEarnings().filter(e => e.tutorId === t.id).forEach(e => { if (left + 1e-9 >= e.amount) { left -= e.amount; e.payStatus = 'paid'; e.paidAt = new Date().toISOString(); e.payMethod = f.method; } }); addTutorLedger(t.id, 'payout', +f.amount, 'Payout · ' + f.method); }); },
  bonus(d) { const t = tut(d.id); modal('Bonus · ' + t.name, field('Amount', 'amount', 'number', 20, 'min="0.01" step="0.01" required') + field('Reason', 'reason', 'text', ''), f => { addTutorLedger(t.id, 'bonus', +f.amount, 'Bonus' + (f.reason ? ': ' + f.reason : '')); }); },
  pay(d) { if (!db.parents.length) return toast('Add a student and parent first'); modal('Record a payment', select('Family', 'parentId', db.parents.map(p => [p.id, `${p.name} · balance ${money(balance(p.id))}`]), d.pid) + `<div class="grid g2" style="gap:12px">${field('Amount (USD)', 'amount', 'number', d.pid && balance(d.pid) > 0 ? balance(d.pid).toFixed(2) : '', 'min="0.01" step="0.01" required')}${select('Method', 'method', ['Cash', 'Whish', 'OMT', 'Bank transfer'].map(x => [x, x]))}</div>` + field('Reference', 'ref', 'text', '') + field('Date', 'date', 'date', new Date().toISOString().slice(0, 10)), f => recordPayment(f)); },
  bookslot(d) { const r = bookSession({ enrollmentId: bookState.eid, start: d.start, duration: +bookState.duration, mode: bookState.mode }); if (typeof r === 'string') return toast(r); save(); render(); toast('Booked · confirmation created'); },
  bookany() { const v = $('#anytime').value; const r = bookSession({ enrollmentId: bookState.eid, start: v, duration: +bookState.duration, mode: bookState.mode }); if (typeof r === 'string') return toast(r); save(); render(); toast('Booked · confirmation created'); },
  log(d) { const s = by('sessions', d.id), e = sEnr(s), prev = db.sessions.filter(x => x.enrollmentId === e.id && x.status === 'completed').sort((a, b) => b.start.localeCompare(a.start))[0];
    modal(`Log session · ${stu(e.studentId).name}`, `<div class="muted">${esc(sessionLine(s))}</div>` + select('Attendance', 'attendance', [['present', 'Present'], ['late', 'Late'], ['noshow', 'Student no-show']]) +
      `<div class="field"><span style="font-size:13px;font-weight:600">Skills covered</span><div style="display:flex;gap:6px;flex-wrap:wrap">${SKILLS.map(k => `<label class="chip" style="cursor:pointer"><input type="checkbox" name="skills" value="${esc(k)}"> ${esc(k)}</label>`).join('')}</div></div>` +
      field('What you did', 'summary', 'textarea', '') + field('Homework for next session', 'homework', 'text', '') + (prev && prev.log.homework ? select(`Last homework: ${prev.log.homework}`, 'prevHw', [['Done', 'Done'], ['Partial', 'Partial'], ['Not done', 'Not done']]) : '') +
      field('Note for parents', 'parentNote', 'text', '') + field('Private note for admin', 'adminNote', 'text', '') + field('Cash collected in this session (USD)', 'cash', 'number', 0, 'min="0" step="0.5"'),
      f => { if (f.attendance !== 'noshow' && !String(f.summary).trim()) return 'Write a short summary of the session.'; f.skills = f.skills ? [].concat(f.skills) : []; return logSession(s.id, f); }, 'Save and send summary'); },
  cancel(d) { const s = by('sessions', d.id), late = me.role === 'parent' && new Date(s.start).getTime() - Date.now() < db.settings.lateHours * H;
    modal('Cancel this session?', `<div class="muted">${esc(sStu(s).name)} · ${esc(sessionLine(s))}</div>${late && db.settings.chargeLate ? `<div class="warn">This is inside ${db.settings.lateHours} hours, so the session will be charged.</div>` : ''}` + field('Reason', 'reason', 'text', ''), f => cancelSession(s.id, me.role, f.reason), 'Cancel session'); },
  resched(d) { const s = by('sessions', d.id), e = sEnr(s), fs = freeSlots(e, s.duration).slice(0, 24);
    modal('Reschedule', `<div class="muted">${esc(sStu(s).name)} · now ${esc(fmtDT(s.start))}</div>` + (fs.length ? select('Open slots in the free time', 'slot', [['', 'Choose a slot']].concat(fs.map(i => [i, fmtDT(i)]))) : '<div class="warn">No open slots in the free time for the next 14 days.</div>') + (me.role === 'parent' ? '' : field('Or any date and time', 'any', 'datetime-local', '')), f => reschedule(s.id, f.any || f.slot), 'Move session'); },
  summary(d) { const s = by('sessions', d.id), l = s.log; modal(`${sStu(s).name} · ${fmtD(s.start)}`, `<div class="muted">${esc(sessionLine(s))} · ${esc(sTut(s).name)}</div><div><b>Attendance:</b> ${esc(l.attendance)}</div><div><b>Skills:</b> ${esc(l.skills.join(', ') || '—')}</div><div class="pre"><b>Summary:</b> ${esc(l.summary || '—')}</div><div><b>Homework:</b> ${esc(l.homework || '—')}</div>${l.prevHw ? `<div><b>Previous homework:</b> ${esc(l.prevHw)}</div>` : ''}${l.parentNote ? `<div><b>Note for parents:</b> ${esc(l.parentNote)}</div>` : ''}${l.adminNote && (me.role === 'admin' || me.role === 'tutor') ? `<div class="warn"><b>Private note:</b> ${esc(l.adminNote)}</div>` : ''}`); },
  addScore(d) { modal('Add a score', select('Type', 'type', [['practice', 'Practice test'], ['diagnostic', 'Diagnostic'], ['official', 'Official SAT']]) + field('Test name', 'name', 'text', '') + `<div class="grid g2" style="gap:12px">${field('Math (200–800)', 'math', 'number', '', 'min="200" max="800" step="10" required')}${field('Reading & Writing (200–800)', 'rw', 'number', '', 'min="200" max="800" step="10" required')}</div>` + field('Date', 'date', 'date', new Date().toISOString().slice(0, 10)), f => { db.scores.push({ id: uid(), studentId: d.id, type: f.type, name: f.name, math: +f.math, rw: +f.rw, total: +f.math + +f.rw, date: new Date(f.date || Date.now()).toISOString() }); }); },
  assign(d) { const sts = myStudents(); if (!db.tests.length || !sts.length) return toast('You need at least one test and one student');
    modal('Assign a practice test', select('Test', 'testId', db.tests.map(t => [t.id, t.name]), d.tid) + select('Student', 'studentId', sts.map(s => [s.id, s.name]), d.sid) + field('Due date', 'due', 'date', new Date(Date.now() + 7 * D).toISOString().slice(0, 10)), f => {
      db.assignments.push({ id: uid(), testId: f.testId, studentId: f.studentId, due: f.due, status: 'assigned' }); const t = by('tests', f.testId);
      notify('practice_assigned', 'student', f.studentId, `New practice test: ${t.name}`, `${t.name} (${t.questions.length} questions, ${t.minutes} minutes) is due ${f.due}. Open Practice tests in your portal.`); }, 'Assign'); },
  unassign(d) { db.assignments = db.assignments.filter(a => a.id !== d.id); delete db.progress[d.id]; save(); render(); },
  review(d) { const a = by('attempts', d.id); modal(`${stu(a.studentId).name} · ${by('tests', a.testId).name}`, reviewHtml(a)); },
  previewTest(d) { const t = by('tests', d.id); modal(t.name, `<div class="list">${t.questions.map((q, i) => `<div class="li" style="align-items:flex-start"><span class="chip">${i + 1}</span><div class="grow"><div>${esc(q.q)}</div><div class="small muted">${q.choices.map((c, j) => (j === q.answer ? '<b>' : '') + 'ABCD'[j] + ') ' + esc(c) + (j === q.answer ? '</b>' : '')).join(' · ')} · ${esc(q.skill)}</div></div></div>`).join('')}</div>`); },
  delTest(d) { if (db.attempts.some(a => a.testId === d.id)) return toast('This test has results, so it is kept'); db.tests = db.tests.filter(t => t.id !== d.id); db.assignments = db.assignments.filter(a => a.testId !== d.id || a.status === 'done'); save(); render(); },
  newTest() { modal('New test', field('Test name', 'name', 'text', '', 'required') + `<div class="grid g2" style="gap:12px">${select('Section', 'section', [['Math', 'Math'], ['Reading & Writing', 'Reading & Writing']])}${field('Time limit (minutes)', 'minutes', 'number', 20, 'min="1" required')}</div>` +
    field('Questions (one block per question, blank line between)', 'text', 'textarea', 'Q: If 2x = 10, what is x?\nA) 2\nB) 5\nC) 8\nD) 20\nANSWER: B\nSKILL: Algebra', 'style="min-height:220px;font-family:ui-monospace,monospace"') + `<div class="small muted">SKILL must be one of: ${SKILLS.join(', ')}.</div>`, f => {
      const { qs, err } = parseQuestions(f.text, null); if (err) return err;
      db.tests.push({ id: uid(), name: f.name.trim(), section: f.section, minutes: +f.minutes, questions: qs }); }, 'Create test'); },
  answer(d) { const p = db.progress[d.aid]; p.answers[p.i] = +d.c; save(); render(); },
  flag(d) { const p = db.progress[d.aid]; p.flags[p.i] = !p.flags[p.i]; save(); render(); },
  goto(d) { db.progress[d.aid].i = +d.i; save(); render(); },
  finish(d) { const p = db.progress[d.aid], t = by('tests', by('assignments', d.aid).testId), miss = t.questions.length - Object.keys(p.answers).length;
    modal('Submit the test?', `<div>${miss ? `<div class="warn">${miss} question${miss > 1 ? 's are' : ' is'} unanswered.</div>` : 'All questions answered.'}</div><div class="muted">You cannot change answers after submitting.</div>`, () => { setTimeout(() => finishTest(d.aid), 0); }, 'Submit'); },
  hw(d) { const s = by('sessions', d.id); s.log.hwDone = !s.log.hwDone; save(); render(); },
  ft(d) { const s = stu(d.sid); if (me.role !== 'parent' || s.parentId !== me.id) return; s.freeTime[d.k] = !s.freeTime[d.k]; s.freeUpdated = new Date().toISOString(); save(); render(); },
  ftchild(d) { ftChild = d.id; render(); },
  rule(d) { const r = db.rules.find(x => x.id === d.id); r.on = !r.on; save(); render(); toast(r.name + (r.on ? ' turned on' : ' turned off')); },
  master() { db.settings.master = !db.settings.master; save(); render(); toast(db.settings.master ? 'Automations running' : 'All automations paused'); },
  setting(d) { db.settings[d.k] = !db.settings[d.k]; save(); render(); },
  manual() { const ppl = db.parents.map(p => ['parent:' + p.id, p.name + ' (parent)']).concat(db.tutors.map(t => ['tutor:' + t.id, t.name + ' (tutor)']), db.students.map(s => ['student:' + s.id, s.name + ' (student)']));
    if (!ppl.length) return toast('Add people first'); modal('Send a message', select('To', 'to', [['all:parents', 'All parents'], ['all:tutors', 'All tutors']].concat(ppl)) + field('Subject', 'subject', 'text', '', 'required') + field('Message', 'body', 'textarea', '', 'required'), f => {
      const [k, id] = f.to.split(':'); const list = k === 'all' ? (id === 'parents' ? db.parents.map(p => ['parent', p.id]) : db.tutors.map(t => ['tutor', t.id])) : [[k, id]];
      list.forEach(x => notify('manual', x[0], x[1], f.subject, f.body)); toast(list.length + ' message' + (list.length > 1 ? 's' : '') + ' created'); }, 'Create message'); },
  readMsg(d) { const m = db.messages.find(x => x.id === d.id), txt = encodeURIComponent(m.subject + '\n\n' + m.body), ph = String(m.phone || '').replace(/\D/g, '');
    modal(m.subject, `<div class="small muted">To ${esc(m.toName)} · ${esc(fmtDT(m.date))} · ${esc(m.rule)}</div><div class="pre" style="background:#F8FAFC;border-radius:12px;padding:14px">${esc(m.body)}</div>` + (me.role === 'admin' ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${m.email ? `<a class="btn sm primary" href="mailto:${esc(m.email)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}">Send by email</a>` : '<span class="small muted">No email saved for this person.</span>'}${ph ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${ph}?text=${txt}">Send by WhatsApp</a>` : '<span class="small muted">No WhatsApp number saved.</span>'}</div>` : '')); },
  addTopic() { modal('Add a topic', field('Topic title', 'title', 'text', '', 'required') + select('Skill area', 'domain', DOMAINS.map(d => [d, `${secOf(d) === 'Strategy' ? 'Strategy' : secOf(d)} · ${d}`])) + '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="starter" checked> Add empty video, guide and practice slots</label>', f => {
    if (!String(f.title).trim()) return 'Enter a title.';
    const t = { id: uid(), domain: f.domain, section: secOf(f.domain), title: f.title.trim(), order: Math.max(0, ...db.libTopics.map(x => x.order)) + 1, items: [] };
    if (f.starter) t.items.push({ id: uid(), type: 'video', title: 'Video lesson', url: '', minutes: 0, free: false });
    db.libTopics.push(t); setTimeout(() => { location.hash = '#/topic/' + t.id; }, 0); }, 'Add topic'); },
  editTopic(d) { const t = db.libTopics.find(x => x.id === d.id); modal('Edit topic', field('Topic title', 'title', 'text', t.title, 'required') + select('Skill area', 'domain', DOMAINS.map(x => [x, `${secOf(x) === 'Strategy' ? 'Strategy' : secOf(x)} · ${x}`]), t.domain) + field('Order (smaller comes first)', 'order', 'number', t.order), f => { t.title = f.title.trim(); t.domain = f.domain; t.section = secOf(f.domain); t.order = +f.order || 0; }); },
  delTopic(d) { const t = db.libTopics.find(x => x.id === d.id); modal('Delete "' + t.title + '"?', `<div class="warn">This removes the topic and its ${t.items.length} item${t.items.length === 1 ? '' : 's'}. Student progress on it is removed too.</div>`, () => { db.libTopics = db.libTopics.filter(x => x !== t); if (location.hash.includes(t.id)) location.hash = '#/library'; }, 'Delete'); },
  addItem(d) { const t = db.libTopics.find(x => x.id === d.tid); modal('Add ' + TYPE_LABEL[d.type].toLowerCase() + ' · ' + t.title, itemForm(d.type, null), f => saveItem(t, d.type, f, null), 'Add'); },
  editItem(d) { const { t, it } = findItem(d.id); modal('Edit ' + TYPE_LABEL[it.type].toLowerCase(), itemForm(it.type, it), f => saveItem(t, it.type, f, it)); },
  delItem(d) { const { t, it } = findItem(d.id); modal('Delete "' + it.title + '"?', '<div class="warn">Students lose access to this item and its progress.</div>', () => { t.items = t.items.filter(x => x !== it); Object.values(db.libProgress).forEach(p => delete p[it.id]); }, 'Delete'); },
  libDone(d) { const p = libP(me.id), r = p[d.id] = p[d.id] || {}; r.done = !r.done; save(); render(); if (r.done) toast('Marked as done'); },
  libAns(d) { const { it } = findItem(d.id); if (!canSee(it)) return; const p = libP(me.id), r = p[d.id] = p[d.id] || { answers: {} }; r.answers = r.answers || {};
    if (r.answers[d.q] != null) return; r.answers[d.q] = +d.c;
    if (Object.keys(r.answers).length === it.questions.length) { r.done = true; r.correct = it.questions.filter((q, i) => r.answers[i] === q.answer).length; r.date = new Date().toISOString(); }
    save(); render(); },
  libReset(d) { delete libP(me.id)[d.id]; save(); render(); },
  libRequest(d) { const s = stu(d.sid); if (!s || s.libRequested) return; s.libRequested = new Date().toISOString();
    notify('manual', 'admin', '', `SAT Library request: ${s.name}`, `${me.role === 'parent' ? person('parent', me.id).name + ' (parent)' : s.name + ' (student)'} asked to subscribe ${s.name} to the ${db.settings.libPlan} (${money(db.settings.libPrice)} per year). Activate it in Library subscriptions.`);
    save(); render(); toast('Request sent to the academy'); },
  sellSub(d) { if (!db.students.length) return toast('Add a student first');
    const cur = d.sid && subOf(d.sid), renew = cur && new Date(cur.end) > Date.now(), start = renew ? cur.end.slice(0, 10) : new Date().toISOString().slice(0, 10);
    modal(renew ? 'Renew library subscription' : 'Activate library subscription', select('Student', 'sid', db.students.map(s => [s.id, s.name + ' · ' + libStatusLine(s.id)]), d.sid) +
      `<div class="grid g2" style="gap:12px">${field('Start date', 'start', 'date', start, 'required')}${field('Price (USD)', 'price', 'number', db.settings.libPrice, 'min="0" step="1" required')}</div>` +
      select('Payment', 'method', [['', 'Not paid yet (add to the family balance)'], ['Cash', 'Paid now · Cash'], ['Whish', 'Paid now · Whish'], ['OMT', 'Paid now · OMT'], ['Bank transfer', 'Paid now · Bank transfer']]) +
      `<div class="small muted">Access lasts 12 months from the start date. Renewal reminders go to the parent 30, 7 and 1 days before it ends.</div>`, f => {
        const s = stu(f.sid), st = new Date(f.start + 'T00:00:00'); if (isNaN(st)) return 'Choose a start date.';
        const end = new Date(st.getTime() + 365 * D);
        db.subscriptions.push({ id: uid(), studentId: s.id, plan: db.settings.libPlan, price: +f.price, start: st.toISOString(), end: end.toISOString(), status: 'active' });
        addLedger(s.parentId, 'charge', +f.price, `${db.settings.libPlan}: ${s.name} (${fmtD(st.toISOString())} to ${fmtD(end.toISOString())})`);
        if (f.method && +f.price > 0) addLedger(s.parentId, 'payment', +f.price, 'Payment · library subscription', { method: f.method });
        delete s.libRequested;
        notify('library_welcome', 'parent', s.parentId, `${s.name} now has the SAT Library`, `${s.name}'s ${db.settings.libPlan} is active from ${fmtD(st.toISOString())} to ${fmtD(end.toISOString())}.\nIt includes video lessons, study guides, practice with explanations and resources for every SAT topic. ${s.name} can open it from SAT Library in the student portal.${f.method ? `\nPayment received: ${money(+f.price)} by ${f.method}.` : `\n${money(+f.price)} has been added to your balance.`}`);
        notify('library_welcome', 'student', s.id, 'Your SAT Library is open', `You now have the full SAT Library until ${fmtD(end.toISOString())}. Open SAT Library in your portal; the "Recommended for you" list starts with your weakest skills.`);
        toast(renew ? 'Subscription renewed' : 'Subscription activated'); }, renew ? 'Renew' : 'Activate'); },
  cancelSub(d) { const sub = by('subscriptions', d.id), s = stu(sub.studentId);
    modal('Cancel ' + s.name + "'s subscription?", `<div class="warn">Library access stops now. Progress is kept if they subscribe again.</div>` + field('Credit back to the family balance (USD)', 'credit', 'number', 0, 'min="0" step="1"'), f => {
      sub.status = 'cancelled'; sub.end = new Date().toISOString();
      if (+f.credit > 0) addLedger(s.parentId, 'credit', +f.credit, `Credit: cancelled library subscription · ${s.name}`); }, 'Cancel subscription'); },
  stage(d) { const a = app_(d.id); setStage(a, d.to); save(); render(); toast(a.name + ' moved to ' + STAGES.find(x => x[0] === d.to)[1]); },
  demo(d) { const a = app_(d.id); modal('Book a demo lesson · ' + a.name, '<div class="muted">The applicant teaches a short sample lesson to you or a senior tutor.</div>' + field('Date and time', 'at', 'datetime-local', '', 'required') + field('Topic for the demo', 'topic', 'text', a.subjects.includes('SAT Math') ? 'Systems of linear equations' : 'Transitions and boundaries'), f => {
    if (!f.at) return 'Choose a date and time.'; setStage(a, 'demo', { demoAt: new Date(f.at).toISOString(), demoTopic: f.topic });
    notify('manual', 'applicant', a.id, 'Your demo lesson at ' + db.settings.academy, `Hi ${a.name.split(' ')[0]},\n\nYour demo lesson is booked for ${fmtDT(a.demoAt)}. Topic: ${f.topic}. Plan about 15 minutes as if teaching a real student.`); }, 'Book demo'); },
  demoPass(d) { const a = app_(d.id); modal('Demo lesson result · ' + a.name, select('Rating', 'rating', [[5, '5 · Excellent'], [4, '4 · Good'], [3, '3 · Acceptable']]) + field('Notes', 'notes', 'textarea', a.notes || '') + '<div class="small muted">Saving sends the contractor agreement to the applicant.</div>', f => {
    setStage(a, 'offer', { demoRating: +f.rating, notes: f.notes, offerAt: new Date().toISOString() });
    notify('manual', 'applicant', a.id, 'Your tutor agreement from ' + db.settings.academy, `Hi ${a.name.split(' ')[0]},\n\nCongratulations, you passed the demo lesson. We are offering you an independent tutor agreement:\n- Paid after each completed session\n- You keep ${100 - db.settings.commissionPct}% of the session price (${money(share(db.settings.defaultPrice))} at the standard ${money(db.settings.defaultPrice)})\n- You choose your weekly hours\n\nReply to confirm and we will send the full agreement to sign.`); }, 'Save and send contract'); },
  contract(d) { const a = app_(d.id); modal('Contractor agreement · ' + a.name, contractHtml(a.name) + '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="signed" required> The tutor has signed the agreement</label>', f => {
    const t = hireApplicant(a); notify('manual', 'tutor', t.id, 'Welcome to ' + db.settings.academy, `Welcome, ${t.name.split(' ')[0]}! Your tutor account is ready. Set your weekly availability, and you will see your students as they are assigned. You are paid after each session you log.`);
    toast(a.name + ' hired · tutor account created'); }, 'Mark as signed and create tutor'); },
  openApp(d) { const a = app_(d.id); const row = (k, v) => `<div class="li"><div style="width:170px" class="small muted">${k}</div><div class="grow">${v}</div></div>`;
    modal(a.name, `<div class="list">${row('University', esc(a.university + ' · ' + a.major + ' · ' + a.year))}${row('SAT', `<b>${a.satTotal}</b> (Math ${a.satMath}, R&amp;W ${a.satRW}) · taken ${esc(a.satDate || '—')}${a.proof ? ` · <a href="${esc(a.proof)}" target="_blank" rel="noopener">score report</a>` : ''}`)}${row('Teaches', esc(a.subjects.join(', ')))}${row('Availability', esc(a.hours + ' h/week · ' + a.mode))}${row('Contact', esc(a.email + (a.phone ? ' · ' + a.phone : '')))}${row('Stage', esc((STAGES.find(x => x[0] === a.status) || ['', a.status === 'rejected' ? 'Not selected' : a.status])[1]))}${a.demoAt ? row('Demo lesson', esc(fmtDT(a.demoAt) + (a.demoTopic ? ' · ' + a.demoTopic : '') + (a.demoRating ? ' · rated ' + a.demoRating + '/5' : ''))) : ''}${row('History', a.history.map(h => esc((STAGES.find(x => x[0] === h.status) || ['', h.status])[1] + ' ' + fmtD(h.at))).join(' → '))}</div>${a.why ? `<div><div class="label">WHY THEY WANT TO TUTOR</div><div>${esc(a.why)}</div></div>` : ''}` + field('Notes', 'notes', 'textarea', a.notes || ''), f => { a.notes = f.notes; }, 'Save notes'); },
  rejectApp(d) { const a = app_(d.id); modal('Not select ' + a.name + '?', field('Reason (kept private)', 'reason', 'text', '') + '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="tell" checked> Send a polite message to the applicant</label>', f => {
    setStage(a, 'rejected', { rejectReason: f.reason });
    if (f.tell) notify('manual', 'applicant', a.id, 'Your application to ' + db.settings.academy, `Hi ${a.name.split(' ')[0]},\n\nThank you for applying. We will not move forward right now, but you are welcome to apply again in the future.`); }, 'Confirm'); },
  payNow(d) { const e = db.tutorLedger.find(l => l.id === d.id); modal('Pay ' + (tut(e.tutorId) || {}).name, `<div class="muted">${esc(e.desc)}</div><div class="big">${money(e.amount)}</div>` + select('Method', 'method', ['Whish', 'OMT', 'Cash', 'Bank transfer'].map(x => [x, x])), f => payEarning(e.id, f.method), 'Record payout'); },
  export() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' })); a.download = 'amro-academy-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); toast('Backup downloaded'); },
  reseed() { modal('Load demo data?', '<div class="warn">This replaces everything in this browser with the demo data.</div>', () => { seed(); }, 'Replace'); },
  wipe() { modal('Erase everything?', '<div class="warn">All students, sessions, payments and messages in this browser are deleted. Download a backup first if you need one.</div>', () => { const s = db.settings, lib = db.libTopics; db = blank(); db.libTopics = lib; db.libSeeded = true; db.settings.academy = s.academy; db.settings.adminName = s.adminName; db.settings.adminEmail = s.adminEmail; }, 'Erase'); }
};
function itemForm(type, it) {
  it = it || {};
  let b = field('Title', 'title', 'text', it.title || { video: 'Video lesson', guide: 'Study guide', practice: 'Practice set', resource: '' }[type], 'required');
  if (type === 'video') b += field('Video link: unlisted YouTube, Vimeo, Google Drive (anyone with the link) or a direct .mp4', 'url', 'url', it.url || '', 'placeholder="https://"') + field('Length (minutes)', 'minutes', 'number', it.minutes || '', 'min="0"') + (it.url ? '<div class="small muted">Preview</div>' + embed(it.url) : '');
  if (type === 'guide') b += field('Guide text: # for a heading, - for a bullet point, **bold** for bold', 'body', 'textarea', it.body || '', 'style="min-height:280px"');
  if (type === 'practice') b += field('Questions (leave a blank line between questions; EXPLAIN is shown after the student answers)', 'text', 'textarea', it.questions ? qText(it.questions) : 'Q: If 2x = 10, what is x?\nA) 2\nB) 5\nC) 8\nD) 20\nANSWER: B\nEXPLAIN: Divide both sides by 2.', 'style="min-height:280px;font-family:ui-monospace,monospace"');
  if (type === 'resource') b += field('Link (PDF, worksheet, website)', 'url', 'url', it.url || '', 'required placeholder="https://"') + field('Description', 'body', 'text', it.body || '');
  return b + `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="free" ${it.free ? 'checked' : ''}> Free preview: students without a subscription can open this item</label>`;
}
function saveItem(t, type, f, it) {
  const o = { title: String(f.title).trim(), free: !!f.free };
  if (!o.title) return 'Enter a title.';
  if (type === 'video') { if (f.url && !/^https?:\/\//i.test(f.url)) return 'The link must start with https://'; o.url = String(f.url || '').trim(); o.minutes = +f.minutes || 0; }
  if (type === 'guide') { if (!String(f.body).trim()) return 'Write the guide text.'; o.body = f.body; }
  if (type === 'practice') { const r = parseQuestions(f.text, t.domain); if (r.err) return r.err; o.questions = r.qs; if (it) Object.values(db.libProgress).forEach(p => delete p[it.id]); }
  if (type === 'resource') { if (!/^https?:\/\//i.test(f.url || '')) return 'The link must start with https://'; o.url = f.url.trim(); o.body = f.body; }
  if (it) Object.assign(it, o); else t.items.push(Object.assign({ id: uid(), type }, o));
  toast(it ? 'Saved' : 'Added');
}
function tutorForm(t) { return field('Name', 'name', 'text', t.name, 'required') + field('Email', 'email', 'email', t.email) + field('WhatsApp number (with country code)', 'phone', 'tel', t.phone) + field('Subjects', 'subjects', 'text', t.subjects || 'SAT Math') + field('Default pay per session', 'rate', 'number', t.rate ?? 25, 'min="0" step="0.5"'); }

/* ---------- wiring ---------- */
document.addEventListener('click', ev => { const el = ev.target.closest('[data-act]'); if (!el) return; const fn = A[el.dataset.act]; if (fn) fn(el.dataset); });
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.closest('#bookform')) { bookState[t.name] = t.value; render(); }
  if (t.id === 'importfile' && t.files[0]) { const fr = new FileReader(); fr.onload = () => { try { const o = JSON.parse(fr.result); if (!o.settings || !Array.isArray(o.students)) throw 0; db = Object.assign(blank(), o); save(); render(); toast('Backup restored'); } catch (e) { toast('That file is not an Amro Academy backup'); } }; fr.readAsText(t.files[0]); }
});
document.addEventListener('submit', ev => {
  if (ev.target.id === 'applyform') { ev.preventDefault(); const fd = new FormData(ev.target), o = {}; fd.forEach((v, k) => { o[k] = k in o ? [].concat(o[k], v) : v; });
    const r = submitApplication(o); if (typeof r === 'string') { $('#applyerr').innerHTML = `<div class="err">${esc(r)}</div>`; $('#applyerr').scrollIntoView({ block: 'center' }); return; }
    save(); mem.applied = r.name.split(' ')[0]; render(); window.scrollTo(0, 0); return; }
  if (ev.target.id === 'setform') { ev.preventDefault(); const fd = new FormData(ev.target); ['academy', 'adminName', 'adminEmail'].forEach(k => db.settings[k] = fd.get(k)); db.settings.lateHours = +fd.get('lateHours') || 0; db.settings.libPlan = fd.get('libPlan') || db.settings.libPlan; db.settings.libPrice = Math.max(0, +fd.get('libPrice') || 0); db.settings.minSat = Math.min(1600, Math.max(400, +fd.get('minSat') || 1450)); db.settings.commissionPct = Math.min(90, Math.max(0, +fd.get('commissionPct') || 0)); db.settings.defaultPrice = Math.max(0, +fd.get('defaultPrice') || 0); db.settings.noShowTutorPct = Math.min(100, Math.max(0, +fd.get('noShowTutorPct') || 0)); save(); render(); toast('Settings saved'); } });
window.addEventListener('hashchange', render);

try { db = JSON.parse(ls.get(KEY)); } catch (e) { db = null; }
if (!db || !db.settings) seed(); else {
  const b = blank(); db = Object.assign(b, db); db.settings = Object.assign(blank().settings, db.settings);
  blank().rules.forEach(r => { if (!db.rules.find(x => x.id === r.id)) db.rules.push(r); });
  if (!db.libSeeded) { seedLibrary(); }
  db.tutorLedger.forEach(l => { if (l.type === 'earning' && !l.payStatus) l.payStatus = 'paid'; });
  save();
}
try { me = JSON.parse(ls.get(MEKEY)); } catch (e) { me = null; }
if (me) runDue();
render();
window.__amro = { get db() { return db; } };
})();
