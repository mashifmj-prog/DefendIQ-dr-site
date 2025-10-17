/* DefendIQ - Main Application Script
   - Initializes event listeners and state
   - Manages mode transitions
*/

document.addEventListener('DOMContentLoaded', () => {
  restoreState();
  loadQuestions();

  // Landing page buttons
  const trainingBtn = document.getElementById('trainingBtn');
  const supportBtn = document.getElementById('supportBtn');
  if (trainingBtn) trainingBtn.addEventListener('click', () => enterTrainingMode());
  if (supportBtn) supportBtn.addEventListener('click', () => enterSupportMode());

  // Navigation
  const homeBtn = document.getElementById('homeBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const feedbackBtn = document.getElementById('feedbackBtn');
  const closeModuleBtn = document.getElementById('closeModuleBtn');
  if (homeBtn) homeBtn.addEventListener('click', goHome);
  if (refreshBtn) refreshBtn.addEventListener('click', refreshCurrentView);
  if (feedbackBtn) feedbackBtn.addEventListener('click', showFeedback);
  if (closeModuleBtn) closeModuleBtn.addEventListener('click', closeModule);
});

/* ---------- Navigation Functions ---------- */
function goHome() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('landing').classList.remove('hidden');
  currentMode = 'landing';
  saveState();
  console.log('Returned to home page');
}

function enterTrainingMode() {
  currentMode = 'training';
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.querySelector('.quiz-dropdown').classList.remove('hidden');
  document.querySelector('.stats-area').classList.remove('hidden');
  renderTrainingDashboard();
  saveState();
  console.log('Entered Training Mode');
}

function enterSupportMode() {
  currentMode = 'support';
  document.getElementById('landing').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.querySelector('.quiz-dropdown').classList.add('hidden');
  document.querySelector('.stats-area').classList.add('hidden');
  document.querySelector('.module-title').textContent = 'Support Mode';
  renderSupportMode();
  saveState();
  console.log('Entered Support Mode');
}

function refreshCurrentView() {
  if (currentMode === 'training') {
    if (current.mode === 'selection') renderModuleSelection();
    else if (current.mode === 'material') renderLearningMaterial();
    else if (current.mode === 'quiz') renderQuestion();
    else if (current.mode === 'certificate') showCertificate(current.certificate.moduleName, current.certificate.timestamp, current.certificate.hash);
  } else if (currentMode === 'support') {
    renderSupportMode();
  }
  console.log('Refreshed current view');
}

function showFeedback() {
  alert('Thank you for your feedback! Your input helps us improve DefendIQ.');
  console.log('Feedback submitted');
}

function sanitize(s) {
  return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}