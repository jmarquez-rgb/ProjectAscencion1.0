/* Project Ascencion 2.0
 * Static, offline-first training + fuel tracker. All data lives in this browser (localStorage).
 * No server, no account, no cloud sync. Use Data > Export backup to keep a copy.
 */
(function (global) {
'use strict';

/* ============================== constants ============================== */
const STORE_KEY = 'projectAscencion2.v1';
const PREIMPORT_KEY = 'projectAscencion2.preImportBackup';
const CORRUPT_KEY = 'projectAscencion2.corruptCopy';
const SCHEMA = 1;
const APP_ID = 'project-ascencion';
const DAY = 86400000;
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MUSCLES = [
  { id: 'chest', label: 'Chest', rec: 72, target: 10 },
  { id: 'back', label: 'Back', rec: 72, target: 12 },
  { id: 'shoulders', label: 'Shoulders', rec: 48, target: 10 },
  { id: 'biceps', label: 'Biceps', rec: 48, target: 8 },
  { id: 'triceps', label: 'Triceps', rec: 48, target: 8 },
  { id: 'quads', label: 'Quads', rec: 72, target: 10 },
  { id: 'hamstrings', label: 'Hamstrings', rec: 72, target: 8 },
  { id: 'glutes', label: 'Glutes', rec: 72, target: 6 },
  { id: 'calves', label: 'Calves', rec: 48, target: 8 },
  { id: 'core', label: 'Core', rec: 48, target: 6 }
];
const MUSCLE_BY_ID = {};
MUSCLES.forEach(function (m, i) { m.order = i; MUSCLE_BY_ID[m.id] = m; });

const ARCHETYPES = [
  { id: 'push', label: 'Push', sub: 'Chest, shoulders, triceps', muscles: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', label: 'Pull', sub: 'Back and biceps', muscles: ['back', 'biceps'] },
  { id: 'legs', label: 'Legs', sub: 'Quads, hamstrings, glutes, calves', muscles: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'quadcalf', label: 'Quads and calves', sub: 'Front-of-leg focus', muscles: ['quads', 'calves', 'core'] },
  { id: 'posterior', label: 'Hamstrings and glutes', sub: 'Back-of-leg focus', muscles: ['hamstrings', 'glutes', 'calves'] },
  { id: 'chestback', label: 'Chest and back', sub: 'Torso day', muscles: ['chest', 'back', 'core'] },
  { id: 'delts_arms', label: 'Shoulders and arms', sub: 'Shoulders, biceps, triceps', muscles: ['shoulders', 'biceps', 'triceps'] }
];

// Pain areas and which muscle groups they affect
const PAIN_AREAS = [
  { id: 'neck', label: 'Neck', muscles: ['shoulders'] },
  { id: 'shoulder', label: 'Shoulder', muscles: ['chest', 'shoulders', 'triceps', 'back'] },
  { id: 'elbow', label: 'Elbow', muscles: ['biceps', 'triceps'] },
  { id: 'wrist', label: 'Wrist or hand', muscles: ['biceps', 'triceps', 'chest', 'shoulders'] },
  { id: 'upperback', label: 'Upper back', muscles: ['back', 'shoulders'] },
  { id: 'lowerback', label: 'Lower back', muscles: ['back', 'hamstrings', 'glutes', 'core', 'quads'] },
  { id: 'hip', label: 'Hip', muscles: ['glutes', 'quads', 'hamstrings'] },
  { id: 'knee', label: 'Knee', muscles: ['quads', 'hamstrings', 'calves', 'glutes'] },
  { id: 'ankle', label: 'Ankle or foot', muscles: ['calves', 'quads'] }
];

/* id, name, muscle, type, heavy, repLo, repHi, loadStep, sets, role, angle, cue */
const EX_ROWS = [
  ['incline_db_press', 'Incline dumbbell press (30 degrees)', 'chest', 'compound', false, 8, 12, 5, 3, 'anchor', 'Upper chest', 'Bench near 30 degrees. Elbows 45-60 degrees from the torso, lower for 3 seconds to a deep but comfortable stretch, press up and slightly in.'],
  ['machine_chest_press', 'Machine chest press', 'chest', 'machine', false, 8, 12, 5, 3, 'anchor', 'Mid chest', 'Handles at mid-chest height. Shoulder blades back and down, slow 3-second return, no bouncing.'],
  ['cable_fly_low_high', 'Low-to-high cable fly', 'chest', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Upper chest', 'Cables low, arc up to chin height. Soft elbows, as if hugging a tree, 1-second squeeze.'],
  ['pec_deck', 'Pec deck fly', 'chest', 'machine', false, 10, 15, 5, 3, 'angle', 'Mid chest', 'Chest tall, elbows at or just below shoulder height. Stop before the stretch gets sharp in the shoulder.'],
  ['cable_fly_high_low', 'High-to-low cable fly', 'chest', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Lower chest', 'Cables high, sweep down toward the hips with soft elbows. Squeeze low chest, control the way back.'],
  ['bb_bench', 'Barbell bench press', 'chest', 'compound', true, 6, 10, 5, 3, 'optional', 'Mid chest', 'Use safeties or a spotter. Keep 2+ reps in reserve. Lower for 2-3 seconds to the lower chest.'],

  ['lat_pulldown', 'Lat pulldown', 'back', 'machine', false, 8, 12, 5, 3, 'anchor', 'Lats', 'Lean back slightly, drive elbows toward your back pockets, pause with ribs up, 3 seconds back up.'],
  ['chest_supported_row', 'Chest-supported row', 'back', 'machine', false, 8, 12, 5, 3, 'anchor', 'Mid back', 'Chest on the pad so the lower back stays quiet. Pull elbows back, squeeze 1 second, slow return.'],
  ['seated_cable_row', 'Seated cable row', 'back', 'machine', false, 8, 12, 5, 3, 'angle', 'Mid back and lats', 'Tall torso, no rocking. Elbows close to bias lats, wider to bias upper back. Full stretch each rep.'],
  ['one_arm_db_row', 'One-arm dumbbell row', 'back', 'compound', false, 8, 12, 5, 3, 'angle', 'Lats', 'Hand on a bench, flat back. Pull the elbow toward the hip, pause at the top, lower for 3 seconds.'],
  ['straight_arm_pd', 'Straight-arm cable pulldown', 'back', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Lats (stretch)', 'Slight hip hinge, arms nearly straight, sweep the bar to your thighs with your lats, slow return to full stretch.'],
  ['bb_row', 'Barbell row', 'back', 'compound', true, 6, 10, 5, 3, 'optional', 'Mid back', 'Neutral spine, brace hard. Stop 2+ reps short of any form change. Skip on days your lower back feels off.'],

  ['machine_shoulder_press', 'Machine shoulder press', 'shoulders', 'machine', false, 8, 12, 5, 3, 'anchor', 'Front and side delts', 'Seat so the handles start near ear height. Press without shrugging, slow 3-second lowering.'],
  ['seated_db_press', 'Seated dumbbell shoulder press', 'shoulders', 'compound', false, 8, 12, 5, 3, 'angle', 'Front and side delts', 'Back supported, stop just before lockout, lower for 3 seconds.'],
  ['cable_lateral', 'Cable lateral raise', 'shoulders', 'isolation', false, 12, 20, 2.5, 3, 'anchor', 'Side delts', 'Lead with the elbow, raise to shoulder height, pause a beat, control the way down.'],
  ['db_lateral', 'Dumbbell lateral raise', 'shoulders', 'isolation', false, 12, 20, 2.5, 3, 'angle', 'Side delts', 'Slight forward lean, pour-the-pitcher cue, no swinging.'],
  ['reverse_pec_deck', 'Reverse pec deck', 'shoulders', 'isolation', false, 12, 20, 5, 3, 'angle', 'Rear delts', 'Chest on the pad, sweep wide with the elbows, do not shrug.'],
  ['face_pull', 'Face pull', 'shoulders', 'isolation', false, 12, 20, 2.5, 3, 'angle', 'Rear delts and upper back', 'Rope to forehead height, pull apart, thumbs back, squeeze 1 second.'],

  ['incline_db_curl', 'Incline dumbbell curl', 'biceps', 'isolation', false, 8, 12, 2.5, 3, 'anchor', 'Long head (stretch)', 'Bench at 45-60 degrees, arms hang behind the torso. Curl without swinging, lower for 3 seconds.'],
  ['machine_preacher', 'Machine preacher curl', 'biceps', 'machine', false, 8, 12, 5, 3, 'anchor', 'Short head', 'Armpits snug on the pad, full range, control the bottom stretch.'],
  ['cable_curl', 'Cable curl', 'biceps', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Peak squeeze', 'Elbows pinned, squeeze hard at the top for 1 second.'],
  ['hammer_curl', 'Hammer curl', 'biceps', 'isolation', false, 8, 12, 2.5, 3, 'angle', 'Brachialis', 'Neutral grip, elbows still, slow lowering.'],

  ['cable_pushdown', 'Cable pushdown', 'triceps', 'isolation', false, 10, 15, 2.5, 3, 'anchor', 'Lateral head', 'Elbows pinned, full lockout squeeze, controlled return to about 90 degrees.'],
  ['oh_cable_ext', 'Overhead cable extension', 'triceps', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Long head (stretch)', 'Elbows high and close, deep stretch behind the head, extend fully.'],
  ['machine_tri_ext', 'Machine triceps extension', 'triceps', 'machine', false, 8, 12, 5, 3, 'angle', 'All heads', 'Elbows aligned with the pivot, smooth tempo, no shoulder roll.'],
  ['single_pushdown', 'Single-arm cable pushdown', 'triceps', 'isolation', false, 10, 15, 2.5, 3, 'angle', 'Lateral head', 'One arm at a time, shoulder still, finish with a hard squeeze.'],

  ['leg_press', 'Leg press', 'quads', 'machine', true, 8, 12, 10, 3, 'anchor', 'Quads', 'Feet mid-low on the platform, knees track over toes, no bouncing at the bottom. Leave 2+ reps in reserve.'],
  ['hack_squat', 'Hack squat machine', 'quads', 'machine', true, 6, 10, 10, 3, 'anchor', 'Quads', 'Feet low and forward to bias quads, controlled depth, leave 2+ reps in reserve.'],
  ['leg_extension', 'Leg extension', 'quads', 'machine', false, 10, 15, 5, 3, 'angle', 'Quads (rectus femoris)', 'Seat back to stretch the quad, pause 1 second at the top, 3-second lowering.'],
  ['goblet_squat', 'Goblet squat', 'quads', 'compound', false, 8, 12, 5, 3, 'angle', 'Quads', 'Dumbbell at the chest, elbows inside the knees, tall chest, controlled depth.'],
  ['back_squat', 'Barbell back squat', 'quads', 'compound', true, 5, 8, 5, 3, 'optional', 'Quads and glutes', 'Use safeties, brace, stop 2+ reps short of any form change.'],

  ['seated_leg_curl', 'Seated leg curl', 'hamstrings', 'machine', false, 8, 12, 5, 3, 'anchor', 'Hamstrings', 'Hips pinned, curl under, pause 1 second, 3-second return.'],
  ['lying_leg_curl', 'Lying leg curl', 'hamstrings', 'machine', false, 8, 12, 5, 3, 'angle', 'Hamstrings', 'Hips pressed down, no hip lift, slow return.'],
  ['back_ext_45', '45-degree back extension', 'hamstrings', 'compound', false, 10, 15, 5, 3, 'angle', 'Hamstrings and glutes', 'Straight spine, hinge at the hips, squeeze glutes at the top.'],
  ['rdl', 'Romanian deadlift', 'hamstrings', 'compound', true, 6, 10, 5, 3, 'optional', 'Hamstrings and glutes', 'Hinge with a neutral spine, bar close. Stop where the hamstrings stretch, leave 2+ reps in reserve.'],

  ['hip_thrust', 'Hip thrust (machine or barbell)', 'glutes', 'compound', true, 8, 12, 10, 3, 'anchor', 'Glutes', 'Chin tucked, ribs down, pause at the top, leave 2+ reps in reserve.'],
  ['cable_kickback', 'Cable glute kickback', 'glutes', 'isolation', false, 12, 15, 2.5, 3, 'angle', 'Glutes', 'Slight forward lean, kick back not up, squeeze 1 second.'],
  ['hip_abduction', 'Hip abduction machine', 'glutes', 'machine', false, 12, 20, 5, 3, 'angle', 'Upper glutes', 'Lean forward slightly, control the return.'],

  ['standing_calf', 'Standing calf raise', 'calves', 'machine', false, 10, 15, 10, 3, 'anchor', 'Gastrocnemius', 'Full stretch at the bottom (1 second), full height at the top, no bouncing.'],
  ['seated_calf', 'Seated calf raise', 'calves', 'machine', false, 12, 20, 5, 3, 'angle', 'Soleus', 'Slow reps with a pause in the stretch.'],

  ['cable_crunch', 'Cable crunch', 'core', 'isolation', false, 10, 15, 5, 3, 'anchor', 'Abs', 'Round the spine toward the hips, exhale at the bottom, keep the hips still.'],
  ['machine_crunch', 'Machine crunch', 'core', 'machine', false, 10, 15, 5, 3, 'angle', 'Abs', 'Curl the ribs toward the hips, control the return.'],
  ['pallof_press', 'Pallof press (per side)', 'core', 'isolation', false, 10, 12, 2.5, 3, 'angle', 'Anti-rotation', 'Resist the twist, press and hold 1 second.']
];
const BASE_EXERCISES = EX_ROWS.map(function (r) {
  return { id: r[0], name: r[1], muscle: r[2], type: r[3], heavy: r[4], lo: r[5], hi: r[6], inc: r[7], sets: r[8], role: r[9], angle: r[10], cue: r[11], builtin: true };
});

/* ============================== utils ============================== */
function uid() { return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function pad(n) { return n < 10 ? '0' + n : '' + n; }
function dateStr(ms) { const d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parseDate(s) { const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0).getTime(); }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / DAY); }
function addDays(s, n) { return dateStr(parseDate(s) + n * DAY); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function num(v) { if (v === '' || v == null) return null; const n = parseFloat(v); return isFinite(n) ? n : null; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function round1(n) { return Math.round(n * 10) / 10; }
function roundTo(n, step) { return Math.round(n / step) * step; }
function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
function fmtDate(s) { return new Date(parseDate(s)).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function fmtDateLong(s) { return new Date(parseDate(s)).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
function fmtLoad(n) { return n == null ? '-' : (Math.round(n * 100) / 100).toString(); }
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }

/* ============================== default data ============================== */
function defaultFoods() {
  const note = 'Starter estimate. Edit to match your brand or label.';
  return [
    { id: 'f_steak', name: 'Steak (lean cut, cooked)', serving: '6 oz', cal: 330, p: 48, c: 0, f: 14, note: note },
    { id: 'f_chicken', name: 'Chicken breast (cooked)', serving: '6 oz', cal: 280, p: 52, c: 0, f: 6, note: note },
    { id: 'f_turkey', name: 'Ground turkey 93% (cooked)', serving: '6 oz', cal: 300, p: 37, c: 0, f: 16, note: note },
    { id: 'f_eggs', name: 'Eggs (large)', serving: '1 egg', cal: 70, p: 6, c: 0.5, f: 5, note: note },
    { id: 'f_sweetpotato', name: 'Sweet potato (baked)', serving: '1 medium', cal: 110, p: 2, c: 26, f: 0, note: note },
    { id: 'f_rice', name: 'Jasmine rice (cooked)', serving: '1 cup', cal: 205, p: 4, c: 45, f: 0.5, note: note },
    { id: 'f_beans', name: 'Black beans (cooked)', serving: '1/2 cup', cal: 115, p: 8, c: 20, f: 0.5, note: note },
    { id: 'f_veg', name: 'Mixed vegetables (broccoli, green beans, zucchini)', serving: '1 cup', cal: 50, p: 3, c: 10, f: 0.5, note: note },
    { id: 'f_kodiak', name: 'Kodiak pancakes (mix + water)', serving: '1/2 cup mix', cal: 190, p: 14, c: 35, f: 3, note: 'Check your Kodiak box; flavors differ.' },
    { id: 'f_shake', name: 'Protein shake (1 scoop whey + water)', serving: '1 scoop', cal: 120, p: 24, c: 3, f: 1.5, note: 'Check your protein tub label.' },
    { id: 'f_oil', name: 'Olive oil', serving: '1 tsp', cal: 40, p: 0, c: 0, f: 4.5, note: note }
  ];
}
function defaultTemplates() {
  return [
    { id: 't1', name: 'Steak, rice and vegetables', items: [{ foodId: 'f_steak', qty: 1 }, { foodId: 'f_rice', qty: 1 }, { foodId: 'f_veg', qty: 1 }] },
    { id: 't2', name: 'Chicken, sweet potato and vegetables', items: [{ foodId: 'f_chicken', qty: 1 }, { foodId: 'f_sweetpotato', qty: 1 }, { foodId: 'f_veg', qty: 1 }] },
    { id: 't3', name: 'Eggs and Kodiak pancakes', items: [{ foodId: 'f_eggs', qty: 3 }, { foodId: 'f_kodiak', qty: 1 }] },
    { id: 't4', name: 'Turkey, beans and rice bowl', items: [{ foodId: 'f_turkey', qty: 1 }, { foodId: 'f_beans', qty: 1 }, { foodId: 'f_rice', qty: 1 }, { foodId: 'f_veg', qty: 1 }] },
    { id: 't5', name: 'Protein shake', items: [{ foodId: 'f_shake', qty: 1 }] }
  ];
}
function defaultState() {
  return {
    app: APP_ID, schema: SCHEMA, createdAt: Date.now(), lastBackupAt: null,
    settings: {
      availableDays: [1, 2, 4, 5, 6],
      calories: 2400, protein: 200, carbs: 230, fat: 75, waterGoal: 100,
      cardioWeeklyGoal: 150, restSeconds: 90,
      avoid: ['onion', 'salsa', 'tomato', 'jalapeno', 'jalape\u00f1o', 'bell pepper']
    },
    // Historical reference points you entered. They are NOT current readings.
    references: [
      { id: 'ref_w_0520', kind: 'weight', label: 'Starting weight', date: '2026-05-20', value: 270, unit: 'lb' },
      { id: 'ref_w_0830', kind: 'weight', label: 'Late-summer weigh-in', date: '2026-08-30', value: 258.9, unit: 'lb' },
      { id: 'ref_waist_0830', kind: 'waist', label: 'Waist', date: '2026-08-30', value: 41.25, unit: 'in' }
    ],
    goals: { checkpoint: 255, goalLow: 235, goalHigh: 245 },
    checkins: [], measurements: [], workouts: [], activeWorkout: null, cardio: [],
    foods: defaultFoods(), mealTemplates: defaultTemplates(), meals: [], water: {},
    overrides: {}, customExercises: []
  };
}
function normalize(raw) {
  const d = defaultState();
  const s = raw && typeof raw === 'object' ? raw : {};
  const out = Object.assign({}, d, s);
  out.settings = Object.assign({}, d.settings, s.settings || {});
  out.goals = Object.assign({}, d.goals, s.goals || {});
  ['references', 'checkins', 'measurements', 'workouts', 'cardio', 'foods', 'mealTemplates', 'meals', 'customExercises'].forEach(function (k) {
    if (!Array.isArray(out[k])) out[k] = d[k];
  });
  if (!out.water || typeof out.water !== 'object' || Array.isArray(out.water)) out.water = {};
  if (!out.overrides || typeof out.overrides !== 'object' || Array.isArray(out.overrides)) out.overrides = {};
  if (!Array.isArray(out.settings.availableDays)) out.settings.availableDays = d.settings.availableDays;
  if (!Array.isArray(out.settings.avoid)) out.settings.avoid = d.settings.avoid;
  out.app = APP_ID; out.schema = SCHEMA;
  return out;
}

/* ============================== engine (pure functions) ============================== */
function libOf(state) { return BASE_EXERCISES.concat(state.customExercises || []); }
function exById(state, id) { return libOf(state).filter(function (e) { return e.id === id; })[0] || null; }
function isWorking(s) { return s && s.done && !s.warmup && num(s.reps) > 0; }
function e1rm(load, reps) {
  load = num(load); reps = num(reps);
  if (load == null || reps == null || reps < 1 || reps > 12 || load <= 0) return null;
  return reps === 1 ? load : load * (1 + reps / 30);
}
function wTime(w) { return w.endTs || w.ts || parseDate(w.date); }
function sortedWorkouts(state) { return state.workouts.slice().sort(function (a, b) { return wTime(a) - wTime(b); }); }

// chronological sessions for one exercise: [{w, date, sets}]
function exerciseSessions(state, exId) {
  const out = [];
  sortedWorkouts(state).forEach(function (w) {
    let sets = [];
    (w.exercises || []).forEach(function (e) { if (e.exId === exId) sets = sets.concat((e.sets || []).filter(isWorking)); });
    if (sets.length) out.push({ w: w, date: w.date, ts: wTime(w), sets: sets });
  });
  return out;
}
function bestE1rm(sets) {
  let b = null;
  sets.forEach(function (s) { const v = e1rm(s.load, s.reps); if (v != null && (b == null || v > b)) b = v; });
  return b;
}
function topSet(sets) {
  let best = null;
  sets.forEach(function (s) {
    const v = e1rm(s.load, s.reps);
    const score = v != null ? v : (num(s.load) || 0);
    if (!best || score > best.score) best = { s: s, score: score };
  });
  return best ? best.s : null;
}
function lastTrained(state, muscleId) {
  let t = null;
  state.workouts.forEach(function (w) {
    const has = (w.exercises || []).some(function (e) { return e.muscle === muscleId && (e.sets || []).some(isWorking); });
    if (has) { const x = wTime(w); if (t == null || x > t) t = x; }
  });
  return t;
}
function weeklySets(state, muscleId, now) {
  let n = 0;
  state.workouts.forEach(function (w) {
    if (wTime(w) < now - 7 * DAY) return;
    (w.exercises || []).forEach(function (e) { if (e.muscle === muscleId) n += (e.sets || []).filter(isWorking).length; });
  });
  return n;
}
function usageMap(state) {
  const m = {};
  sortedWorkouts(state).forEach(function (w) {
    (w.exercises || []).forEach(function (e) {
      if (!(e.sets || []).some(isWorking)) return;
      const u = m[e.exId] || (m[e.exId] = { count: 0, last: 0 });
      u.count++; u.last = Math.max(u.last, wTime(w));
    });
  });
  return m;
}
function muscleTrend(state, muscleId) {
  let up = 0, down = 0, compared = 0;
  libOf(state).filter(function (e) { return e.muscle === muscleId; }).forEach(function (e) {
    const ss = exerciseSessions(state, e.id);
    if (ss.length < 2) return;
    const a = bestE1rm(ss[ss.length - 1].sets), b = bestE1rm(ss[ss.length - 2].sets);
    if (a == null || b == null) return;
    compared++;
    if (a < b * 0.95) down++; else if (a > b * 1.02) up++;
  });
  if (!compared) return null;
  if (down > up) return 'down';
  if (up > down) return 'up';
  return 'flat';
}

function latestCheckin(state, today) {
  const list = state.checkins.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  const c = list.filter(function (x) { return x.date <= today; })[0];
  if (!c) return null;
  return { c: c, ageDays: daysBetween(c.date, today) };
}
function globalReadiness(ci) {
  if (!ci || ci.ageDays > 1) return { score: null, level: 'green', known: false, notes: [] };
  const c = ci.c; let score = 100; const notes = [];
  const sh = num(c.sleepHours), sq = num(c.sleepQuality), fa = num(c.fatigue);
  if (sh != null) {
    if (sh < 5) { score -= 30; notes.push('Sleep was under 5 hours'); }
    else if (sh < 6) { score -= 20; notes.push('Sleep was under 6 hours'); }
    else if (sh < 7) { score -= 8; notes.push('Sleep was a bit short'); }
  }
  if (sq != null) { if (sq <= 1) score -= 10; else if (sq <= 2) score -= 5; }
  if (fa != null) {
    if (fa >= 5) { score -= 35; notes.push('Fatigue is very high'); }
    else if (fa >= 4) { score -= 22; notes.push('Fatigue is high'); }
    else if (fa >= 3) { score -= 8; }
  }
  score = clamp(score, 0, 100);
  return { score: score, level: score >= 70 ? 'green' : score >= 45 ? 'yellow' : 'red', known: true, notes: notes };
}
function painByMuscle(ci) {
  const out = {}; const areas = [];
  if (!ci || ci.ageDays > 3 || !ci.c.pain) return { byMuscle: out, areas: areas };
  PAIN_AREAS.forEach(function (a) {
    const lvl = num(ci.c.pain[a.id]) || 0;
    if (lvl <= 0) return;
    areas.push({ id: a.id, label: a.label, level: lvl });
    a.muscles.forEach(function (m) { out[m] = Math.max(out[m] || 0, lvl); });
  });
  return { byMuscle: out, areas: areas };
}
function availableDaysAhead(state, now) {
  let n = 0;
  for (let i = 0; i < 7; i++) { if (state.settings.availableDays.indexOf(new Date(now + i * DAY).getDay()) >= 0) n++; }
  return n;
}

function recommend(state, now) {
  now = now || Date.now();
  const today = dateStr(now);
  const ci = latestCheckin(state, today);
  const g = globalReadiness(ci);
  const pain = painByMuscle(ci);
  const ov = state.overrides[today] || null;
  const conservative = !!(ov && ov.conservative);
  let level = g.level;
  if (conservative && level === 'green') level = 'yellow';
  const daysAhead = Math.max(1, availableDaysAhead(state, now));
  const offDay = state.settings.availableDays.indexOf(new Date(now).getDay()) < 0;
  const gFactor = 0.6 + 0.4 * (g.score == null ? 100 : g.score) / 100;

  const muscles = MUSCLES.map(function (m) {
    const last = lastTrained(state, m.id);
    const hrs = last ? (now - last) / 3600000 : null;
    const base = last ? Math.min(100, hrs / m.rec * 100) : 100;
    const overdue = last ? clamp((hrs - m.rec) / 24 * 2, 0, 10) : 10;
    const notes = [];
    let sore = 0;
    if (ci && ci.ageDays <= 3 && ci.c.soreness) sore = num(ci.c.soreness[m.id]) || 0;
    const sorePen = [0, 10, 25, 55][clamp(sore, 0, 3)];
    if (sore >= 2) notes.push('Sore (' + sore + '/3)');
    const pl = pain.byMuscle[m.id] || 0;
    const blocked = pl >= 4;
    let painPen = 0;
    if (pl >= 4) { notes.push('Pain ' + pl + '/5 nearby'); }
    else if (pl >= 2) { painPen = 20; notes.push('Pain ' + pl + '/5 nearby'); }
    else if (pl === 1) { painPen = 5; }
    const tr = muscleTrend(state, m.id);
    let dipPen = 0;
    if (tr === 'down') { dipPen = 10; notes.push('Strength dipped last session'); }
    if (tr === 'up') notes.push('Strength trending up');
    const readiness = blocked ? 0 : Math.round(clamp(base - sorePen - painPen - dipPen, 0, 100) * gFactor);
    const ws = weeklySets(state, m.id, now);
    const deficit = Math.max(0, 1 - ws / m.target);
    const boost = 12 * deficit * clamp(4 / daysAhead, 0.7, 2);
    const status = blocked ? 'blocked' : readiness >= 80 ? 'ready' : readiness >= 50 ? 'ok' : 'recovering';
    return {
      id: m.id, label: m.label, readiness: readiness, status: status, last: last, hoursSince: hrs,
      weeklySets: ws, target: m.target, soreness: sore, pain: pl, trend: tr, notes: notes,
      priority: blocked ? -999 : readiness + boost + overdue
    };
  });
  const byId = {}; muscles.forEach(function (m) { byId[m.id] = m; });

  const archs = ARCHETYPES.map(function (a) {
    const ok = a.muscles.filter(function (id) { return !byId[id].pain || byId[id].pain < 4; });
    const eligible = ok.length >= Math.ceil(a.muscles.length / 2);
    const use = ok.length ? ok : a.muscles;
    return {
      id: a.id, label: a.label, sub: a.sub, muscles: a.muscles.slice(), eligible: eligible,
      score: Math.round(mean(use.map(function (id) { return byId[id].priority; })) || 0),
      avgReadiness: Math.round(mean(use.map(function (id) { return byId[id].readiness; })) || 0)
    };
  }).sort(function (a, b) { return b.score - a.score; });

  const reasons = [];
  if (g.known) {
    if (g.level === 'green') reasons.push('Sleep and fatigue look fine today, so a normal session is on.');
    else if (g.level === 'yellow') reasons.push('Recovery is a little low, so volume is trimmed and intensity sets are off.');
    else reasons.push('Recovery is low today. A rest or easy-cardio day is the safer call.');
    g.notes.forEach(function (n) { reasons.push(n + '.'); });
  } else {
    reasons.push('No fresh check-in, so today is treated as normal. Log one for sharper advice.');
  }
  if (offDay) reasons.push('Today is not one of your available training days.');
  pain.areas.forEach(function (a) { if (a.level >= 2) reasons.push(a.label + ' pain ' + a.level + '/5 is limiting related lifts.'); });

  const out = { now: now, today: today, global: g, level: level, conservative: conservative, offDay: offDay, muscles: muscles, byId: byId, archetypes: archs, pain: pain, reasons: reasons, daysAhead: daysAhead, override: ov, checkin: ci };

  function finishTrain(label, ids, source, archId) {
    const keep = [], dropped = [];
    ids.forEach(function (id) {
      const m = byId[id];
      if (source === 'auto' && m.status === 'blocked') dropped.push({ id: id, reason: 'pain' });
      else if (source === 'auto' && m.readiness < 40) dropped.push({ id: id, reason: 'still recovering' });
      else keep.push(id);
    });
    out.mode = 'train'; out.source = source;
    out.chosen = { id: archId || 'custom', label: label, muscles: keep.length ? keep : ids.slice(), dropped: dropped };
    return out;
  }

  if (ov && ov.mode === 'rest') {
    out.mode = 'rest'; out.source = 'override'; out.chosen = null;
    out.reasons.unshift('You chose a recovery day.');
    return out;
  }
  if (ov && ov.mode === 'archetype') {
    const a = ARCHETYPES.filter(function (x) { return x.id === ov.archetypeId; })[0];
    if (a) {
      out.reasons.unshift('You picked ' + a.label + '.');
      return finishTrain(a.label, a.muscles.slice(), 'override', a.id);
    }
  }
  if (ov && ov.mode === 'custom' && ov.muscles && ov.muscles.length) {
    const ids = ov.muscles.slice().sort(function (x, y) { return MUSCLE_BY_ID[x].order - MUSCLE_BY_ID[y].order; });
    out.reasons.unshift('You picked ' + ids.map(function (i) { return MUSCLE_BY_ID[i].label; }).join(', ') + '.');
    return finishTrain('Custom session', ids, 'override', 'custom');
  }

  const elig = archs.filter(function (a) { return a.eligible; });
  const best = elig[0];
  if (level === 'red' || !best || best.avgReadiness < 45) {
    out.mode = 'rest'; out.source = 'auto'; out.chosen = null;
    if (best && level !== 'red') out.reasons.push('Every option still needs recovery time (best average readiness ' + best.avgReadiness + '%).');
    return out;
  }
  const ids = best.muscles.slice();
  reasons.unshift(best.label + ' scores highest: readiness ' + best.avgReadiness + '% on average' + (function () {
    const lt = ids.map(function (i) { return byId[i]; }).filter(function (m) { return m.last == null; });
    return lt.length ? ' and some of it is not in your log yet.' : '.';
  })());
  const low = ids.filter(function (i) { return byId[i].weeklySets < byId[i].target * 0.5; });
  if (low.length) reasons.push('Low weekly volume so far for ' + low.map(function (i) { return MUSCLE_BY_ID[i].label.toLowerCase(); }).join(', ') + '.');
  const res = finishTrain(best.label, ids, 'auto', best.id);
  res.chosen.dropped.forEach(function (d) {
    res.reasons.push(MUSCLE_BY_ID[d.id].label + ' is left out today (' + d.reason + ').');
  });
  return res;
}

// conservative, history-based load suggestion
function suggestLoad(state, ex, ctx) {
  ctx = ctx || {};
  const ss = exerciseSessions(state, ex.id);
  if (!ss.length) {
    return { kind: 'baseline', load: null, text: 'No history yet. Pick a load you could lift for ' + ex.hi + ' clean reps with 3+ in reserve, and log it as your baseline.' };
  }
  const last = ss[ss.length - 1];
  const L = Math.max.apply(null, last.sets.map(function (s) { return num(s.load) || 0; }));
  const atL = last.sets.filter(function (s) { return (num(s.load) || 0) === L; });
  const reps = atL.map(function (s) { return num(s.reps) || 0; });
  const avgReps = mean(reps);
  const rpes = atL.map(function (s) { return num(s.rpe); }).filter(function (x) { return x != null; });
  const rpeKnown = rpes.length === atL.length;
  const maxRpe = rpes.length ? Math.max.apply(null, rpes) : null;
  const lastTxt = 'Last: ' + atL.length + ' x ' + fmtLoad(L) + ' lb for ' + reps.join('/') + (maxRpe != null ? ' (RPE up to ' + maxRpe + ')' : '');

  function meetsTop(sess) {
    const mx = Math.max.apply(null, sess.sets.map(function (s) { return num(s.load) || 0; }));
    const at = sess.sets.filter(function (s) { return (num(s.load) || 0) === mx; });
    const rp = at.map(function (s) { return num(s.rpe); }).filter(function (x) { return x != null; });
    return at.length >= 2 && at.every(function (s) { return (num(s.reps) || 0) >= ex.hi; }) && rp.length === at.length && Math.max.apply(null, rp) <= 8;
  }
  // strength dip check against recent best
  const prior = ss.slice(Math.max(0, ss.length - 5), ss.length - 1).map(function (x) { return bestE1rm(x.sets); }).filter(function (x) { return x != null; });
  const lastBest = bestE1rm(last.sets);
  const dipped = prior.length && lastBest != null && lastBest < Math.max.apply(null, prior) * 0.9;

  if (ctx.holdAll) {
    return { kind: 'hold', load: L, text: lastTxt + '. Hold this load today: recovery or pain signals say keep it conservative. Match last time with clean reps.' };
  }
  if (dipped) {
    return { kind: 'hold', load: L, text: lastTxt + '. Strength dipped versus recent sessions, so repeat this load before adding weight.' };
  }
  const reduce = avgReps < ex.lo || (ex.heavy && maxRpe != null && maxRpe >= 9.5) || (maxRpe != null && maxRpe >= 10 && avgReps < ex.hi);
  if (reduce) {
    const nl = Math.max(0, roundTo(L * 0.95, 2.5));
    return { kind: 'reduce', load: nl < L ? nl : Math.max(0, L - 2.5), text: lastTxt + '. That looked too hard. Try about 5% less (' + fmtLoad(nl < L ? nl : L - 2.5) + ' lb) and own every rep.' };
  }
  if (meetsTop(last)) {
    let need = ex.heavy ? 2 : 1, have = 0;
    for (let i = ss.length - 1; i >= 0 && have < need; i--) { if (meetsTop(ss[i])) have++; else break; }
    if (have >= need && !(ctx.painCaution)) {
      const nl = L + (ex.inc || 5);
      return { kind: 'increase', load: nl, text: lastTxt + '. You earned a small step: try ' + fmtLoad(nl) + ' lb and aim for ' + ex.lo + '+ reps.' };
    }
    return { kind: 'hold', load: L, text: lastTxt + '. Top of range hit. Repeat once more to confirm before adding weight.' };
  }
  if (!rpeKnown) {
    return { kind: 'hold', load: L, text: lastTxt + '. Log RPE on every set so progression can unlock. Repeat this load.' };
  }
  const goal = Math.min(ex.hi, Math.floor(avgReps) + 1);
  return { kind: 'hold', load: L, text: lastTxt + '. Same load, aim for ' + goal + ' reps on each set.' };
}

function prescribe(state, ex, opts) {
  opts = opts || {};
  const sugg = suggestLoad(state, ex, { holdAll: opts.holdAll, painCaution: opts.caution });
  let sets = opts.sets != null ? opts.sets : ex.sets;
  let rpeText;
  if (opts.intensity) { sets = 1; rpeText = '9-9.5 on the working set'; }
  else if (ex.heavy) rpeText = '7-8 (2+ reps in reserve)';
  else if (opts.holdAll) rpeText = '7-8';
  else rpeText = '8-9';
  return {
    exId: ex.id, name: ex.name, muscle: ex.muscle, sets: sets, lo: ex.lo, hi: ex.hi, rpeText: rpeText,
    tempo: '3-1-1', intensity: !!opts.intensity, heavy: !!ex.heavy, role: ex.role, angle: ex.angle, cue: ex.cue, type: ex.type, suggestion: sugg
  };
}

function buildPlan(state, muscleIds, R) {
  const lib = libOf(state);
  const usage = usageMap(state);
  const ids = muscleIds.slice().sort(function (a, b) { return MUSCLE_BY_ID[a].order - MUSCLE_BY_ID[b].order; });
  const per = ids.length >= 4 ? 2 : 3;
  const holdAll = R.level !== 'green';
  const items = [];
  ids.forEach(function (m) {
    const pl = (R.byId[m] && R.byId[m].pain) || 0;
    const caution = pl >= 2;
    const cap = ['biceps', 'triceps', 'calves', 'core'].indexOf(m) >= 0 ? 2 : per;
    let pool = lib.filter(function (e) { return e.muscle === m && !(caution && e.heavy); });
    const anchors = pool.filter(function (e) { return e.role === 'anchor'; });
    let angles = pool.filter(function (e) { return e.role === 'angle'; });
    const first = anchors.length ? anchors : angles;
    if (!first.length) return;
    const anchor = first.slice().sort(function (a, b) {
      const ua = (usage[a.id] || { count: 0 }).count, ub = (usage[b.id] || { count: 0 }).count;
      return ub - ua;
    })[0];
    angles = pool.filter(function (e) { return e.id !== anchor.id && e.role !== 'optional'; }).sort(function (a, b) {
      return ((usage[a.id] || { last: 0 }).last) - ((usage[b.id] || { last: 0 }).last);
    });
    const chosen = [anchor].concat(angles.slice(0, cap - 1));
    chosen.forEach(function (e, i) {
      let sets = e.sets;
      if (ids.length >= 4 && i > 0) sets = Math.min(sets, 2);
      if (holdAll || caution) sets = Math.max(2, sets - 1);
      items.push({ ex: e, muscle: m, sets: sets, caution: caution, idx: i });
    });
  });
  // intensity sets: at most 2, machine/isolation only, never heavy, only on a green, pain-free, fresh muscle
  if (R.level === 'green' && !R.conservative) {
    const cands = [];
    ids.forEach(function (m) {
      const r = R.byId[m];
      if (!r || r.pain >= 1 || r.soreness >= 2 || r.readiness < 75) return;
      const mine = items.filter(function (it) { return it.muscle === m && !it.ex.heavy && (it.ex.type === 'machine' || it.ex.type === 'isolation'); });
      if (mine.length) cands.push({ item: mine[mine.length - 1], readiness: r.readiness });
    });
    cands.sort(function (a, b) { return b.readiness - a.readiness; }).slice(0, 2).forEach(function (c) { c.item.intensity = true; });
  }
  return items.map(function (it) {
    return prescribe(state, it.ex, { sets: it.sets, intensity: it.intensity, holdAll: holdAll || it.caution, caution: it.caution });
  });
}

function cardioAdvice(R) {
  const kneeHip = Math.max((R.byId.quads && R.byId.quads.pain) || 0, (R.byId.calves && R.byId.calves.pain) || 0);
  if (R.level === 'red') return 'Keep it very easy: a 15-25 minute walk, or skip it and rest.';
  if (kneeHip >= 3) return 'Lower-body pain is up. Try easy cycling or a gentle walk only if it stays pain-free, otherwise skip.';
  if (R.level === 'yellow') return '20-30 minutes at an easy, conversational pace.';
  return '30-40 minutes steady at a pace where you can still talk in full sentences.';
}

// export engine for browser console checks and tests
global.AscencionEngine = {
  MUSCLES: MUSCLES, ARCHETYPES: ARCHETYPES, BASE_EXERCISES: BASE_EXERCISES, defaultState: defaultState, normalize: normalize,
  recommend: recommend, suggestLoad: suggestLoad, buildPlan: buildPlan, prescribe: prescribe, e1rm: e1rm, lastTrained: lastTrained,
  weeklySets: weeklySets, exerciseSessions: exerciseSessions, dateStr: dateStr
};

/* ============================== state + persistence ============================== */
let storageOK = true;
let loadNotice = '';
function probeStorage() {
  try { localStorage.setItem('__pa_probe', '1'); localStorage.removeItem('__pa_probe'); return true; } catch (e) { return false; }
}
function loadState() {
  if (!probeStorage()) { storageOK = false; return defaultState(); }
  let raw = null;
  try { raw = localStorage.getItem(STORE_KEY); } catch (e) { storageOK = false; return defaultState(); }
  if (!raw) return defaultState();
  try { return normalize(JSON.parse(raw)); }
  catch (e) {
    try { localStorage.setItem(CORRUPT_KEY, raw); } catch (_) { /* ignore */ }
    loadNotice = 'Saved data could not be read. A raw copy was kept in this browser, and the app started fresh. Import a backup to restore.';
    return defaultState();
  }
}
let S = loadState();
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); storageOK = true; return true; }
  catch (e) { storageOK = false; renderBanner(); return false; }
}
function todayStr() { return dateStr(Date.now()); }

const ui = { tab: 'today', sub: { body: 'measure', progress: 'strength' }, fuelSub: 'log', fuelDate: todayStr(), exSel: null, plan: null, planKey: '', swaps: {}, libQuery: '', sessionDraft: null };
const charts = {};
const $ = function (s, r) { return (r || document).querySelector(s); };
const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ============================== small UI helpers ============================== */
let toastTimer = null;
function toast(msg, ms) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2400);
}
let sheetState = null;
function openSheet(title, html) {
  const root = $('#sheetRoot');
  root.innerHTML = '<div class="sheet-back" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="sheet-close" aria-label="Close">&times;</button></div><div class="sheet-body" id="sheetBody">' + html + '</div></div>';
  document.body.classList.add('noscroll');
}
function closeSheet() { $('#sheetRoot').innerHTML = ''; document.body.classList.remove('noscroll'); sheetState = null; }
function pct(v, t) { return t > 0 ? clamp(Math.round(v / t * 100), 0, 100) : 0; }
function meter(v, t, cls) { return '<div class="meter ' + (cls || '') + '"><span style="width:' + pct(v, t) + '%"></span></div>'; }
function emptyState(title, text, btn) {
  return '<div class="empty"><strong>' + esc(title) + '</strong><p class="muted">' + esc(text) + '</p>' + (btn || '') + '</div>';
}
function field(label, inner, hint) {
  return '<label class="field"><span>' + esc(label) + '</span>' + inner + (hint ? '<small class="muted">' + esc(hint) + '</small>' : '') + '</label>';
}
function numInput(id, val, opts) {
  opts = opts || {};
  return '<input class="inp" id="' + id + '" type="number" inputmode="decimal" step="' + (opts.step || 'any') + '" value="' + (val == null ? '' : esc(val)) + '"' + (opts.min != null ? ' min="' + opts.min + '"' : '') + (opts.max != null ? ' max="' + opts.max + '"' : '') + (opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '') + '>';
}
function getLib() { return libOf(S); }
function exName(id) { const e = exById(S, id); return e ? e.name : id; }
function avoidHit(name) {
  const n = String(name || '').toLowerCase();
  return S.settings.avoid.filter(function (a) { return a && n.indexOf(String(a).toLowerCase()) >= 0; });
}
function mealTotals(m) {
  return (m.items || []).reduce(function (t, i) { return { cal: t.cal + (i.cal || 0), p: t.p + (i.p || 0), c: t.c + (i.c || 0), f: t.f + (i.f || 0) }; }, { cal: 0, p: 0, c: 0, f: 0 });
}
function dayTotals(ds) {
  return S.meals.filter(function (m) { return m.date === ds; }).reduce(function (t, m) {
    const x = mealTotals(m); return { cal: t.cal + x.cal, p: t.p + x.p, c: t.c + x.c, f: t.f + x.f };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}
function latestMeasure(key) {
  const l = S.measurements.filter(function (m) { return num(m[key]) != null; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0); });
  return l[0] || null;
}

/* ============================== charts (canvas, no libraries) ============================== */
function chartHTML(id, cfg, h) {
  charts[id] = cfg;
  return '<canvas class="chart" id="' + id + '" height="' + (h || 190) + '" role="img" aria-label="' + esc(cfg.label || 'Chart') + '"></canvas>';
}
function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#999'; }
function drawLine(canvas, cfg) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 320, h = parseInt(canvas.getAttribute('height'), 10) || 190;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const muted = cssVar('--muted'), line = cssVar('--line'), accent = cssVar('--accent'), good = cssVar('--good'), warn = cssVar('--warn');
  const pts = []; cfg.series.forEach(function (s) { s.points.forEach(function (p) { pts.push(p); }); });
  ctx.font = '11px system-ui, sans-serif'; ctx.textBaseline = 'middle';
  if (!pts.length) { ctx.fillStyle = muted; ctx.textAlign = 'center'; ctx.fillText('No data yet', w / 2, h / 2); return; }
  let xmin = Math.min.apply(null, pts.map(function (p) { return p.x; })), xmax = Math.max.apply(null, pts.map(function (p) { return p.x; }));
  if (xmin === xmax) { xmin -= 3 * DAY; xmax += 3 * DAY; }
  let ys = pts.map(function (p) { return p.y; });
  (cfg.lines || []).forEach(function (l) { ys.push(l.y); });
  if (cfg.band) { ys.push(cfg.band.lo, cfg.band.hi); }
  let ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
  const padY = (ymax - ymin || 1) * 0.12; ymin -= padY; ymax += padY;
  const L = 42, R = 12, T = 10, B = 24, pw = w - L - R, ph = h - T - B;
  const X = function (x) { return L + (x - xmin) / (xmax - xmin) * pw; };
  const Y = function (y) { return T + (1 - (y - ymin) / (ymax - ymin)) * ph; };
  ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.fillStyle = muted; ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const yv = ymin + (ymax - ymin) * i / 3, yy = Y(yv);
    ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(w - R, yy); ctx.stroke();
    ctx.fillText(String(Math.round(yv * 10) / 10), L - 6, yy);
  }
  if (cfg.band) {
    ctx.fillStyle = 'rgba(111,207,151,0.14)';
    ctx.fillRect(L, Y(cfg.band.hi), pw, Y(cfg.band.lo) - Y(cfg.band.hi));
    ctx.fillStyle = good; ctx.textAlign = 'left'; ctx.fillText(cfg.band.label || '', L + 4, Y(cfg.band.hi) + 9);
  }
  (cfg.lines || []).forEach(function (l) {
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = warn; ctx.beginPath(); ctx.moveTo(L, Y(l.y)); ctx.lineTo(w - R, Y(l.y)); ctx.stroke(); ctx.restore();
    ctx.fillStyle = warn; ctx.textAlign = 'left'; ctx.fillText(l.label, L + 4, Y(l.y) - 7);
  });
  cfg.series.forEach(function (s) {
    const arr = s.points.slice().sort(function (a, b) { return a.x - b.x; });
    ctx.strokeStyle = s.color || accent; ctx.lineWidth = 2;
    ctx.beginPath(); arr.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.stroke();
    arr.forEach(function (p) {
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3.5, 0, Math.PI * 2);
      if (p.ref) { ctx.fillStyle = cssVar('--surface'); ctx.fill(); ctx.stroke(); } else { ctx.fillStyle = s.color || accent; ctx.fill(); }
    });
  });
  ctx.fillStyle = muted; ctx.textAlign = 'left'; ctx.fillText(fmtDateShort(xmin), L, h - 8);
  ctx.textAlign = 'right'; ctx.fillText(fmtDateShort(xmax), w - R, h - 8);
}
function fmtDateShort(ms) { return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }); }
function drawCharts() { Object.keys(charts).forEach(function (id) { const c = document.getElementById(id); if (c) drawLine(c, charts[id]); }); }

/* ============================== views ============================== */
function recNow() { return recommend(S, Date.now()); }
function levelLabel(R) { return R.mode === 'rest' ? 'Recovery' : R.level === 'green' ? 'Normal load' : 'Conservative'; }

function viewToday() {
  const R = recNow(); const ds = R.today;
  let h = '';
  if (!S.checkins.some(function (c) { return c.date === ds; })) {
    h += '<section class="card nudge"><div><strong>No recovery check-in yet today</strong><p class="muted">Sleep, fatigue, soreness and pain steer today\'s plan.</p></div><button class="btn primary" data-act="open-checkin">Log check-in</button></section>';
  }
  h += heroCard(R);
  h += ladderCard(R);
  h += '<div class="grid2">' + cardioCard(R) + fuelSnapshot(ds) + '</div>';
  h += bodySnapshot();
  return h;
}
function heroCard(R) {
  const aw = S.activeWorkout;
  let title, sub;
  if (R.mode === 'rest') { title = 'Recovery day'; sub = 'Easy cardio, mobility, food and sleep. Come back stronger.'; }
  else { title = R.chosen.label; sub = R.chosen.muscles.map(function (id) { return MUSCLE_BY_ID[id].label; }).join(', '); }
  const src = R.source === 'override' ? 'Your pick' : 'Suggested for today';
  const pillCls = R.mode === 'rest' ? 'bad' : R.level === 'green' ? 'good' : 'warn';
  let btns = '';
  if (aw) btns += '<button class="btn primary" data-act="goto-train">Resume workout</button>';
  else if (R.mode === 'train') btns += '<button class="btn primary" data-act="start-today">Start workout</button>';
  else btns += '<button class="btn primary" data-act="open-session">Train anyway</button>';
  if (R.mode === 'train' || aw) btns += '<button class="btn" data-act="open-session">Change session</button>';
  if (R.override) btns += '<button class="btn ghost" data-act="clear-override">Use suggestion</button>';
  return '<section class="card hero"><div class="hero-top"><span class="pill ' + pillCls + '">' + levelLabel(R) + '</span><span class="muted small">' + src + '</span></div>' +
    '<h1>' + esc(title) + '</h1><p class="hero-sub">' + esc(sub) + '</p>' +
    '<ul class="reasons">' + R.reasons.slice(0, 5).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
    '<div class="btn-row">' + btns + '</div></section>';
}
function ladderCard(R) {
  const rows = R.muscles.slice().sort(function (a, b) { return b.priority - a.priority; }).map(function (m) {
    const inSession = R.mode === 'train' && R.chosen.muscles.indexOf(m.id) >= 0;
    const when = m.last == null ? 'not logged yet' : (m.hoursSince < 36 ? Math.round(m.hoursSince) + 'h ago' : Math.round(m.hoursSince / 24) + 'd ago');
    const stat = m.status === 'blocked' ? 'pain' : m.status;
    return '<div class="lrow' + (inSession ? ' sel' : '') + '"><div class="lname">' + esc(m.label) + '</div>' +
      '<div class="lbar ' + m.status + '"><span style="width:' + Math.max(m.readiness, 3) + '%"></span></div>' +
      '<div class="lmeta"><b>' + m.readiness + '%</b> <span class="muted">' + stat + ', ' + when + '</span></div>' +
      (m.notes.length ? '<div class="lnotes muted small">' + esc(m.notes.join('. ')) + '</div>' : '') + '</div>';
  }).join('');
  return '<section class="card"><div class="card-head"><h2>Muscle readiness</h2><span class="muted small">Highlighted rows are in today\'s session</span></div><div class="ladder">' + rows + '</div>' +
    '<p class="muted small">Readiness blends time since trained, soreness, pain, sleep, fatigue and strength trend. It is a guide, not a diagnosis.</p></section>';
}
function weekCardioMinutes() {
  const cut = dateStr(Date.now() - 6 * DAY);
  return S.cardio.filter(function (c) { return c.date >= cut; }).reduce(function (t, c) { return t + (num(c.minutes) || 0); }, 0);
}
function cardioCard(R) {
  const ds = R.today;
  const todays = S.cardio.filter(function (c) { return c.date === ds; });
  const wk = weekCardioMinutes(), goal = S.settings.cardioWeeklyGoal;
  let body;
  if (todays.length) body = '<p><strong>Logged today:</strong> ' + todays.map(function (c) { return esc(plural(num(c.minutes) || 0, 'min') + ' ' + c.type); }).join(', ') + '</p>';
  else body = '<p class="muted">' + esc(cardioAdvice(R)) + '</p>';
  return '<section class="card"><div class="card-head"><h2>Morning cardio</h2></div>' + body +
    '<div class="row-between small muted"><span>Last 7 days</span><span>' + Math.round(wk) + ' / ' + goal + ' min</span></div>' + meter(wk, goal) +
    '<div class="btn-row"><button class="btn" data-act="open-cardio">Log cardio</button></div></section>';
}
function fuelSnapshot(ds) {
  const t = dayTotals(ds), st = S.settings, water = S.water[ds] || 0;
  return '<section class="card"><div class="card-head"><h2>Fuel today</h2></div>' +
    '<div class="row-between"><span>Calories</span><b>' + Math.round(t.cal) + ' / ' + st.calories + '</b></div>' + meter(t.cal, st.calories) +
    '<div class="row-between"><span>Protein</span><b>' + Math.round(t.p) + ' / ' + st.protein + ' g</b></div>' + meter(t.p, st.protein, 'prot') +
    '<div class="row-between"><span>Water</span><b>' + water + ' / ' + st.waterGoal + ' oz</b></div>' + meter(water, st.waterGoal, 'water') +
    '<div class="btn-row"><button class="btn" data-act="water-add" data-oz="16">+16 oz water</button><button class="btn" data-act="open-meal">Log meal</button></div></section>';
}
function bodySnapshot() {
  const lw = latestMeasure('weight'), lwa = latestMeasure('waist');
  const g = S.goals;
  let cur;
  if (lw) {
    const w = num(lw.weight);
    const toCp = round1(w - g.checkpoint);
    cur = '<div class="stat"><b>' + fmtLoad(w) + ' lb</b><span class="muted small">Latest logged, ' + fmtDate(lw.date) + '</span></div>' +
      '<div class="stat"><b>' + (toCp > 0 ? toCp + ' lb' : 'Reached') + '</b><span class="muted small">' + (toCp > 0 ? 'to the ' + g.checkpoint + ' lb checkpoint' : g.checkpoint + ' lb checkpoint') + '</span></div>';
  } else {
    cur = '<div class="stat wide"><b>No current weight logged</b><span class="muted small">Log a weigh-in to see progress. Reference points below are history, not today\'s reading.</span></div>';
  }
  if (lwa) cur += '<div class="stat"><b>' + fmtLoad(num(lwa.waist)) + ' in</b><span class="muted small">Waist, ' + fmtDate(lwa.date) + '</span></div>';
  const refs = S.references.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (r) {
    return '<li>' + esc(fmtDateLong(r.date)) + ': ' + fmtLoad(r.value) + ' ' + esc(r.unit) + ' <span class="muted">(' + esc(r.label) + ', reference)</span></li>';
  }).join('');
  return '<section class="card"><div class="card-head"><h2>Body</h2><button class="btn small" data-act="open-measure">Log measurements</button></div><div class="stats">' + cur + '</div>' +
    '<ul class="plain small">' + refs + '</ul><p class="muted small">Checkpoint ' + g.checkpoint + ' lb. Long-term goal ' + g.goalLow + '-' + g.goalHigh + ' lb.</p></section>';
}

/* ---------- Train ---------- */
function viewTrain() {
  if (S.activeWorkout) return viewActiveWorkout();
  const R = recNow();
  let h = '';
  if (R.mode === 'rest') {
    h += '<section class="card hero"><div class="hero-top"><span class="pill bad">Recovery</span></div><h1>Recovery day suggested</h1><ul class="reasons">' + R.reasons.slice(0, 4).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
      '<div class="btn-row"><button class="btn" data-act="open-session">Pick a session anyway</button><button class="btn" data-act="open-cardio">Log easy cardio</button>' + (R.override ? '<button class="btn ghost" data-act="clear-override">Use suggestion</button>' : '') + '</div></section>';
  } else {
    const plan = getPlan(R);
    h += '<section class="card hero"><div class="hero-top"><span class="pill ' + (R.level === 'green' ? 'good' : 'warn') + '">' + levelLabel(R) + '</span><span class="muted small">' + (R.source === 'override' ? 'Your pick' : 'Suggested for today') + '</span></div>' +
      '<h1>' + esc(R.chosen.label) + '</h1><p class="hero-sub">' + esc(R.chosen.muscles.map(function (id) { return MUSCLE_BY_ID[id].label; }).join(', ')) + '</p>' +
      '<div class="btn-row"><button class="btn primary" data-act="start-today">Start workout</button><button class="btn" data-act="open-session">Change session</button><button class="btn ghost" data-act="start-empty">Empty workout</button></div></section>';
    const warn = R.pain.areas.filter(function (a) { return a.level >= 4; });
    if (warn.length) h += '<section class="card warnbox"><strong>Pain is 4/5 or higher in: ' + esc(warn.map(function (a) { return a.label.toLowerCase(); }).join(', ')) + '.</strong><p>Consider skipping related lifts and getting the area checked. This app cannot diagnose pain.</p></section>';
    h += '<section class="card"><div class="card-head"><h2>Planned exercises</h2><span class="muted small">Tap swap to change an exercise</span></div>';
    h += plan.map(planRow).join('') || '<p class="muted">No exercises matched. Use Empty workout and add your own.</p>';
    h += '<p class="muted small">Targets are guides. Heavy compounds are capped at RPE 7-8 and never prescribed to failure. Intensity sets only appear on machine or isolation lifts when recovery is good.</p></section>';
  }
  h += '<section class="card"><div class="card-head"><h2>Cardio</h2><button class="btn small" data-act="open-cardio">Log cardio</button></div>' + cardioList() + '</section>';
  h += '<section class="card"><div class="card-head"><h2>Exercise library</h2><button class="btn small" data-act="open-custom-ex">Add custom exercise</button></div><p class="muted small">' + getLib().length + ' exercises available (' + S.customExercises.length + ' custom). Use "Add exercise" during a workout to pick from any muscle group.</p></section>';
  return h;
}
function getPlan(R) {
  const ids = R.chosen ? R.chosen.muscles : [];
  const key = R.today + '|' + ids.join(',') + '|' + R.level + '|' + S.workouts.length + '|' + S.customExercises.length;
  if (!ui.plan || ui.planKey !== key) { ui.plan = buildPlan(S, ids, R); ui.planKey = key; ui.swaps = {}; }
  return ui.plan;
}
function sugClass(k) { return k === 'increase' ? 'good' : k === 'reduce' ? 'bad' : k === 'hold' ? 'warn' : 'muted'; }
function planRow(p, i) {
  return '<div class="plan-row"><div class="plan-main"><div class="plan-name">' + esc(p.name) + '</div>' +
    '<div class="muted small">' + p.sets + ' x ' + p.lo + '-' + p.hi + ' reps, RPE ' + esc(p.rpeText) + ', tempo ' + p.tempo + '</div>' +
    '<div class="tags">' + (p.angle ? '<span class="tag">' + esc(p.angle) + '</span>' : '') + (p.intensity ? '<span class="tag hit">Intensity set</span>' : '') + (p.heavy ? '<span class="tag">Heavy: no failure</span>' : '') + '</div>' +
    '<div class="sug ' + sugClass(p.suggestion.kind) + ' small">' + esc(p.suggestion.text) + '</div></div>' +
    '<button class="btn small ghost" data-act="swap-ex" data-i="' + i + '">Swap</button></div>';
}
function cardioList() {
  const l = S.cardio.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 6);
  if (!l.length) return emptyState('No cardio logged', 'Log a morning walk, bike or incline session.');
  return l.map(function (c) {
    return '<div class="item"><div><b>' + esc(plural(num(c.minutes) || 0, 'min')) + ' ' + esc(c.type) + '</b><div class="muted small">' + esc(fmtDate(c.date)) + (c.distance ? ', ' + esc(c.distance) + ' mi' : '') + (c.avgHr ? ', avg HR ' + esc(c.avgHr) : '') + (c.notes ? ', ' + esc(c.notes) : '') + '</div></div><button class="btn small ghost danger" data-act="del-cardio" data-id="' + c.id + '" aria-label="Delete cardio entry">Delete</button></div>';
  }).join('');
}

function lastTimeText(exId) {
  const ss = exerciseSessions(S, exId);
  if (!ss.length) return 'No previous sets logged.';
  const l = ss[ss.length - 1];
  return 'Last time (' + fmtDate(l.date) + '): ' + l.sets.map(function (s) { return fmtLoad(num(s.load)) + 'x' + s.reps + (num(s.rpe) != null ? '@' + s.rpe : ''); }).join(', ');
}
function viewActiveWorkout() {
  const aw = S.activeWorkout;
  const done = aw.exercises.reduce(function (t, e) { return t + e.sets.filter(isWorking).length; }, 0);
  let h = '<section class="card hero"><div class="hero-top"><span class="pill good">' + (aw.editingId ? 'Editing past workout' : 'Workout in progress') + '</span><span class="muted small" id="elapsed">' + elapsedText() + '</span></div>' +
    '<h1>' + esc(aw.name) + '</h1><p class="hero-sub">' + done + ' working sets done. Everything saves as you type.</p>' +
    '<div class="btn-row"><button class="btn primary" data-act="finish-workout">Finish and save</button><button class="btn ghost danger" data-act="discard-workout">' + (aw.editingId ? 'Cancel edit' : 'Discard') + '</button></div></section>';
  h += aw.exercises.map(function (e, ei) { return workoutCard(e, ei); }).join('');
  h += '<div class="btn-row pad"><button class="btn" data-act="open-add-ex">Add exercise</button></div>';
  h += '<section class="card"><label class="field"><span>Workout notes</span><textarea class="inp" id="awNotes" rows="3" placeholder="How did it feel? Any pain or form notes?">' + esc(aw.notes || '') + '</textarea></label></section>';
  return h;
}
function workoutCard(e, ei) {
  const t = e.target;
  let h = '<section class="card ex"><div class="card-head"><div><h2>' + esc(e.name) + '</h2>';
  if (t) {
    h += '<div class="muted small">' + t.sets + ' x ' + t.lo + '-' + t.hi + ' reps, RPE ' + esc(t.rpeText) + ', tempo ' + esc(t.tempo) + '</div>' +
      '<div class="tags">' + (t.angle ? '<span class="tag">' + esc(t.angle) + '</span>' : '') + (t.intensity ? '<span class="tag hit">Intensity set</span>' : '') + (t.heavy ? '<span class="tag">Heavy: no failure</span>' : '') + '</div>';
  }
  h += '</div><button class="btn small ghost danger" data-act="rm-ex" data-ei="' + ei + '" aria-label="Remove exercise">Remove</button></div>';
  if (t && t.suggestion) h += '<div class="sug ' + sugClass(t.suggestion.kind) + ' small">' + esc(t.suggestion.text) + '</div>';
  else h += '<div class="muted small">' + esc(lastTimeText(e.exId)) + '</div>';
  if (t && t.intensity) h += '<div class="note small">After warm-up sets, do one hard set at RPE 9-9.5. Lower for 3 seconds and stop when form starts to slip. No forced reps, no grinding.</div>';
  if (t && t.cue) h += '<details class="cue"><summary>Form cue</summary><p class="small">' + esc(t.cue) + '</p></details>';
  h += '<div class="setgrid head"><span>Set</span><span>Load (lb)</span><span>Reps</span><span>RPE</span><span>Warm-up</span><span>Done</span></div>';
  let n = 0;
  h += e.sets.map(function (s, si) {
    if (!s.warmup) n++;
    return '<div class="setgrid setrow' + (s.done ? ' done' : '') + '" data-ei="' + ei + '" data-si="' + si + '"><span class="setno">' + (s.warmup ? 'W' : n) + '</span>' +
      '<input class="inp" inputmode="decimal" data-f="load" aria-label="Load in pounds" value="' + (s.load == null ? '' : esc(s.load)) + '">' +
      '<input class="inp" inputmode="numeric" data-f="reps" aria-label="Reps" value="' + (s.reps == null ? '' : esc(s.reps)) + '">' +
      '<input class="inp" inputmode="decimal" data-f="rpe" aria-label="RPE" placeholder="1-10" value="' + (s.rpe == null ? '' : esc(s.rpe)) + '">' +
      '<button class="wtoggle' + (s.warmup ? ' on' : '') + '" data-act="toggle-warm" data-ei="' + ei + '" data-si="' + si + '" aria-pressed="' + (!!s.warmup) + '" aria-label="Mark warm-up set">W</button>' +
      '<button class="check' + (s.done ? ' on' : '') + '" data-act="toggle-done" data-ei="' + ei + '" data-si="' + si + '" aria-pressed="' + (!!s.done) + '" aria-label="Mark set done">&#10003;</button></div>';
  }).join('');
  h += '<div class="btn-row"><button class="btn small" data-act="add-set" data-ei="' + ei + '">Add set</button><button class="btn small ghost" data-act="rm-set" data-ei="' + ei + '">Remove last set</button></div></section>';
  return h;
}
function elapsedText() {
  const aw = S.activeWorkout; if (!aw || !aw.ts) return '';
  const s = Math.floor((Date.now() - aw.ts) / 1000), m = Math.floor(s / 60);
  return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min';
}

/* ---------- Fuel ---------- */
function viewFuel() {
  const ds = ui.fuelDate;
  let h = '<div class="seg" role="tablist"><button class="' + (ui.fuelSub === 'log' ? 'on' : '') + '" data-act="fuel-sub" data-v="log">Log</button><button class="' + (ui.fuelSub === 'library' ? 'on' : '') + '" data-act="fuel-sub" data-v="library">Food library</button></div>';
  if (ui.fuelSub === 'library') return h + viewFoodLibrary();
  const t = dayTotals(ds), st = S.settings, water = S.water[ds] || 0;
  h += '<section class="card"><div class="date-nav"><button class="btn small" data-act="fuel-day" data-d="-1" aria-label="Previous day">&lt;</button><div class="date-nav-mid"><b>' + esc(ds === todayStr() ? 'Today' : fmtDate(ds)) + '</b><span class="muted small">' + esc(fmtDateLong(ds)) + '</span></div><button class="btn small" data-act="fuel-day" data-d="1" aria-label="Next day">&gt;</button></div>' +
    (ds !== todayStr() ? '<div class="btn-row"><button class="btn small ghost" data-act="fuel-day" data-d="0">Jump to today</button></div>' : '') + '</section>';
  h += '<section class="card"><div class="card-head"><h2>Macros</h2><span class="muted small">Remaining: ' + Math.max(0, Math.round(st.calories - t.cal)) + ' kcal</span></div>' +
    macroRow('Calories', t.cal, st.calories, 'kcal', '') + macroRow('Protein', t.p, st.protein, 'g', 'prot') + macroRow('Carbs', t.c, st.carbs, 'g', 'carb') + macroRow('Fat', t.f, st.fat, 'g', 'fat') +
    '<p class="muted small">Targets are starter numbers. Change them under Data, Settings.</p></section>';
  h += '<section class="card"><div class="card-head"><h2>Water</h2><b>' + water + ' / ' + st.waterGoal + ' oz</b></div>' + meter(water, st.waterGoal, 'water') +
    '<div class="btn-row"><button class="btn" data-act="water-add" data-oz="8">+8 oz</button><button class="btn" data-act="water-add" data-oz="16">+16 oz</button><button class="btn" data-act="water-add" data-oz="24">+24 oz</button><button class="btn ghost" data-act="water-add" data-oz="-8">Undo 8 oz</button><button class="btn ghost" data-act="water-custom">Custom</button></div></section>';
  const meals = S.meals.filter(function (m) { return m.date === ds; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
  h += '<section class="card"><div class="card-head"><h2>Meals</h2><button class="btn small primary" data-act="open-meal">Log meal</button></div>';
  if (!meals.length) h += emptyState('No meals logged for this day', 'Tap Log meal, or start from a quick meal.', '<div class="chips">' + S.mealTemplates.slice(0, 3).map(function (tp) { return '<button class="chip" data-act="meal-from-template" data-id="' + tp.id + '">' + esc(tp.name) + '</button>'; }).join('') + '</div>');
  else h += meals.map(function (m) {
    const x = mealTotals(m);
    return '<div class="meal"><div class="row-between"><b>' + esc(m.name) + '</b><span class="muted small">' + Math.round(x.cal) + ' kcal, ' + Math.round(x.p) + 'P ' + Math.round(x.c) + 'C ' + Math.round(x.f) + 'F</span></div>' +
      '<ul class="plain small">' + m.items.map(function (i) { return '<li>' + esc(i.qty) + ' x ' + esc(i.name) + ' <span class="muted">(' + esc(i.serving || 'serving') + ')</span></li>'; }).join('') + '</ul>' +
      '<div class="btn-row"><button class="btn small" data-act="edit-meal" data-id="' + m.id + '">Edit</button><button class="btn small ghost" data-act="dup-meal" data-id="' + m.id + '">Copy to this day</button><button class="btn small ghost danger" data-act="del-meal" data-id="' + m.id + '">Delete</button></div></div>';
  }).join('');
  h += '</section>';
  return h;
}
function macroRow(label, v, t, unit, cls) {
  return '<div class="row-between"><span>' + label + '</span><b>' + Math.round(v) + ' / ' + t + ' ' + unit + '</b></div>' + meter(v, t, cls);
}
function viewFoodLibrary() {
  let h = '<section class="card"><div class="card-head"><h2>Food library</h2><button class="btn small primary" data-act="food-edit" data-id="">Add food</button></div>' +
    '<p class="muted small">Macros are per serving and are starter estimates. Edit anything to match your labels. Foods that contain an avoid-list word are tagged.</p>';
  h += S.foods.map(function (f) {
    const hits = avoidHit(f.name);
    return '<div class="item"><div><b>' + esc(f.name) + '</b>' + (hits.length ? ' <span class="tag warn">On avoid list</span>' : '') + '<div class="muted small">' + esc(f.serving) + ': ' + fmtLoad(f.cal) + ' kcal, ' + fmtLoad(f.p) + 'P ' + fmtLoad(f.c) + 'C ' + fmtLoad(f.f) + 'F</div></div><button class="btn small" data-act="food-edit" data-id="' + f.id + '">Edit</button></div>';
  }).join('') || emptyState('Library is empty', 'Add your first food.');
  h += '</section>';
  h += '<section class="card"><div class="card-head"><h2>Quick meals</h2></div>' + S.mealTemplates.map(function (tp) {
    return '<div class="item"><div><b>' + esc(tp.name) + '</b><div class="muted small">' + tp.items.map(function (i) { const f = S.foods.filter(function (x) { return x.id === i.foodId; })[0]; return esc(i.qty + ' x ' + (f ? f.name : 'removed food')); }).join(', ') + '</div></div><button class="btn small ghost danger" data-act="del-template" data-id="' + tp.id + '">Delete</button></div>';
  }).join('') + '<p class="muted small">Save new quick meals from the Log meal screen. Defaults leave out onions, salsa, tomatoes, jalape\u00f1os and bell peppers.</p></section>';
  return h;
}

/* ---------- Body ---------- */
function viewBody() {
  const sub = ui.sub.body;
  let h = '<div class="seg"><button class="' + (sub === 'measure' ? 'on' : '') + '" data-act="body-sub" data-v="measure">Measurements</button><button class="' + (sub === 'recovery' ? 'on' : '') + '" data-act="body-sub" data-v="recovery">Recovery</button><button class="' + (sub === 'refs' ? 'on' : '') + '" data-act="body-sub" data-v="refs">References</button></div>';
  if (sub === 'recovery') return h + bodyRecovery();
  if (sub === 'refs') return h + bodyRefs();
  const g = S.goals;
  const lw = latestMeasure('weight');
  const wPts = S.measurements.filter(function (m) { return num(m.weight) != null; }).map(function (m) { return { x: parseDate(m.date), y: num(m.weight) }; });
  const rPts = S.references.filter(function (r) { return r.kind === 'weight'; }).map(function (r) { return { x: parseDate(r.date), y: num(r.value), ref: true }; });
  const waPts = S.measurements.filter(function (m) { return num(m.waist) != null; }).map(function (m) { return { x: parseDate(m.date), y: num(m.waist) }; });
  const waRef = S.references.filter(function (r) { return r.kind === 'waist'; }).map(function (r) { return { x: parseDate(r.date), y: num(r.value), ref: true }; });
  h += '<section class="card"><div class="card-head"><h2>Weight</h2><button class="btn small primary" data-act="open-measure">Log measurements</button></div>';
  if (lw) {
    const w = num(lw.weight);
    h += '<div class="stats"><div class="stat"><b>' + fmtLoad(w) + ' lb</b><span class="muted small">Latest, ' + fmtDate(lw.date) + '</span></div><div class="stat"><b>' + (w > g.checkpoint ? round1(w - g.checkpoint) + ' lb' : 'Reached') + '</b><span class="muted small">' + (w > g.checkpoint ? 'to ' + g.checkpoint + ' lb checkpoint' : g.checkpoint + ' lb checkpoint') + '</span></div><div class="stat"><b>' + (w > g.goalHigh ? round1(w - g.goalHigh) + ' lb' : 'In range') + '</b><span class="muted small">' + (w > g.goalHigh ? 'to the ' + g.goalLow + '-' + g.goalHigh + ' lb goal' : g.goalLow + '-' + g.goalHigh + ' lb goal') + '</span></div></div>';
  } else h += '<p class="muted">No current weight logged yet. Hollow dots on the chart are your historical reference points.</p>';
  h += chartHTML('chW', { label: 'Weight over time', series: [{ points: wPts.concat(rPts), color: cssVar('--accent') }], lines: [{ y: g.checkpoint, label: g.checkpoint + ' lb checkpoint' }], band: { lo: g.goalLow, hi: g.goalHigh, label: 'Goal ' + g.goalLow + '-' + g.goalHigh } }) + '</section>';
  h += '<section class="card"><div class="card-head"><h2>Waist</h2></div>' + chartHTML('chWa', { label: 'Waist over time', series: [{ points: waPts.concat(waRef), color: cssVar('--accent') }] }, 160) + '</section>';
  const list = S.measurements.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.ts || 0) - (a.ts || 0); });
  h += '<section class="card"><div class="card-head"><h2>History</h2></div>';
  if (!list.length) h += emptyState('No measurements yet', 'Log weight, waist and other measurements to build your trend.');
  else h += list.map(function (m) {
    const bits = [];
    [['weight', 'lb'], ['waist', 'in'], ['chest', 'in'], ['hips', 'in'], ['neck', 'in'], ['arm', 'in'], ['thigh', 'in']].forEach(function (k) { if (num(m[k[0]]) != null) bits.push(k[0] + ' ' + fmtLoad(num(m[k[0]])) + ' ' + k[1]); });
    return '<div class="item"><div><b>' + esc(fmtDate(m.date)) + '</b><div class="muted small">' + esc(bits.join(', ')) + (m.notes ? '. ' + esc(m.notes) : '') + '</div></div><div class="btn-row tight"><button class="btn small" data-act="edit-measure" data-id="' + m.id + '">Edit</button><button class="btn small ghost danger" data-act="del-measure" data-id="' + m.id + '">Delete</button></div></div>';
  }).join('');
  return h + '</section>';
}
function bodyRecovery() {
  const list = S.checkins.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  const cut = dateStr(Date.now() - 6 * DAY);
  const rec = list.filter(function (c) { return c.date >= cut; });
  const avg = function (k) { const v = rec.map(function (c) { return num(c[k]); }).filter(function (x) { return x != null; }); return v.length ? round1(mean(v)) : null; };
  let h = '<section class="card"><div class="card-head"><h2>Recovery check-ins</h2><button class="btn small primary" data-act="open-checkin">Log check-in</button></div>';
  h += '<div class="stats"><div class="stat"><b>' + (avg('sleepHours') != null ? avg('sleepHours') + ' h' : '-') + '</b><span class="muted small">Avg sleep, 7 days</span></div><div class="stat"><b>' + (avg('fatigue') != null ? avg('fatigue') + '/5' : '-') + '</b><span class="muted small">Avg fatigue, 7 days</span></div><div class="stat"><b>' + rec.length + '</b><span class="muted small">Check-ins, 7 days</span></div></div></section>';
  h += '<section class="card"><div class="card-head"><h2>History</h2></div>';
  if (!list.length) h += emptyState('No check-ins yet', 'A 30-second check-in each morning makes the plan smarter.');
  else h += list.slice(0, 30).map(function (c) {
    const sore = MUSCLES.filter(function (m) { return c.soreness && num(c.soreness[m.id]) > 0; }).map(function (m) { return m.label.toLowerCase() + ' ' + c.soreness[m.id]; });
    const pain = PAIN_AREAS.filter(function (a) { return c.pain && num(c.pain[a.id]) > 0; }).map(function (a) { return a.label.toLowerCase() + ' ' + c.pain[a.id]; });
    return '<div class="item"><div><b>' + esc(fmtDate(c.date)) + '</b><div class="muted small">Sleep ' + (c.sleepHours != null && c.sleepHours !== '' ? esc(c.sleepHours) + ' h' : '-') + ', quality ' + esc(c.sleepQuality || '-') + '/5, fatigue ' + esc(c.fatigue || '-') + '/5' + (sore.length ? '. Sore: ' + esc(sore.join(', ')) : '') + (pain.length ? '. Pain: ' + esc(pain.join(', ')) : '') + (c.notes ? '. ' + esc(c.notes) : '') + '</div></div><div class="btn-row tight"><button class="btn small" data-act="edit-checkin" data-id="' + c.id + '">Edit</button><button class="btn small ghost danger" data-act="del-checkin" data-id="' + c.id + '">Delete</button></div></div>';
  }).join('');
  return h + '</section>';
}
function bodyRefs() {
  const g = S.goals;
  let h = '<section class="card"><div class="card-head"><h2>Historical references</h2><button class="btn small primary" data-act="ref-edit" data-id="">Add</button></div><p class="muted small">Starting points you entered. They are history, not current readings, and you can edit or delete them.</p>';
  h += S.references.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (r) {
    return '<div class="item"><div><b>' + fmtLoad(r.value) + ' ' + esc(r.unit) + '</b> <span class="muted">' + esc(r.label) + '</span><div class="muted small">' + esc(fmtDateLong(r.date)) + ', ' + esc(r.kind) + '</div></div><button class="btn small" data-act="ref-edit" data-id="' + r.id + '">Edit</button></div>';
  }).join('') + '</section>';
  h += '<section class="card"><div class="card-head"><h2>Targets</h2><button class="btn small" data-act="goals-edit">Edit</button></div><div class="stats"><div class="stat"><b>' + g.checkpoint + ' lb</b><span class="muted small">Next checkpoint</span></div><div class="stat"><b>' + g.goalLow + '-' + g.goalHigh + ' lb</b><span class="muted small">Longer-term goal</span></div></div></section>';
  return h;
}

/* ---------- Progress ---------- */
function exercisesWithHistory() {
  const seen = {}; S.workouts.forEach(function (w) { (w.exercises || []).forEach(function (e) { if ((e.sets || []).some(isWorking)) seen[e.exId] = e.name || exName(e.exId); }); });
  return Object.keys(seen).map(function (id) { return { id: id, name: exById(S, id) ? exById(S, id).name : seen[id] }; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
}
function viewProgress() {
  const sub = ui.sub.progress;
  let h = '<div class="seg"><button class="' + (sub === 'strength' ? 'on' : '') + '" data-act="prog-sub" data-v="strength">Strength</button><button class="' + (sub === 'history' ? 'on' : '') + '" data-act="prog-sub" data-v="history">History</button><button class="' + (sub === 'volume' ? 'on' : '') + '" data-act="prog-sub" data-v="volume">Weekly sets</button></div>';
  if (sub === 'history') return h + progressHistory();
  if (sub === 'volume') return h + progressVolume();
  const list = exercisesWithHistory();
  if (!list.length) return h + '<section class="card">' + emptyState('No strength data yet', 'Finish a workout with completed sets and your lifts will chart here.') + '</section>';
  if (!ui.exSel || !list.some(function (x) { return x.id === ui.exSel; })) ui.exSel = list[0].id;
  const ss = exerciseSessions(S, ui.exSel);
  const ex = exById(S, ui.exSel);
  const pts = ss.map(function (x) { return { x: parseDate(x.date), y: round1(bestE1rm(x.sets) || 0) }; }).filter(function (p) { return p.y > 0; });
  const tpts = ss.map(function (x) { return { x: parseDate(x.date), y: Math.max.apply(null, x.sets.map(function (s) { return num(s.load) || 0; })) }; });
  h += '<section class="card"><label class="field"><span>Exercise</span><select class="inp" data-chg="ex-select">' + list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === ui.exSel ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>';
  const bestAll = Math.max.apply(null, ss.map(function (x) { return bestE1rm(x.sets) || 0; }));
  h += '<div class="stats"><div class="stat"><b>' + (bestAll ? Math.round(bestAll) + ' lb' : '-') + '</b><span class="muted small">Best estimated 1RM</span></div><div class="stat"><b>' + ss.length + '</b><span class="muted small">Sessions</span></div><div class="stat"><b>' + esc(fmtDate(ss[ss.length - 1].date)) + '</b><span class="muted small">Last done</span></div></div>';
  h += '<h3>Estimated 1RM per session</h3>' + chartHTML('chE', { label: 'Estimated one rep max by session', series: [{ points: pts, color: cssVar('--accent') }] }, 170);
  h += '<h3>Top load per session</h3>' + chartHTML('chL', { label: 'Top load by session', series: [{ points: tpts, color: cssVar('--good') }] }, 150);
  if (ex) { const sg = suggestLoad(S, ex, {}); h += '<div class="sug ' + sugClass(sg.kind) + ' small">Next time: ' + esc(sg.text) + '</div>'; }
  h += '<p class="muted small">Estimated 1RM uses the Epley formula and only counts sets of 12 reps or fewer. It is an estimate for tracking trends, not a max to attempt.</p></section>';
  h += '<section class="card"><div class="card-head"><h2>Sessions</h2></div>' + ss.slice().reverse().slice(0, 15).map(function (x) {
    const t = topSet(x.sets);
    return '<div class="item"><div><b>' + esc(fmtDate(x.date)) + '</b><div class="muted small">' + x.sets.map(function (s) { return fmtLoad(num(s.load)) + 'x' + s.reps + (num(s.rpe) != null ? '@' + s.rpe : ''); }).join(', ') + '</div></div><span class="muted small">' + (t && e1rm(t.load, t.reps) ? 'e1RM ' + Math.round(e1rm(t.load, t.reps)) : '') + '</span></div>';
  }).join('') + '</section>';
  return h;
}
function progressHistory() {
  const list = sortedWorkouts(S).reverse();
  if (!list.length) return '<section class="card">' + emptyState('No workouts saved yet', 'Finish a workout and it will appear here.') + '</section>';
  return list.map(function (w) {
    const sets = w.exercises.reduce(function (t, e) { return t + e.sets.filter(isWorking).length; }, 0);
    const vol = w.exercises.reduce(function (t, e) { return t + e.sets.filter(isWorking).reduce(function (a, s) { return a + (num(s.load) || 0) * (num(s.reps) || 0); }, 0); }, 0);
    return '<section class="card"><details><summary class="hsum"><div><b>' + esc(w.name) + '</b><div class="muted small">' + esc(fmtDate(w.date)) + ', ' + plural(sets, 'working set') + ', ' + Math.round(vol).toLocaleString() + ' lb volume</div></div></summary>' +
      w.exercises.map(function (e) {
        return '<div class="hex"><b>' + esc(e.name) + '</b><div class="muted small">' + (e.sets.map(function (s) { return (s.warmup ? 'W ' : '') + fmtLoad(num(s.load)) + 'x' + (s.reps == null ? '-' : s.reps) + (num(s.rpe) != null ? '@' + s.rpe : '') + (s.done ? '' : ' (not done)'); }).join(', ') || 'No sets') + '</div></div>';
      }).join('') + (w.notes ? '<p class="small">Notes: ' + esc(w.notes) + '</p>' : '') +
      '<div class="btn-row"><button class="btn small" data-act="edit-workout" data-id="' + w.id + '">Edit</button><button class="btn small ghost danger" data-act="del-workout" data-id="' + w.id + '">Delete</button></div></details></section>';
  }).join('');
}
function progressVolume() {
  const now = Date.now();
  let h = '<section class="card"><div class="card-head"><h2>Working sets, last 7 days</h2></div>';
  h += MUSCLES.map(function (m) {
    const n = weeklySets(S, m.id, now);
    return '<div class="row-between"><span>' + m.label + '</span><b>' + n + ' / ' + m.target + '</b></div>' + meter(n, m.target);
  }).join('');
  return h + '<p class="muted small">Weekly set targets are starting guides for moderate volume. Warm-up sets do not count. Edit exercises, not these numbers, by training more or less.</p></section>';
}

/* ---------- Data ---------- */
function bytesOf(s) { try { return new Blob([s]).size; } catch (e) { return s.length; } }
function viewData() {
  const raw = JSON.stringify(S);
  const kb = Math.round(bytesOf(raw) / 102.4) / 10;
  const st = S.settings;
  let h = '<section class="card"><div class="card-head"><h2>Where your data lives</h2></div><p><strong>This device only.</strong> Everything is saved in this browser\'s local storage on this device. Nothing is uploaded and there is no cloud sync or account. A different phone, browser or private window will not see this data. Clearing website data (or iOS cleaning up unused sites) can erase it, so export backups regularly.</p>' +
    '<p class="small ' + (storageOK ? 'muted' : 'bad-text') + '">' + (storageOK ? 'Storage status: working. Using about ' + kb + ' KB.' : 'Storage status: NOT available. Changes are lost when you close this page. Private browsing can cause this.') + '</p></section>';
  h += '<section class="card"><div class="card-head"><h2>Backup</h2></div><p class="muted small">' + (S.lastBackupAt ? 'Last export: ' + new Date(S.lastBackupAt).toLocaleString() : 'No export yet.') + '</p>' +
    '<div class="btn-row"><button class="btn primary" data-act="export">Export backup (JSON)</button><button class="btn" data-act="share-backup">Share or save to Files</button><button class="btn" data-act="copy-backup">Copy JSON</button></div>' +
    '<div class="btn-row"><label class="btn file">Import backup<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>' +
    '<p class="muted small">Import asks whether to merge or replace, and keeps a safety copy of what you had first.</p></section>';
  h += '<section class="card"><div class="card-head"><h2>Settings</h2></div>' +
    '<h3>Available training days</h3><div class="chips">' + DOW.map(function (d, i) { return '<button class="chip' + (st.availableDays.indexOf(i) >= 0 ? ' on' : '') + '" data-act="toggle-day" data-d="' + i + '" aria-pressed="' + (st.availableDays.indexOf(i) >= 0) + '">' + d + '</button>'; }).join('') + '</div>' +
    '<h3>Daily targets</h3><div class="form-grid">' +
    field('Calories', numInput('s_cal', st.calories, { step: 10 })) + field('Protein (g)', numInput('s_p', st.protein)) + field('Carbs (g)', numInput('s_c', st.carbs)) + field('Fat (g)', numInput('s_f', st.fat)) +
    field('Water (oz)', numInput('s_w', st.waterGoal)) + field('Cardio goal (min/week)', numInput('s_cg', st.cardioWeeklyGoal)) + field('Default rest (sec)', numInput('s_rest', st.restSeconds)) + '</div>' +
    '<label class="field"><span>Foods to avoid by default (comma separated)</span><input class="inp" id="s_avoid" value="' + esc(st.avoid.join(', ')) + '"></label>' +
    '<div class="btn-row"><button class="btn primary" data-act="save-settings">Save settings</button></div></section>';
  h += '<section class="card"><div class="card-head"><h2>Reset</h2></div><p class="muted small">Erases workouts, meals, measurements and settings on this device. Export first.</p><div class="btn-row"><button class="btn danger" data-act="reset-all">Erase all data</button></div></section>';
  h += '<section class="card"><div class="card-head"><h2>About</h2></div><p class="small">Project Ascencion 2.0. Training logic is inspired by public ideas around precise muscle targeting, angles and controlled reps, plus selected high-intensity sets and recovery. It is not affiliated with or endorsed by any coach or athlete. This is a tracking tool, not medical advice. Stop any exercise that causes sharp or worsening pain and talk to a qualified professional.</p>' +
    '<p class="small muted">Cloud sync is not built. A future optional version could add secure Supabase sync with sign-in; see the README for the plan.</p></section>';
  return h;
}

const VIEWS = { today: viewToday, train: viewTrain, fuel: viewFuel, body: viewBody, progress: viewProgress, data: viewData };

/* ---------- shell ---------- */
function renderBanner() {
  const b = $('#banner'); if (!b) return;
  let html = '';
  if (!storageOK) html = '<div class="banner bad">Storage is unavailable in this browser, so nothing can be saved. Leave private browsing, or export your data from the Data tab often.</div>';
  else if (loadNotice) html = '<div class="banner bad">' + esc(loadNotice) + '</div>';
  else {
    const has = S.workouts.length + S.meals.length + S.measurements.length + S.checkins.length + S.cardio.length > 0;
    const age = S.lastBackupAt ? (Date.now() - S.lastBackupAt) / DAY : Infinity;
    if (has && age > 7) html = '<div class="banner">' + (S.lastBackupAt ? 'Last backup was ' + Math.floor(age) + ' days ago.' : 'You have not exported a backup yet.') + ' <button class="linklike" data-act="goto-data">Back up now</button></div>';
  }
  b.innerHTML = html;
}
function updateNav() {
  $$('#tabs button').forEach(function (b) {
    const on = b.getAttribute('data-tab') === ui.tab;
    b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  const td = $('#topDate'); if (td) td.textContent = fmtDate(todayStr());
}
function render(keepScroll) {
  Object.keys(charts).forEach(function (k) { delete charts[k]; });
  const y = window.scrollY;
  $('#view').innerHTML = VIEWS[ui.tab]();
  updateNav(); renderBanner(); drawCharts();
  window.scrollTo(0, keepScroll ? y : 0);
}

/* ============================== sheets (forms) ============================== */
function chipRow(items, selected, act) {
  return '<div class="chips">' + items.map(function (it) {
    return '<button type="button" class="chip' + (selected === it.v ? ' on' : '') + '" data-act="' + act + '" data-v="' + it.v + '" aria-pressed="' + (selected === it.v) + '">' + esc(it.t) + '</button>';
  }).join('') + '</div>';
}
function sheetCheckin(existing) {
  const c = existing || {};
  sheetState = { type: 'checkin', id: c.id || null, date: c.date || todayStr(), sleepQuality: c.sleepQuality || null, fatigue: c.fatigue || null, soreness: Object.assign({}, c.soreness || {}), };
  openSheet(existing ? 'Edit check-in' : 'Recovery check-in', checkinHTML(c));
}
function checkinHTML(c) {
  const st = sheetState;
  const q = [1, 2, 3, 4, 5].map(function (n) { return { v: n, t: String(n) }; });
  return '<div class="form-grid">' + field('Date', '<input class="inp" id="ck_date" type="date" value="' + esc(st.date) + '">') +
    field('Sleep (hours)', numInput('ck_sleep', c.sleepHours, { step: 0.25, min: 0, max: 24, ph: 'e.g. 7' })) + '</div>' +
    '<div class="field"><span>Sleep quality (1 poor, 5 great)</span><div id="ck_sq">' + chipRow(q, st.sleepQuality, 'ck-sq') + '</div></div>' +
    '<div class="field"><span>Fatigue today (1 fresh, 5 wiped out)</span><div id="ck_fa">' + chipRow(q, st.fatigue, 'ck-fa') + '</div></div>' +
    '<div class="field"><span>Soreness (tap to cycle: none, mild, moderate, severe)</span><div class="chips" id="ck_sore">' + soreChips() + '</div></div>' +
    '<div class="field"><span>Pain or joint trouble (0 none, 5 severe)</span><div class="pain-grid">' + PAIN_AREAS.map(function (a) {
      const v = (c.pain && num(c.pain[a.id])) || 0;
      return '<label class="pain-row"><span>' + esc(a.label) + '</span><select class="inp" id="pn_' + a.id + '">' + [0, 1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '"' + (v === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>';
    }).join('') + '</div></div>' +
    field('Notes', '<textarea class="inp" id="ck_notes" rows="2">' + esc(c.notes || '') + '</textarea>') +
    '<div class="btn-row"><button class="btn primary" data-act="save-checkin">Save check-in</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
}
function soreChips() {
  const lab = ['', 'mild', 'moderate', 'severe'];
  return MUSCLES.map(function (m) {
    const v = sheetState.soreness[m.id] || 0;
    return '<button type="button" class="chip s' + v + '" data-act="ck-sore" data-m="' + m.id + '">' + esc(m.label) + (v ? ': ' + lab[v] : '') + '</button>';
  }).join('');
}
function sheetMeasure(m) {
  m = m || {};
  sheetState = { type: 'measure', id: m.id || null };
  openSheet(m.id ? 'Edit measurements' : 'Log measurements',
    '<p class="muted small">Fill only what you measured. Weight in pounds, lengths in inches.</p><div class="form-grid">' +
    field('Date', '<input class="inp" id="ms_date" type="date" value="' + esc(m.date || todayStr()) + '">') +
    field('Weight (lb)', numInput('ms_weight', m.weight, { step: 0.1 })) + field('Waist (in)', numInput('ms_waist', m.waist, { step: 0.25 })) +
    field('Chest (in)', numInput('ms_chest', m.chest, { step: 0.25 })) + field('Hips (in)', numInput('ms_hips', m.hips, { step: 0.25 })) +
    field('Neck (in)', numInput('ms_neck', m.neck, { step: 0.25 })) + field('Arm (in)', numInput('ms_arm', m.arm, { step: 0.25 })) + field('Thigh (in)', numInput('ms_thigh', m.thigh, { step: 0.25 })) + '</div>' +
    field('Notes', '<textarea class="inp" id="ms_notes" rows="2">' + esc(m.notes || '') + '</textarea>') +
    '<div class="btn-row"><button class="btn primary" data-act="save-measure">Save</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}
function sheetCardio() {
  sheetState = { type: 'cardio' };
  openSheet('Log cardio', '<div class="form-grid">' + field('Date', '<input class="inp" id="cd_date" type="date" value="' + todayStr() + '">') +
    field('Type', '<select class="inp" id="cd_type">' + ['Incline walk', 'Walk', 'Bike', 'Stair climber', 'Elliptical', 'Row', 'Swim', 'Other'].map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select>') +
    field('Minutes', numInput('cd_min', '', { step: 1, min: 1, ph: '30' })) + field('Distance (mi, optional)', numInput('cd_dist', '', { step: 0.01 })) + field('Average heart rate (optional)', numInput('cd_hr', '', { step: 1 })) + '</div>' +
    field('Notes', '<input class="inp" id="cd_notes">') +
    '<div class="btn-row"><button class="btn primary" data-act="save-cardio">Save cardio</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}
function sheetSession() {
  const R = recNow();
  const ov = R.override;
  sheetState = { type: 'session', mode: ov ? ov.mode : (R.mode === 'rest' ? 'archetype' : 'archetype'), arch: ov && ov.archetypeId ? ov.archetypeId : (R.chosen && R.chosen.id !== 'custom' ? R.chosen.id : R.archetypes[0].id), muscles: ov && ov.muscles ? ov.muscles.slice() : (R.chosen ? R.chosen.muscles.slice() : []), conservative: !!(ov && ov.conservative), rest: R.mode === 'rest' && !ov };
  openSheet('Change today\'s session', sessionHTML(R));
}
function sessionHTML(R) {
  const st = sheetState;
  let h = '<p class="muted small">Overrides apply to today only. Safety rules still apply: heavy lifts are removed where pain is 2 or higher.</p>';
  h += '<div class="opt-list">' + R.archetypes.map(function (a) {
    const on = st.mode === 'archetype' && st.arch === a.id;
    return '<button type="button" class="opt' + (on ? ' on' : '') + '" data-act="sess-arch" data-v="' + a.id + '" aria-pressed="' + on + '"><b>' + esc(a.label) + '</b><span class="muted small">' + esc(a.sub) + ', readiness ' + a.avgReadiness + '%</span></button>';
  }).join('') + '<button type="button" class="opt' + (st.mode === 'custom' ? ' on' : '') + '" data-act="sess-mode" data-v="custom" aria-pressed="' + (st.mode === 'custom') + '"><b>Pick my own muscles</b><span class="muted small">Choose exactly what to train</span></button>' +
    '<button type="button" class="opt' + (st.mode === 'rest' ? ' on' : '') + '" data-act="sess-mode" data-v="rest" aria-pressed="' + (st.mode === 'rest') + '"><b>Recovery day</b><span class="muted small">No lifting, easy cardio only</span></button></div>';
  if (st.mode === 'custom') {
    h += '<div class="chips">' + MUSCLES.map(function (m) { const on = st.muscles.indexOf(m.id) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-act="sess-muscle" data-m="' + m.id + '" aria-pressed="' + on + '">' + esc(m.label) + '</button>'; }).join('') + '</div>';
  }
  h += '<label class="check-line"><input type="checkbox" id="sess_cons"' + (st.conservative ? ' checked' : '') + '> <span>Keep it conservative (less volume, no intensity sets)</span></label>';
  h += '<div class="btn-row"><button class="btn primary" data-act="sess-apply">Apply</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
  return h;
}
function sheetAddExercise() {
  sheetState = { type: 'addex', q: '' };
  openSheet('Add exercise', '<input class="inp" id="ex_q" placeholder="Search exercises" aria-label="Search exercises"><div id="ex_list">' + addExList('') + '</div>');
}
function addExList(q) {
  q = q.toLowerCase();
  const lib = getLib().filter(function (e) { return !q || e.name.toLowerCase().indexOf(q) >= 0 || MUSCLE_BY_ID[e.muscle].label.toLowerCase().indexOf(q) >= 0; });
  return MUSCLES.map(function (m) {
    const items = lib.filter(function (e) { return e.muscle === m.id; });
    if (!items.length) return '';
    return '<h3>' + m.label + '</h3>' + items.map(function (e) {
      return '<button type="button" class="opt" data-act="add-ex-pick" data-id="' + esc(e.id) + '"><b>' + esc(e.name) + '</b><span class="muted small">' + e.lo + '-' + e.hi + ' reps' + (e.heavy ? ', heavy: keep reps in reserve' : '') + '</span></button>';
    }).join('');
  }).join('') || '<p class="muted">No matches.</p>';
}
function sheetCustomEx() {
  sheetState = { type: 'customex' };
  openSheet('Add custom exercise', '<div class="form-grid">' + field('Name', '<input class="inp" id="cx_name">') +
    field('Muscle group', '<select class="inp" id="cx_muscle">' + MUSCLES.map(function (m) { return '<option value="' + m.id + '">' + m.label + '</option>'; }).join('') + '</select>') +
    field('Type', '<select class="inp" id="cx_type"><option value="isolation">Isolation</option><option value="machine">Machine</option><option value="compound">Compound</option></select>') +
    field('Rep range low', numInput('cx_lo', 8)) + field('Rep range high', numInput('cx_hi', 12)) + field('Load step (lb)', numInput('cx_inc', 5, { step: 0.5 })) + '</div>' +
    '<label class="check-line"><input type="checkbox" id="cx_heavy"> <span>Heavy compound (never auto-prescribed to failure, capped intensity)</span></label>' +
    field('Form cue (optional)', '<input class="inp" id="cx_cue">') +
    '<div class="btn-row"><button class="btn primary" data-act="save-custom-ex">Save exercise</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}

/* ---- meals ---- */
function sheetMeal(meal, tplId, forDate) {
  const mb = { type: 'meal', id: meal ? meal.id : null, date: meal ? meal.date : (forDate || ui.fuelDate), name: meal ? meal.name : 'Lunch', qty: {}, quick: [], q: '' };
  if (meal) meal.items.forEach(function (i) {
    if (i.foodId && S.foods.some(function (f) { return f.id === i.foodId; })) mb.qty[i.foodId] = (mb.qty[i.foodId] || 0) + i.qty;
    else mb.quick.push({ name: i.name, serving: i.serving, qty: i.qty, cal: i.cal, p: i.p, c: i.c, f: i.f, raw: true });
  });
  if (tplId) { const tp = S.mealTemplates.filter(function (t) { return t.id === tplId; })[0]; if (tp) { mb.name = guessMealName(tp.name); tp.items.forEach(function (i) { if (S.foods.some(function (f) { return f.id === i.foodId; })) mb.qty[i.foodId] = i.qty; }); } }
  sheetState = mb;
  openSheet(meal ? 'Edit meal' : 'Log meal',
    '<div class="field"><span>Meal</span>' + chipRow(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'].map(function (n) { return { v: n, t: n }; }), mb.name, 'mb-name') + '</div>' +
    '<div class="field"><span>Quick meals</span><div class="chips">' + S.mealTemplates.map(function (t) { return '<button type="button" class="chip" data-act="mb-template" data-id="' + t.id + '">' + esc(t.name) + '</button>'; }).join('') + '</div></div>' +
    '<div id="mbTotals" class="mb-totals"></div>' +
    '<input class="inp" id="mb_q" placeholder="Search your food library" aria-label="Search foods"><div id="mbList"></div>' +
    '<details class="cue"><summary>Add a one-off food (not in library)</summary><div class="form-grid">' + field('Name', '<input class="inp" id="q_name">') + field('Calories', numInput('q_cal')) + field('Protein (g)', numInput('q_p')) + field('Carbs (g)', numInput('q_c')) + field('Fat (g)', numInput('q_f')) + '</div><div class="btn-row"><button class="btn small" data-act="mb-quick">Add one-off food</button></div></details>' +
    '<div class="btn-row"><button class="btn primary" data-act="save-meal">Save meal</button><button class="btn" data-act="mb-save-template">Save as quick meal</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
  renderMealBuilder();
}
function guessMealName(n) { n = n.toLowerCase(); if (n.indexOf('shake') >= 0) return 'Post-workout'; if (n.indexOf('egg') >= 0 || n.indexOf('pancake') >= 0) return 'Breakfast'; return 'Lunch'; }
function mbItems() {
  const mb = sheetState; const items = [];
  S.foods.forEach(function (f) {
    const q = mb.qty[f.id]; if (!q || q <= 0) return;
    items.push({ foodId: f.id, name: f.name, serving: f.serving, qty: q, cal: round1(f.cal * q), p: round1(f.p * q), c: round1(f.c * q), f: round1(f.f * q) });
  });
  mb.quick.forEach(function (x) { items.push({ foodId: null, name: x.name, serving: x.serving || 'one-off', qty: x.qty || 1, cal: x.cal, p: x.p, c: x.c, f: x.f }); });
  return items;
}
function renderMealBuilder() {
  const mb = sheetState; if (!mb || mb.type !== 'meal') return;
  const items = mbItems();
  const t = mealTotals({ items: items });
  $('#mbTotals').innerHTML = '<b>' + Math.round(t.cal) + ' kcal</b> <span class="muted">' + Math.round(t.p) + 'P ' + Math.round(t.c) + 'C ' + Math.round(t.f) + 'F</span>' +
    (mb.quick.length ? '<div class="small muted">One-off: ' + mb.quick.map(function (x, i) { return esc(x.name) + ' <button class="linklike" data-act="mb-quick-rm" data-i="' + i + '">remove</button>'; }).join(', ') + '</div>' : '');
  const q = (mb.q || '').toLowerCase();
  $('#mbList').innerHTML = S.foods.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) >= 0; }).map(function (f) {
    const v = mb.qty[f.id] || 0;
    const hits = avoidHit(f.name);
    return '<div class="food-row' + (v > 0 ? ' on' : '') + '"><div class="food-info"><b>' + esc(f.name) + '</b>' + (hits.length ? ' <span class="tag warn">Avoid list</span>' : '') + '<div class="muted small">' + esc(f.serving) + ': ' + fmtLoad(f.cal) + ' kcal, ' + fmtLoad(f.p) + 'P ' + fmtLoad(f.c) + 'C ' + fmtLoad(f.f) + 'F</div></div>' +
      '<div class="stepper"><button type="button" class="btn small" data-act="mb-step" data-id="' + f.id + '" data-d="-0.5" aria-label="Less ' + esc(f.name) + '">-</button><span class="qty">' + (v || 0) + '</span><button type="button" class="btn small" data-act="mb-step" data-id="' + f.id + '" data-d="0.5" aria-label="More ' + esc(f.name) + '">+</button></div></div>';
  }).join('') || '<p class="muted">No foods match.</p>';
}
function sheetFood(id) {
  const f = S.foods.filter(function (x) { return x.id === id; })[0] || { name: '', serving: '1 serving', cal: '', p: '', c: '', f: '' };
  sheetState = { type: 'food', id: id || null };
  openSheet(id ? 'Edit food' : 'Add food', '<div class="form-grid">' + field('Name', '<input class="inp" id="fd_name" value="' + esc(f.name) + '">') + field('Serving size', '<input class="inp" id="fd_serving" value="' + esc(f.serving) + '">') +
    field('Calories', numInput('fd_cal', f.cal)) + field('Protein (g)', numInput('fd_p', f.p, { step: 0.1 })) + field('Carbs (g)', numInput('fd_c', f.c, { step: 0.1 })) + field('Fat (g)', numInput('fd_f', f.f, { step: 0.1 })) + '</div>' +
    '<p class="muted small">Macros are per one serving. Meals you already logged keep their old numbers.</p>' +
    '<div class="btn-row"><button class="btn primary" data-act="save-food">Save food</button>' + (id ? '<button class="btn ghost danger" data-act="del-food">Delete</button>' : '') + '<button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}
function sheetRef(id) {
  const r = S.references.filter(function (x) { return x.id === id; })[0] || { kind: 'weight', label: '', date: todayStr(), value: '', unit: 'lb' };
  sheetState = { type: 'ref', id: id || null };
  openSheet(id ? 'Edit reference' : 'Add reference', '<div class="form-grid">' +
    field('Type', '<select class="inp" id="rf_kind"><option value="weight"' + (r.kind === 'weight' ? ' selected' : '') + '>Weight (lb)</option><option value="waist"' + (r.kind === 'waist' ? ' selected' : '') + '>Waist (in)</option></select>') +
    field('Label', '<input class="inp" id="rf_label" value="' + esc(r.label) + '">') + field('Date', '<input class="inp" id="rf_date" type="date" value="' + esc(r.date) + '">') + field('Value', numInput('rf_value', r.value, { step: 0.05 })) + '</div>' +
    '<div class="btn-row"><button class="btn primary" data-act="save-ref">Save</button>' + (id ? '<button class="btn ghost danger" data-act="del-ref">Delete</button>' : '') + '<button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}
function sheetGoals() {
  const g = S.goals; sheetState = { type: 'goals' };
  openSheet('Edit targets', '<div class="form-grid">' + field('Next checkpoint (lb)', numInput('gl_cp', g.checkpoint, { step: 0.5 })) + field('Goal range low (lb)', numInput('gl_lo', g.goalLow, { step: 0.5 })) + field('Goal range high (lb)', numInput('gl_hi', g.goalHigh, { step: 0.5 })) + '</div><div class="btn-row"><button class="btn primary" data-act="save-goals">Save</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
}

/* ============================== workout logic ============================== */
function newSet(load) { return { id: uid(), load: load == null ? '' : load, reps: '', rpe: '', done: false, warmup: false }; }
function makeWorkoutExercise(p) {
  const n = p.sets || 3;
  const L = p.suggestion && p.suggestion.load != null ? p.suggestion.load : '';
  const sets = []; for (let i = 0; i < n; i++) sets.push(newSet(L));
  return { id: uid(), exId: p.exId, name: p.name, muscle: p.muscle, target: { sets: p.sets, lo: p.lo, hi: p.hi, rpeText: p.rpeText, tempo: p.tempo, angle: p.angle, cue: p.cue, intensity: p.intensity, heavy: p.heavy, suggestion: p.suggestion }, sets: sets };
}
function startWorkoutFromPlan(R) {
  const plan = getPlan(R);
  if (!plan.length) { toast('No exercises matched. Starting an empty workout.'); }
  S.activeWorkout = { id: uid(), date: todayStr(), ts: Date.now(), name: R.chosen ? R.chosen.label : 'Workout', muscles: R.chosen ? R.chosen.muscles.slice() : [], exercises: plan.map(makeWorkoutExercise), notes: '' };
  save(); ui.tab = 'train'; render();
}
function finishWorkout() {
  const aw = S.activeWorkout; if (!aw) return;
  const doneSets = aw.exercises.reduce(function (t, e) { return t + e.sets.filter(isWorking).length; }, 0);
  if (!doneSets) { if (!confirm('No sets are marked done (with reps). Discard this workout instead?')) return; S.activeWorkout = null; save(); render(); return; }
  const notes = $('#awNotes'); if (notes) aw.notes = notes.value;
  const fin = JSON.parse(JSON.stringify(aw));
  fin.exercises = fin.exercises.filter(function (e) { return e.sets.some(function (s) { return s.done || num(s.reps) > 0; }); }).map(function (e) {
    e.sets = e.sets.filter(function (s) { return s.done || num(s.reps) > 0 || num(s.load) > 0; }).map(function (s) { s.load = num(s.load); s.reps = num(s.reps); s.rpe = num(s.rpe); return s; });
    delete e.target.cue; return e;
  });
  const editing = fin.editingId; delete fin.editingId;
  // PR check against history excluding this workout
  const prior = { workouts: S.workouts.filter(function (w) { return w.id !== fin.id; }) };
  const prs = [];
  fin.exercises.forEach(function (e) {
    const best = bestE1rm(e.sets.filter(isWorking)); if (best == null) return;
    const hist = exerciseSessions(prior, e.exId).map(function (x) { return bestE1rm(x.sets); }).filter(function (x) { return x != null; });
    if (!hist.length || best > Math.max.apply(null, hist) * 1.001) prs.push({ name: e.name, e1: Math.round(best), first: !hist.length });
  });
  if (editing) { S.workouts = S.workouts.map(function (w) { return w.id === fin.id ? Object.assign(fin, { ts: w.ts, endTs: w.endTs || Date.now() }) : w; }); }
  else { fin.endTs = Date.now(); S.workouts.push(fin); }
  S.activeWorkout = null; ui.plan = null; stopRest(); save();
  const vol = fin.exercises.reduce(function (t, e) { return t + e.sets.filter(isWorking).reduce(function (a, s) { return a + (s.load || 0) * (s.reps || 0); }, 0); }, 0);
  openSheet('Workout saved', '<p><b>' + plural(doneSets, 'working set') + '</b> across ' + plural(fin.exercises.length, 'exercise') + ', ' + Math.round(vol).toLocaleString() + ' lb total volume.</p>' +
    (prs.length ? '<h3>Estimated 1RM highs</h3><ul class="plain">' + prs.map(function (p) { return '<li>' + esc(p.name) + ': ' + p.e1 + ' lb' + (p.first ? ' (first logged)' : ' (new best)') + '</li>'; }).join('') + '</ul>' : '<p class="muted">No new estimated-1RM highs this time. Consistency counts.</p>') +
    '<p class="muted small">Next sessions will use these numbers for conservative load suggestions.</p><div class="btn-row"><button class="btn primary" data-act="sheet-close">Done</button></div>');
  ui.tab = 'today'; render();
}

/* rest timer */
let rest = null, restTick = null, elapsedTick = null;
function startRest(sec) {
  rest = { end: Date.now() + sec * 1000 }; drawRest();
  clearInterval(restTick); restTick = setInterval(drawRest, 250);
}
function stopRest() { rest = null; clearInterval(restTick); restTick = null; drawRest(); }
function drawRest() {
  const el = $('#restBar'); if (!el) return;
  if (!rest) { el.classList.remove('show'); el.innerHTML = ''; return; }
  const left = Math.ceil((rest.end - Date.now()) / 1000);
  if (left <= 0) { toast('Rest is over. Next set.'); try { if (navigator.vibrate) navigator.vibrate(200); } catch (e) { /* ignore */ } stopRest(); return; }
  el.classList.add('show');
  el.innerHTML = '<span>Rest <b>' + Math.floor(left / 60) + ':' + pad(left % 60) + '</b></span><button class="btn small" data-act="rest-add">+15s</button><button class="btn small ghost" data-act="rest-stop">Skip</button>';
}

/* ============================== backup / import ============================== */
function backupObject() { return { app: APP_ID, schema: SCHEMA, exportedAt: new Date().toISOString(), note: 'Project Ascencion backup. Keep this file somewhere safe.', data: S }; }
function backupText() { return JSON.stringify(backupObject(), null, 2); }
function backupName() { return 'project-ascencion-backup-' + todayStr() + '.json'; }
function markBackup() { S.lastBackupAt = Date.now(); save(); }
function doExport() {
  const text = backupText();
  try {
    const blob = new Blob([text], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = backupName(); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    markBackup(); toast('Backup file created. Check your downloads.'); render(true);
  } catch (e) { toast('Download failed. Use Copy JSON instead.'); }
}
function doShare() {
  const text = backupText();
  try {
    const file = new File([text], backupName(), { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Project Ascencion backup' }).then(function () { markBackup(); toast('Backup shared.'); render(true); }).catch(function () { /* cancelled */ });
      return;
    }
  } catch (e) { /* fall through */ }
  toast('Sharing files is not supported here. Use Export or Copy JSON.');
}
function doCopy() {
  const text = backupText();
  function fallback() {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; } ta.remove();
    if (ok) { markBackup(); toast('Backup JSON copied.'); render(true); } else toast('Copy blocked by the browser. Use Export instead.');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { markBackup(); toast('Backup JSON copied.'); render(true); }).catch(fallback);
  else fallback();
}
let pendingImport = null;
function handleImportFile(file) {
  const r = new FileReader();
  r.onerror = function () { toast('Could not read that file.'); };
  r.onload = function () {
    let obj;
    try { obj = JSON.parse(String(r.result)); } catch (e) { toast('That file is not valid JSON.'); return; }
    const data = obj && obj.app === APP_ID && obj.data ? obj.data : (obj && obj.app === APP_ID && obj.workouts ? obj : null);
    if (!data) { toast('That file is not a Project Ascencion backup.'); return; }
    pendingImport = normalize(data);
    const p = pendingImport;
    sheetState = { type: 'import' };
    openSheet('Import backup', '<p>Found ' + plural(p.workouts.length, 'workout') + ', ' + plural(p.meals.length, 'meal') + ', ' + plural(p.measurements.length, 'measurement') + ', ' + plural(p.checkins.length, 'check-in') + ' and ' + plural(p.cardio.length, 'cardio entry') + '.</p>' +
      '<p class="small muted">A safety copy of your current data is saved first.</p>' +
      '<div class="opt-list"><button class="opt" data-act="import-merge"><b>Merge</b><span class="muted small">Add what is missing. Keeps your current settings and anything already here.</span></button><button class="opt" data-act="import-replace"><b>Replace everything</b><span class="muted small">Use the backup exactly as it is.</span></button></div><div class="btn-row"><button class="btn ghost" data-act="sheet-close">Cancel</button></div>');
  };
  r.readAsText(file);
}
function mergeById(a, b) { const ids = {}; a.forEach(function (x) { if (x && x.id) ids[x.id] = 1; }); return a.concat(b.filter(function (x) { return x && (!x.id || !ids[x.id]); })); }
function applyImport(mode) {
  if (!pendingImport) return;
  try { localStorage.setItem(PREIMPORT_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  const p = pendingImport;
  if (mode === 'replace') { S = normalize(p); }
  else {
    ['references', 'checkins', 'measurements', 'workouts', 'cardio', 'foods', 'mealTemplates', 'meals', 'customExercises'].forEach(function (k) { S[k] = mergeById(S[k], p[k]); });
    Object.keys(p.water).forEach(function (d) { if (S.water[d] == null) S.water[d] = p.water[d]; });
    Object.keys(p.overrides).forEach(function (d) { if (!S.overrides[d]) S.overrides[d] = p.overrides[d]; });
  }
  pendingImport = null; ui.plan = null; loadNotice = ''; save(); closeSheet(); toast(mode === 'replace' ? 'Backup restored.' : 'Backup merged.'); render();
}

/* ============================== event handling ============================== */
function readSheetInt(id) { const e = $('#' + id); return e ? num(e.value) : null; }
function val(id) { const e = $('#' + id); return e ? e.value : ''; }

const ACT = {
  tab: function (t) { ui.tab = t.getAttribute('data-tab'); render(); },
  'goto-train': function () { ui.tab = 'train'; render(); },
  'goto-data': function () { ui.tab = 'data'; render(); },
  'sheet-close': function () { closeSheet(); },
  'open-checkin': function () { const c = S.checkins.filter(function (x) { return x.date === todayStr(); })[0]; sheetCheckin(c || null); },
  'edit-checkin': function (t) { const c = S.checkins.filter(function (x) { return x.id === t.dataset.id; })[0]; if (c) sheetCheckin(c); },
  'ck-sq': function (t) { sheetState.sleepQuality = +t.dataset.v; $('#ck_sq').innerHTML = chipRow([1, 2, 3, 4, 5].map(function (n) { return { v: n, t: String(n) }; }), sheetState.sleepQuality, 'ck-sq'); },
  'ck-fa': function (t) { sheetState.fatigue = +t.dataset.v; $('#ck_fa').innerHTML = chipRow([1, 2, 3, 4, 5].map(function (n) { return { v: n, t: String(n) }; }), sheetState.fatigue, 'ck-fa'); },
  'ck-sore': function (t) { const m = t.dataset.m; sheetState.soreness[m] = ((sheetState.soreness[m] || 0) + 1) % 4; $('#ck_sore').innerHTML = soreChips(); },
  'save-checkin': function () {
    const date = val('ck_date') || todayStr();
    const pain = {}; PAIN_AREAS.forEach(function (a) { const v = num(val('pn_' + a.id)) || 0; if (v > 0) pain[a.id] = v; });
    const sore = {}; Object.keys(sheetState.soreness).forEach(function (k) { if (sheetState.soreness[k] > 0) sore[k] = sheetState.soreness[k]; });
    const rec = { id: sheetState.id || uid(), date: date, sleepHours: num(val('ck_sleep')), sleepQuality: sheetState.sleepQuality, fatigue: sheetState.fatigue, soreness: sore, pain: pain, notes: val('ck_notes').trim(), ts: Date.now() };
    if (rec.sleepHours == null && !rec.sleepQuality && !rec.fatigue && !Object.keys(sore).length && !Object.keys(pain).length) { toast('Add at least one answer first.'); return; }
    S.checkins = S.checkins.filter(function (c) { return c.id !== rec.id && c.date !== date; }); S.checkins.push(rec);
    ui.plan = null; save(); closeSheet(); toast('Check-in saved.'); render(true);
  },
  'del-checkin': function (t) { if (confirm('Delete this check-in?')) { S.checkins = S.checkins.filter(function (c) { return c.id !== t.dataset.id; }); ui.plan = null; save(); render(true); } },

  'open-measure': function () { sheetMeasure(null); },
  'edit-measure': function (t) { const m = S.measurements.filter(function (x) { return x.id === t.dataset.id; })[0]; if (m) sheetMeasure(m); },
  'save-measure': function () {
    const rec = { id: sheetState.id || uid(), date: val('ms_date') || todayStr(), notes: val('ms_notes').trim(), ts: Date.now() };
    let any = false;
    ['weight', 'waist', 'chest', 'hips', 'neck', 'arm', 'thigh'].forEach(function (k) { const v = readSheetInt('ms_' + k); rec[k] = v; if (v != null) any = true; });
    if (!any) { toast('Enter at least one measurement.'); return; }
    if (rec.weight != null && (rec.weight < 50 || rec.weight > 700)) { toast('Check the weight. It should be in pounds.'); return; }
    S.measurements = S.measurements.filter(function (m) { return m.id !== rec.id; }); S.measurements.push(rec);
    save(); closeSheet(); toast('Measurements saved.'); render(true);
  },
  'del-measure': function (t) { if (confirm('Delete this entry?')) { S.measurements = S.measurements.filter(function (m) { return m.id !== t.dataset.id; }); save(); render(true); } },
  'body-sub': function (t) { ui.sub.body = t.dataset.v; render(true); },
  'ref-edit': function (t) { sheetRef(t.dataset.id || ''); },
  'save-ref': function () {
    const v = readSheetInt('rf_value'); if (v == null || v <= 0) { toast('Enter a value.'); return; }
    const kind = val('rf_kind');
    const rec = { id: sheetState.id || uid(), kind: kind, label: val('rf_label').trim() || (kind === 'waist' ? 'Waist' : 'Weight'), date: val('rf_date') || todayStr(), value: v, unit: kind === 'waist' ? 'in' : 'lb' };
    S.references = S.references.filter(function (r) { return r.id !== rec.id; }); S.references.push(rec); save(); closeSheet(); toast('Reference saved.'); render(true);
  },
  'del-ref': function () { if (confirm('Delete this reference point?')) { S.references = S.references.filter(function (r) { return r.id !== sheetState.id; }); save(); closeSheet(); render(true); } },
  'goals-edit': function () { sheetGoals(); },
  'save-goals': function () {
    const cp = readSheetInt('gl_cp'), lo = readSheetInt('gl_lo'), hi = readSheetInt('gl_hi');
    if (cp == null || lo == null || hi == null || lo > hi) { toast('Check the numbers. Low must not exceed high.'); return; }
    S.goals = { checkpoint: cp, goalLow: lo, goalHigh: hi }; save(); closeSheet(); toast('Targets saved.'); render(true);
  },

  'open-cardio': function () { sheetCardio(); },
  'save-cardio': function () {
    const m = readSheetInt('cd_min'); if (m == null || m <= 0) { toast('Enter the minutes.'); return; }
    S.cardio.push({ id: uid(), date: val('cd_date') || todayStr(), type: val('cd_type'), minutes: m, distance: readSheetInt('cd_dist'), avgHr: readSheetInt('cd_hr'), notes: val('cd_notes').trim(), ts: Date.now() });
    save(); closeSheet(); toast('Cardio saved.'); render(true);
  },
  'del-cardio': function (t) { if (confirm('Delete this cardio entry?')) { S.cardio = S.cardio.filter(function (c) { return c.id !== t.dataset.id; }); save(); render(true); } },

  'open-session': function () { sheetSession(); },
  'sess-arch': function (t) { sheetState.mode = 'archetype'; sheetState.arch = t.dataset.v; refreshSession(); },
  'sess-mode': function (t) { sheetState.mode = t.dataset.v; refreshSession(); },
  'sess-muscle': function (t) { const m = t.dataset.m, i = sheetState.muscles.indexOf(m); if (i >= 0) sheetState.muscles.splice(i, 1); else sheetState.muscles.push(m); refreshSession(); },
  'sess-apply': function () {
    const st = sheetState; const cons = $('#sess_cons') ? $('#sess_cons').checked : false;
    const ds = todayStr();
    if (st.mode === 'rest') S.overrides[ds] = { mode: 'rest', conservative: cons };
    else if (st.mode === 'custom') { if (!st.muscles.length) { toast('Pick at least one muscle group.'); return; } S.overrides[ds] = { mode: 'custom', muscles: st.muscles.slice(), conservative: cons }; }
    else S.overrides[ds] = { mode: 'archetype', archetypeId: st.arch, conservative: cons };
    ui.plan = null; save(); closeSheet(); toast('Session updated for today.'); render(true);
  },
  'clear-override': function () { delete S.overrides[todayStr()]; ui.plan = null; save(); toast('Back to the suggestion.'); render(true); },
  'start-today': function () {
    if (S.activeWorkout) { ui.tab = 'train'; render(); return; }
    startWorkoutFromPlan(recNow());
  },
  'start-empty': function () {
    if (S.activeWorkout && !confirm('You already have a workout in progress. Replace it?')) return;
    S.activeWorkout = { id: uid(), date: todayStr(), ts: Date.now(), name: 'Custom workout', muscles: [], exercises: [], notes: '' }; save(); ui.tab = 'train'; render(); sheetAddExercise();
  },
  'swap-ex': function (t) {
    const i = +t.dataset.i, cur = ui.plan[i]; if (!cur) return;
    const R = recNow(); const plan = ui.plan;
    const cands = getLib().filter(function (e) { return e.muscle === cur.muscle && e.id !== cur.exId && !plan.some(function (p) { return p.exId === e.id; }); });
    if (!cands.length) { toast('No other exercises for this muscle yet. Add a custom one.'); return; }
    ui.swaps[i] = (ui.swaps[i] || 0) + 1;
    const pick = cands[(ui.swaps[i] - 1) % cands.length];
    const pl = (R.byId[cur.muscle] && R.byId[cur.muscle].pain) || 0;
    if (pl >= 2 && pick.heavy) { toast('Heavy lifts are skipped while that area has pain. Tap swap again.'); return; }
    const hold = R.level !== 'green' || pl >= 2;
    ui.plan[i] = prescribe(S, pick, { sets: hold ? Math.max(2, pick.sets - 1) : pick.sets, holdAll: hold, caution: pl >= 2, intensity: cur.intensity && !pick.heavy && (pick.type === 'machine' || pick.type === 'isolation') });
    render(true);
  },

  'rm-ex': function (t) { const aw = S.activeWorkout; if (!aw) return; if (confirm('Remove this exercise and its sets?')) { aw.exercises.splice(+t.dataset.ei, 1); save(); render(true); } },
  'add-set': function (t) { const e = S.activeWorkout.exercises[+t.dataset.ei]; const last = e.sets[e.sets.length - 1]; e.sets.push(newSet(last ? last.load : '')); save(); render(true); },
  'rm-set': function (t) { const e = S.activeWorkout.exercises[+t.dataset.ei]; if (e.sets.length) { e.sets.pop(); save(); render(true); } },
  'toggle-warm': function (t) { const s = S.activeWorkout.exercises[+t.dataset.ei].sets[+t.dataset.si]; s.warmup = !s.warmup; save(); render(true); },
  'toggle-done': function (t) {
    const e = S.activeWorkout.exercises[+t.dataset.ei]; const s = e.sets[+t.dataset.si];
    // pull latest typed values from the row before validating
    const row = t.closest('.setrow'); if (row) $$('input[data-f]', row).forEach(function (inp) { s[inp.dataset.f] = num(inp.value); });
    if (!s.done && !(num(s.reps) > 0)) { toast('Enter reps first.'); return; }
    s.done = !s.done; save();
    if (s.done && !s.warmup) {
      const heavy = e.target && e.target.heavy;
      if (heavy && num(s.rpe) >= 10) toast('RPE 10 on a heavy lift. Next time, stop with reps in reserve.', 3500);
      else if (e.target && e.target.intensity) startRest(Math.max(120, S.settings.restSeconds));
      else startRest(heavy ? Math.max(120, S.settings.restSeconds) : S.settings.restSeconds);
    }
    render(true);
  },
  'rest-add': function () { if (rest) { rest.end += 15000; drawRest(); } },
  'rest-stop': function () { stopRest(); },
  'finish-workout': function () { finishWorkout(); },
  'discard-workout': function () { if (confirm(S.activeWorkout.editingId ? 'Cancel editing? Your saved workout stays as it was.' : 'Discard this workout? Logged sets will be lost.')) { S.activeWorkout = null; stopRest(); save(); render(); } },
  'open-add-ex': function () { sheetAddExercise(); },
  'add-ex-pick': function (t) {
    const ex = exById(S, t.dataset.id); if (!ex || !S.activeWorkout) { closeSheet(); return; }
    const p = prescribe(S, ex, { holdAll: recNow().level !== 'green' });
    S.activeWorkout.exercises.push(makeWorkoutExercise(p)); save(); closeSheet(); toast(ex.name + ' added.'); render(true);
  },
  'open-custom-ex': function () { sheetCustomEx(); },
  'save-custom-ex': function () {
    const name = val('cx_name').trim(); if (!name) { toast('Give the exercise a name.'); return; }
    const lo = readSheetInt('cx_lo') || 8, hi = readSheetInt('cx_hi') || 12; if (lo > hi) { toast('Rep range low must not exceed high.'); return; }
    S.customExercises.push({ id: 'cx_' + uid(), name: name, muscle: val('cx_muscle'), type: val('cx_type'), heavy: $('#cx_heavy').checked, lo: lo, hi: hi, inc: readSheetInt('cx_inc') || 5, sets: 3, role: 'optional', angle: 'Custom', cue: val('cx_cue').trim() });
    ui.plan = null; save(); closeSheet(); toast('Exercise added.'); render(true);
  },
  'edit-workout': function (t) {
    if (S.activeWorkout && !confirm('You have a workout in progress. Replace it with this edit?')) return;
    const w = S.workouts.filter(function (x) { return x.id === t.dataset.id; })[0]; if (!w) return;
    const c = JSON.parse(JSON.stringify(w)); c.editingId = w.id;
    c.exercises.forEach(function (e) { e.sets.forEach(function (s) { if (s.load == null) s.load = ''; if (s.reps == null) s.reps = ''; if (s.rpe == null) s.rpe = ''; }); if (!e.target) e.target = null; });
    S.activeWorkout = c; save(); ui.tab = 'train'; render();
  },
  'del-workout': function (t) { if (confirm('Delete this workout from history?')) { S.workouts = S.workouts.filter(function (w) { return w.id !== t.dataset.id; }); ui.plan = null; save(); render(true); } },
  'prog-sub': function (t) { ui.sub.progress = t.dataset.v; render(true); },

  'fuel-sub': function (t) { ui.fuelSub = t.dataset.v; render(true); },
  'fuel-day': function (t) { const d = +t.dataset.d; ui.fuelDate = d === 0 ? todayStr() : addDays(ui.fuelDate, d); render(true); },
  'water-add': function (t) { const ds = ui.tab === 'fuel' ? ui.fuelDate : todayStr(); S.water[ds] = Math.max(0, (S.water[ds] || 0) + (+t.dataset.oz)); save(); render(true); },
  'water-custom': function () { const v = num(prompt('How many ounces of water to add?', '12')); if (v != null && v !== 0) { S.water[ui.fuelDate] = Math.max(0, (S.water[ui.fuelDate] || 0) + v); save(); render(true); } },
  'open-meal': function () { sheetMeal(null, null, ui.tab === 'fuel' ? ui.fuelDate : todayStr()); },
  'meal-from-template': function (t) { sheetMeal(null, t.dataset.id, ui.fuelDate); },
  'edit-meal': function (t) { const m = S.meals.filter(function (x) { return x.id === t.dataset.id; })[0]; if (m) sheetMeal(m); },
  'dup-meal': function (t) { const m = S.meals.filter(function (x) { return x.id === t.dataset.id; })[0]; if (!m) return; const c = JSON.parse(JSON.stringify(m)); c.id = uid(); c.date = ui.fuelDate; c.ts = Date.now(); S.meals.push(c); save(); toast('Meal copied.'); render(true); },
  'del-meal': function (t) { if (confirm('Delete this meal?')) { S.meals = S.meals.filter(function (m) { return m.id !== t.dataset.id; }); save(); render(true); } },
  'mb-name': function (t) { sheetState.name = t.dataset.v; $$('[data-act="mb-name"]').forEach(function (b) { const on = b.dataset.v === sheetState.name; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); },
  'mb-template': function (t) {
    const tp = S.mealTemplates.filter(function (x) { return x.id === t.dataset.id; })[0]; if (!tp) return;
    sheetState.qty = {}; tp.items.forEach(function (i) { if (S.foods.some(function (f) { return f.id === i.foodId; })) sheetState.qty[i.foodId] = i.qty; }); renderMealBuilder();
  },
  'mb-step': function (t) { const id = t.dataset.id; const v = Math.max(0, (sheetState.qty[id] || 0) + (+t.dataset.d)); if (v) sheetState.qty[id] = v; else delete sheetState.qty[id]; renderMealBuilder(); },
  'mb-quick': function () {
    const name = val('q_name').trim() || 'One-off food'; const cal = readSheetInt('q_cal');
    if (cal == null) { toast('Enter calories for the one-off food.'); return; }
    sheetState.quick.push({ name: name, serving: 'one-off', qty: 1, cal: cal, p: readSheetInt('q_p') || 0, c: readSheetInt('q_c') || 0, f: readSheetInt('q_f') || 0 });
    ['q_name', 'q_cal', 'q_p', 'q_c', 'q_f'].forEach(function (id) { $('#' + id).value = ''; }); renderMealBuilder(); toast('One-off food added.');
  },
  'mb-quick-rm': function (t) { sheetState.quick.splice(+t.dataset.i, 1); renderMealBuilder(); },
  'mb-save-template': function () {
    const items = []; Object.keys(sheetState.qty).forEach(function (id) { items.push({ foodId: id, qty: sheetState.qty[id] }); });
    if (!items.length) { toast('Pick at least one library food first.'); return; }
    const name = (prompt('Name this quick meal:', '') || '').trim(); if (!name) return;
    S.mealTemplates.push({ id: uid(), name: name, items: items }); save(); toast('Quick meal saved.'); ACT['open-meal-refresh']();
  },
  'open-meal-refresh': function () { const keep = sheetState; sheetMeal(null, null, keep.date); sheetState.qty = keep.qty; sheetState.quick = keep.quick; sheetState.name = keep.name; renderMealBuilder(); },
  'save-meal': function () {
    const items = mbItems(); if (!items.length) { toast('Add at least one food.'); return; }
    const hits = []; items.forEach(function (i) { if (avoidHit(i.name).length) hits.push(i.name); });
    const rec = { id: sheetState.id || uid(), date: sheetState.date, name: sheetState.name, items: items, ts: Date.now() };
    if (sheetState.id) { const old = S.meals.filter(function (m) { return m.id === sheetState.id; })[0]; if (old) rec.ts = old.ts || rec.ts; }
    S.meals = S.meals.filter(function (m) { return m.id !== rec.id; }); S.meals.push(rec); save(); closeSheet();
    toast(hits.length ? 'Meal saved. Note: it includes an avoid-list food.' : 'Meal saved.', hits.length ? 3500 : 2400); render(true);
  },
  'food-edit': function (t) { sheetFood(t.dataset.id || ''); },
  'save-food': function () {
    const name = val('fd_name').trim(); const cal = readSheetInt('fd_cal');
    if (!name || cal == null) { toast('Name and calories are required.'); return; }
    const rec = { id: sheetState.id || ('f_' + uid()), name: name, serving: val('fd_serving').trim() || '1 serving', cal: cal, p: readSheetInt('fd_p') || 0, c: readSheetInt('fd_c') || 0, f: readSheetInt('fd_f') || 0, note: '' };
    const i = S.foods.findIndex(function (f) { return f.id === rec.id; }); if (i >= 0) { rec.note = S.foods[i].note || ''; S.foods[i] = rec; } else S.foods.push(rec);
    save(); closeSheet(); toast(avoidHit(name).length ? 'Saved. It matches your avoid list.' : 'Food saved.'); render(true);
  },
  'del-food': function () { if (confirm('Delete this food from the library? Logged meals keep their numbers.')) { S.foods = S.foods.filter(function (f) { return f.id !== sheetState.id; }); save(); closeSheet(); render(true); } },
  'del-template': function (t) { if (confirm('Delete this quick meal?')) { S.mealTemplates = S.mealTemplates.filter(function (x) { return x.id !== t.dataset.id; }); save(); render(true); } },

  'toggle-day': function (t) { const d = +t.dataset.d, a = S.settings.availableDays, i = a.indexOf(d); if (i >= 0) a.splice(i, 1); else a.push(d); a.sort(); ui.plan = null; save(); render(true); },
  'save-settings': function () {
    const st = S.settings;
    const g = function (id, d) { const v = readSheetInt(id); return v != null && v >= 0 ? v : d; };
    st.calories = g('s_cal', st.calories); st.protein = g('s_p', st.protein); st.carbs = g('s_c', st.carbs); st.fat = g('s_f', st.fat); st.waterGoal = g('s_w', st.waterGoal); st.cardioWeeklyGoal = g('s_cg', st.cardioWeeklyGoal); st.restSeconds = Math.max(15, g('s_rest', st.restSeconds));
    st.avoid = val('s_avoid').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean);
    save(); toast('Settings saved.'); render(true);
  },
  export: function () { doExport(); },
  'share-backup': function () { doShare(); },
  'copy-backup': function () { doCopy(); },
  'import-merge': function () { applyImport('merge'); },
  'import-replace': function () { if (confirm('Replace ALL current data with the backup?')) applyImport('replace'); },
  'reset-all': function () {
    if (!confirm('Erase ALL data on this device? This cannot be undone. Export a backup first if unsure.')) return;
    if (!confirm('Really erase everything?')) return;
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
    S = defaultState(); ui.plan = null; stopRest(); save(); toast('All data erased.'); render();
  }
};
function refreshSession() { const R = recNow(); $('#sheetBody').innerHTML = sessionHTML(R); }

document.addEventListener('click', function (e) {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const fn = ACT[t.getAttribute('data-act')];
  if (fn) { if (t.tagName === 'A') e.preventDefault(); fn(t, e); }
});
document.addEventListener('input', function (e) {
  const t = e.target;
  if (t.id === 'awNotes' && S.activeWorkout) { S.activeWorkout.notes = t.value; save(); return; }
  if (t.id === 'mb_q' && sheetState && sheetState.type === 'meal') { sheetState.q = t.value; renderMealBuilder(); return; }
  if (t.id === 'ex_q') { $('#ex_list').innerHTML = addExList(t.value); return; }
  if (t.dataset && t.dataset.f && S.activeWorkout) {
    const row = t.closest('.setrow'); if (!row) return;
    const s = S.activeWorkout.exercises[+row.dataset.ei].sets[+row.dataset.si];
    s[t.dataset.f] = t.value === '' ? '' : num(t.value); save();
  }
});
document.addEventListener('change', function (e) {
  const t = e.target;
  if (t.id === 'importFile') { if (t.files && t.files[0]) handleImportFile(t.files[0]); t.value = ''; return; }
  if (t.getAttribute && t.getAttribute('data-chg') === 'ex-select') { ui.exSel = t.value; render(true); return; }
  if (t.dataset && t.dataset.f === 'rpe' && S.activeWorkout) {
    const v = num(t.value); if (v != null) { const c = clamp(Math.round(v * 2) / 2, 1, 10); t.value = c; const row = t.closest('.setrow'); S.activeWorkout.exercises[+row.dataset.ei].sets[+row.dataset.si].rpe = c; save(); }
  }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('#sheetRoot').firstChild) closeSheet(); });
let rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(drawCharts, 150); });
window.addEventListener('beforeunload', function () { save(); });

/* ============================== boot ============================== */
function boot() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }
  elapsedTick = setInterval(function () { const el = $('#elapsed'); if (el && S.activeWorkout) el.textContent = elapsedText(); }, 15000);
  render();
}
global.Ascencion = { getState: function () { return S; }, setState: function (x) { S = normalize(x); save(); render(); }, render: render, ui: ui, ACT: ACT, engine: global.AscencionEngine };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

})(window);
