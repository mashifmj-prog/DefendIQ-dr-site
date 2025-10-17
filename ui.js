const moduleBody = document.getElementById('moduleBody');
const moduleSelect = document.createElement('select');
moduleSelect.className = 'quiz-dropdown hidden';
const selectWrap = document.createElement('div');
selectWrap.className = 'select-wrap';
selectWrap.appendChild(moduleSelect);
document.querySelector('.module-header').prepend(selectWrap);

function renderTrainingDashboard() {
  if (!Object.keys(MODULES).length) {
    moduleBody.innerHTML = '<p>Loading modules...</p>';
    return;
  }
  current.mode = 'selection';
  saveState();
  document.querySelector('.module-title').textContent = 'Training Dashboard';
  moduleBody.innerHTML = `
    <div class="training-dashboard">
      <canvas id="globalProgressChart" style="max-width: 400px; margin: 20px auto;"></canvas>
      <div class="analytics">
        <h3>Progress Analytics</h3>
        <ul>
          ${Object.keys(stats.moduleProgress).map(key => `
            <li>${MODULES[key].title}: ${stats.moduleProgress[key].completionPercentage}% complete, ${stats.moduleProgress[key].correctPercentage}% correct</li>
          `).join('')}
        </ul>
      </div>
      <div class="affirmation" id="globalAffirmation"></div>
      <div class="module-selection">
        <p>Select a module from the dropdown above to view materials and quizzes.</p>
      </div>
    </div>`;
  moduleSelect.classList.remove('hidden');
  renderGlobalProgressChart();
  populateModuleDropdown();
}

function renderModuleSelection() {
  if (!Object.keys(MODULES).length) {
    moduleBody.innerHTML = '<p>Unable to load modules. Please check your connection or refresh the page.</p><button id="retryBtn" class="action-btn">Retry</button>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadQuestions());
    return;
  }
  current.mode = 'selection';
  saveState();
  const mod = MODULES[current.key];
  if (!mod) {
    closeModule();
    return;
  }
  const prog = keyProgressCache[current.key] || { answered: [], correct: [] };
  const completion = (prog.answered.length / mod.questions.length) * 100;

  moduleBody.innerHTML = `
    <div class="module-selection">
      <canvas id="moduleProgressChart" style="max-width: 300px; margin: 20px auto;"></canvas>
      <div class="analytics">
        <h4>${mod.title} Analytics</h4>
        <p>Completion: ${completion}% | Correct: ${prog.answered.length ? Math.round((prog.correct.length / prog.answered.length) * 100) : 0}%</p>
      </div>
      <div class="affirmation" id="moduleAffirmation"></div>
      <button id="learningMaterialBtn" class="action-btn">Learning Material</button>
      <button id="takeQuizBtn" class="action-btn">Take a Quiz</button>
    </div>`;

  const ctx = document.getElementById('moduleProgressChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Completion', 'Correct'],
      datasets: [{
        data: [completion, prog.answered.length ? Math.round((prog.correct.length / prog.answered.length) * 100) : 0],
        backgroundColor: ['#8affc1', '#9fb4ff'],
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    },
    options: {
      animation: false,
      scales: { y: { beginAtZero: true, max: 100 } },
      plugins: { legend: { display: false }, title: { display: true, text: `${mod.title} Progress`, color: '#ffffff' } }
    }
  });

  const affirmations = [
    completion < 30 ? "You're starting strong! Dive into this module!" :
    completion < 60 ? "You're making great progress! Keep it up!" :
    completion < 100 ? "Almost done! You're killing it!" :
    "Module complete! You're a cybersecurity star!"
  ];
  document.getElementById('moduleAffirmation').textContent = affirmations[0];

  document.getElementById('learningMaterialBtn').addEventListener('click', () => {
    current.mode = 'material';
    saveState();
    renderLearningMaterial();
  });
  document.getElementById('takeQuizBtn').addEventListener('click', () => {
    current.mode = 'quiz';
    saveState();
    renderQuestion();
  });
}

function renderLearningMaterial() {
  if (!Object.keys(MODULES).length || !MODULES[current.key]) {
    moduleBody.innerHTML = '<p>Unable to load modules. Please check your connection or refresh the page.</p><button id="retryBtn" class="action-btn">Retry</button>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadQuestions());
    return;
  }
  current.mode = 'material';
  saveState();
  const mod = MODULES[current.key];
  moduleBody.innerHTML = `
    <div class="learning-material">
      <h3>Learning Points for ${mod.title}</h3>
      <ul>
        ${mod.points.map(point => `<li>${sanitize(point)}</li>`).join('')}
      </ul>
      <button id="backToSelectionBtn" class="action-btn">Back to Module</button>
    </div>`;
  document.getElementById('backToSelectionBtn').addEventListener('click', () => {
    current.mode = 'selection';
    saveState();
    renderModuleSelection();
  });
}

function renderSupportMode() {
  const moduleBody = document.getElementById('moduleBody');
  const time = new Date().getHours();
  const greeting = time < 12 ? "Good morning!" : time < 17 ? "Good afternoon!" : "Good evening!";
  moduleBody.innerHTML = `
    <div class="support-mode">
      <h2>${greeting} Welcome to Support Mode!</h2>
      <p>I'm here to assist with AI-powered guidance, affirmations, and tips. Ask anything!</p>
      <div class="affirmation" id="supportAffirmation"></div>
      <div class="learning-tip" id="supportTip"></div>
      <div class="support-chat-history" id="chatHistory"></div>
      <textarea id="supportInput" placeholder="Ask about phishing, get tips, or share your thoughts..."></textarea>
      <button id="sendSupport">Send</button>
    </div>`;
  updateAffirmation();
  startSupportTips();
  const sendButton = document.getElementById('sendSupport');
  const supportInput = document.getElementById('supportInput');
  const chatHistory = document.getElementById('chatHistory');
  if (sendButton && supportInput && chatHistory) {
    supportInput.addEventListener('input', (e) => {
      let typingPreview = document.getElementById('typingPreview');
      if (!typingPreview) {
        typingPreview = document.createElement('div');
        typingPreview.id = 'typingPreview';
        typingPreview.className = 'support-chat-message user typing';
        chatHistory.appendChild(typingPreview);
      }
      typingPreview.textContent = e.target.value;
      chatHistory.scrollTop = chatHistory.scrollHeight;
    });
    sendButton.addEventListener('click', () => {
      const inputValue = supportInput.value.trim();
      if (inputValue) {
        const typingPreview = document.getElementById('typingPreview');
        if (typingPreview) typingPreview.remove();
        const userMessage = document.createElement('div');
        userMessage.className = 'support-chat-message user';
        userMessage.textContent = inputValue;
        chatHistory.appendChild(userMessage);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        try {
          console.log('Sending:', inputValue);
          handleSupportInput(inputValue, chatHistory);
        } catch (error) {
          console.error('Send failed:', error);
          const errorMessage = document.createElement('div');
          errorMessage.className = 'support-chat-message ai';
          errorMessage.textContent = 'Oops, something went wrong. Try again!';
          chatHistory.appendChild(errorMessage);
          chatHistory.scrollTop = chatHistory.scrollHeight;
        }
        supportInput.value = '';
      } else {
        console.log('No input to send');
      }
    });
  }
}

function updateAffirmation() {
  const affirmations = [
    "You’ve got this—every step builds your skills!",
    "Confidence grows with each challenge you tackle.",
    "Your effort is making the digital world safer!"
  ];
  const affirmationElement = document.getElementById('supportAffirmation');
  if (affirmationElement) affirmationElement.textContent = affirmations[Math.floor(Math.random() * affirmations.length)];
}

function populateModuleDropdown() {
  moduleSelect.innerHTML = '<option value="">Select a Module</option>';
  Object.keys(MODULES).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = MODULES[key].title;
    moduleSelect.appendChild(option);
  });
  moduleSelect.addEventListener('change', (e) => {
    current.key = e.target.value;
    saveState();
    renderModuleSelection();
  });
}

function renderGlobalProgressChart() {
  const totalModules = Object.keys(MODULES).length;
  const completedModules = stats.badges.length;
  const ctx = document.getElementById('globalProgressChart').getContext('2d');
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: [completedModules, totalModules - completedModules],
        backgroundColor: ['#8affc1', '#666'],
        borderColor: '#ffffff',
        borderWidth: 1
      }]
    },
    options: {
      animation: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#ffffff' } }, title: { display: true, text: 'Global Progress', color: '#ffffff' } }
    }
  });
}