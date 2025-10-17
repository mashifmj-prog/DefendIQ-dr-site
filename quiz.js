function renderQuestion() {
  if (!Object.keys(MODULES).length || !MODULES[current.key]) {
    moduleBody.innerHTML = '<p>Unable to load modules. Please check your connection or refresh the page.</p><button id="retryBtn" class="action-btn">Retry</button>';
    document.getElementById('retryBtn')?.addEventListener('click', () => loadQuestions());
    return;
  }
  current.mode = 'quiz';
  saveState();
  const mod = MODULES[current.key];
  const qObj = mod.questions[current.idx];
  const prog = keyProgressCache[current.key] || { answered: [], correct: [] };
  const isAnswered = prog.answered.includes(current.idx);

  const pct = Math.round(((current.idx + 1) / mod.questions.length) * 100);

  moduleBody.innerHTML = `
    <div class="question-card" aria-live="polite">
      <div class="q-text">${sanitize(qObj.q)}</div>
      <div class="options">
        ${qObj.opts.map((o, i) => `<button class="opt-btn" data-i="${i}" ${isAnswered ? 'disabled' : ''}>${sanitize(o)}</button>`).join('')}
      </div>
      <div class="progress-wrap">
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
      </div>
      <div class="controls">
        <button class="prev-btn" ${current.idx === 0 ? 'disabled' : ''}>Previous</button>
        <button class="next-btn" ${current.idx === mod.questions.length - 1 ? '' : 'disabled'}>${current.idx === mod.questions.length - 1 ? 'Finish Module' : 'Next Question'}</button>
        <div style="flex:1"></div>
        <div class="badge-strip" aria-hidden="true">
          ${stats.badges && stats.badges.length ? stats.badges.map(b => `<span class="badge">${b}</span>`).join('') : ''}
        </div>
      </div>
    </div>`;

  if (isAnswered) {
    moduleBody.querySelectorAll('.opt-btn').forEach(ob => {
      const idx = Number(ob.dataset.i);
      if (mod.questions[current.idx].opts[idx] === qObj.opts[qObj.a]) {
        ob.classList.add('correct');
      } else if (prog.correct.includes(current.idx) && idx !== qObj.a) {
        ob.classList.add('incorrect');
      }
    });
    moduleBody.querySelector('.next-btn').disabled = false;
  }

  moduleBody.querySelectorAll('.opt-btn').forEach(btn => btn.addEventListener('click', onOptionClicked));
  const prev = moduleBody.querySelector('.prev-btn');
  const next = moduleBody.querySelector('.next-btn');

  prev?.addEventListener('click', () => {
    if (current.idx > 0) {
      current.idx--;
      saveState();
      slideTransition('left');
      renderQuestion();
    }
  });

  if (current.idx === mod.questions.length - 1) {
    next.addEventListener('click', finishModule);
  } else {
    next.addEventListener('click', () => {
      if (current.idx < mod.questions.length - 1) {
        current.idx++;
        saveState();
        slideTransition('right');
        renderQuestion();
      }
    });
  }
}

function onOptionClicked(ev) {
  const btn = ev.currentTarget;
  const chosenIndex = Number(btn.dataset.i);
  const mod = MODULES[current.key];
  const qObj = mod.questions[current.idx];
  const prog = keyProgressCache[current.key] || { answered: [], correct: [] };

  if (prog.answered.includes(current.idx)) return;

  moduleBody.querySelectorAll('.opt-btn').forEach(ob => {
    ob.disabled = true;
    const idx = Number(ob.dataset.i);
    if (mod.questions[current.idx].opts[idx] === qObj.opts[qObj.a]) {
      ob.classList.add('correct');
    }
    if (idx === chosenIndex && qObj.a !== idx) ob.classList.add('incorrect');
  });

  if (chosenIndex === qObj.a) {
    stats.points += 10;
    stats.streak += 1;
    prog.correct.push(current.idx);
    flashNextButton();
    triggerConfetti(true);
  } else {
    stats.streak = 0;
    triggerConfetti(false);
  }

  prog.answered.push(current.idx);
  keyProgressCache[current.key] = prog;
  saveModuleProgress(keyProgressCache).then(() => {
    const nextBtn = moduleBody.querySelector('.next-btn');
    if (nextBtn) nextBtn.disabled = false;
    updateModuleProgress();
    updateModuleCompletionStats().then(saveStats);
    animatePoints();
  });
}

function finishModule() {
  if (!stats.badges.includes(MODULES[current.key].title)) {
    stats.badges.push(MODULES[current.key].title);
    triggerConfetti(true);
  }
  stats.points += 50;
  stats.streak += 1;
  updateModuleProgress();
  updateModuleCompletionStats().then(saveStats).then(() => {
    animatePoints();
    showCertificate(MODULES[current.key].title);
  });
}

function closeModule() {
  current = { key: null, idx: 0, mode: 'selection', certificate: null };
  saveState();
  moduleSelect.selectedIndex = 0;
  moduleBody.innerHTML = `
    <div class="learning-tip" id="learningTips"></div>
    <canvas id="globalProgressChart" style="max-width: 400px; margin: 20px auto;"></canvas>
    <div class="affirmation" id="globalAffirmation"></div>`;
  document.querySelector('.module-title').textContent = 'Select a module to begin';
  startLearningTips();
  renderGlobalProgressChart();
}

function showCertificate(moduleName, timestamp = new Date().toISOString(), hash = generateHash(moduleName + timestamp)) {
  current.mode = 'certificate';
  current.certificate = { moduleName, timestamp, hash };
  saveState();
  const verifyUrl = `https://api.defendiq.com/verify?hash=${hash}`;
  const qrCodeId = 'qrcode-' + hash;

  moduleBody.innerHTML = `
    <div class="certificate-wrapper">
      <div class="certificate-card" id="certificateCard">
        <div class="cert-inner">
          <h1 class="cert-title">Certificate of Appreciation</h1>
          <div contenteditable="true" id="certName" class="cert-name" aria-label="Recipient name">Name Surname</div>
          <p class="cert-body">This certificate is presented to the recipient in recognition of successful completion of the <span class="module-name">${sanitize(moduleName)}</span> training module.</p>
          <div class="cert-meta">
            <div>Date: <span id="certDate">${new Date(timestamp).toLocaleDateString()}</span></div>
            <div>Certificate ID: <span id="certHash">${hash}</span></div>
          </div>
          <div class="cert-signature">Signature: Jonas Mashifane, Cybersecurity Lead</div>
          <div id="${qrCodeId}" class="cert-qr"></div>
          <div class="cert-logo">DefendIQ</div>
        </div>
      </div>
      <div class="cert-actions">
        <button id="printCert">Print</button>
        <button id="downloadPNG">Download PNG</button>
        <button id="downloadPDF">Download PDF</button>
        <button id="shareCert">Share</button>
        <button id="closeCert">Close Certificate</button>
      </div>
    </div>`;

  QRCode.toCanvas(document.getElementById(qrCodeId), verifyUrl, { width: 100, scale: 8 }, (err) => {
    if (err) console.error('QR Code generation failed:', err);
  });

  document.getElementById('printCert').addEventListener('click', () => window.print());
  document.getElementById('closeCert').addEventListener('click', () => closeModule());
  document.getElementById('downloadPNG').addEventListener('click', async () => await downloadCertificatePNG());
  document.getElementById('downloadPDF').addEventListener('click', async () => await downloadCertificatePDF());
  document.getElementById('shareCert').addEventListener('click', async () => await shareCertificate(verifyUrl, moduleName, hash));
}

async function downloadCertificatePNG() {
  const node = document.getElementById('certificateCard');
  if (!node) return alert('Certificate not ready');
  const canvas = await html2canvas(node, { scale: 4 });
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'DefendIQ_Certificate.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadCertificatePDF() {
  const node = document.getElementById('certificateCard');
  if (!node) return alert('Certificate not ready');
  const canvas = await html2canvas(node, { scale: 4 });
  const imgData = canvas.toDataURL('image/png');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'landscape' });
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight - 10);
  pdf.save('DefendIQ_Certificate.pdf');
}

async function shareCertificate(verifyUrl, moduleName, hash) {
  const node = document.getElementById('certificateCard');
  if (!node) return alert('Certificate not ready');
  const canvas = await html2canvas(node, { scale: 2 });
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const file = new File([blob], 'DefendIQ_Certificate.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'DefendIQ Certificate',
        text: `I completed the ${moduleName} module on DefendIQ. Verify here: ${verifyUrl}\nCertificate ID: ${hash}`
      });
    } catch (err) {
      console.warn('Share canceled or failed:', err);
    }
  } else {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      alert('Sharing not supported. Verification link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Sharing not supported. Please copy the link manually: ' + verifyUrl);
    }
  }
}

function generateHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}

function updateModuleCompletionStats() {
  const totalModules = Object.keys(MODULES).length;
  stats.completion = Math.round((stats.badges.length / totalModules) * 100);
  return Promise.resolve();
}

function flashNextButton() {
  const nextBtn = moduleBody.querySelector('.next-btn');
  if (!nextBtn) return;
  nextBtn.animate([
    { transform: 'scale(1)', boxShadow: '0 0 8px rgba(255,204,0,0.5)' },
    { transform: 'scale(1.06)', boxShadow: '0 0 24px rgba(255,204,0,0.95)' }
  ], { duration: 450, iterations: 1 });
}

function animatePoints() {
  const start = Number(stats.pointsDOM.textContent);
  const end = stats.points;
  const duration = 500;
  const startTime = performance.now();

  function update() {
    const now = performance.now();
    const progress = Math.min((now - startTime) / duration, 1);
    const currentPoints = Math.round(start + (end - start) * progress);
    stats.pointsDOM.textContent = currentPoints;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function slideTransition(dir = 'right') {
  moduleBody.style.transition = 'transform 0.28s ease, opacity 0.28s ease';
  moduleBody.style.opacity = '0';
  moduleBody.style.transform = dir === 'right' ? 'translateX(12px)' : 'translateX(-12px)';
  setTimeout(() => {
    moduleBody.style.opacity = '1';
    moduleBody.style.transform = 'translateX(0)';
  }, 260);
}

function startLearningTips() {
  const tips = [
    "Stay curious—ask questions to deepen your understanding!",
    "Practice spotting phishing emails daily for better skills.",
    "Take a moment to review a module you’ve completed."
  ];
  let index = 0;
  const tipElement = document.getElementById('learningTips');
  function showNextTip() {
    tipElement.textContent = tips[index];
    tipElement.classList.remove('fade-out');
    void tipElement.offsetWidth; // Trigger reflow
    tipElement.classList.add('fade-out');
    index = (index + 1) % tips.length;
    setTimeout(showNextTip, 7000); // Increased to 7 seconds
  }
  showNextTip();
}

function startSupportTips() {
  const tips = [
    "Stay curious—ask questions to deepen your understanding!",
    "Try the Phishing Simulation module for hands-on practice.",
    "Confidence grows with each question you answer correctly."
  ];
  let index = 0;
  const tipElement = document.getElementById('supportTip');
  function showNextTip() {
    tipElement.textContent = tips[index];
    tipElement.classList.remove('fade-out');
    void tipElement.offsetWidth;
    tipElement.classList.add('fade-out');
    index = (index + 1) % tips.length;
    setTimeout(showNextTip, 7000);
  }
  showNextTip();
}