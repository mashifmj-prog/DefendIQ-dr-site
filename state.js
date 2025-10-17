let currentMode = 'landing';
let current = { key: null, idx: 0, mode: 'selection', certificate: null };
let keyProgressCache = {};
let stats = { points: 0, streak: 0, completion: 0, badges: [], moduleProgress: {} };
let chartInstance;

function saveState() {
  localStorage.setItem('defendiqState', JSON.stringify({ currentMode, current, keyProgressCache, stats }));
}

function restoreState() {
  const state = localStorage.getItem('defendiqState');
  if (state) {
    const parsed = JSON.parse(state);
    currentMode = parsed.currentMode || 'landing';
    current = parsed.current || { key: null, idx: 0, mode: 'selection', certificate: null };
    keyProgressCache = parsed.keyProgressCache || {};
    stats = parsed.stats || { points: 0, streak: 0, completion: 0, badges: [], moduleProgress: {} };
    if (currentMode === 'training' || currentMode === 'support') {
      document.getElementById('landing').classList.add('hidden');
      document.getElementById('app').classList.remove('hidden');
      if (currentMode === 'training') renderTrainingDashboard();
      else renderSupportMode();
    }
  }
}

function saveStats() {
  stats.streakDOM = document.getElementById('streak');
  stats.pointsDOM = document.getElementById('points');
  stats.completionDOM = document.getElementById('completion');
  stats.badgesDOM = document.getElementById('badges');
  if (stats.streakDOM) stats.streakDOM.textContent = stats.streak;
  if (stats.pointsDOM) stats.pointsDOM.textContent = stats.points;
  if (stats.completionDOM) stats.completionDOM.textContent = `${stats.completion}%`;
  if (stats.badgesDOM) stats.badgesDOM.textContent = stats.badges.length ? stats.badges.join(', ') : 'None';
  updateModuleProgress();
  saveState();
}

function updateModuleProgress() {
  const totalModules = Object.keys(MODULES).length;
  Object.keys(MODULES).forEach(key => {
    const mod = MODULES[key];
    const prog = keyProgressCache[key] || { answered: [], correct: [] };
    stats.moduleProgress[key] = {
      completed: prog.answered.length === mod.questions.length && prog.correct.length === mod.questions.length,
      completionPercentage: Math.round((prog.answered.length / mod.questions.length) * 100),
      correctPercentage: prog.answered.length ? Math.round((prog.correct.length / prog.answered.length) * 100) : 0
    };
  });
  stats.completion = Math.round((stats.badges.length / totalModules) * 100);
}