/* ==========================================================================
   LOCK//IN — FULL INTERACTIVE PROTOTYPE ENGINE (src/app.js)
   Run this to test the entire 4-part loop right now in Live Server!
   ========================================================================== */

const state = {
  streak: 3,
  activeBlockId: null,
  timerSeconds: 0,
  timerInterval: null,
  activeProofTaskId: null,
  gauntletQueue: [],
  gauntletIndex: 0,
  gauntletPassed: 0,

  blocks: [
    { id: 'b1', time: '09:00 - 10:00', title: 'Binary Search Trees & Rotations', tag: '#cs', verified: false },
    { id: 'b2', time: '11:30 - 12:30', title: 'Linear Algebra: Eigenvalues', tag: '#math', verified: false },
    { id: 'b3', time: '15:00 - 16:00', title: 'Cold War Geopolitics', tag: '#history', verified: true }
  ],

  todos: [
    { id: 't1', title: 'Implement Red-Black Tree Balancing', tag: '#cs', level: 2, status: 'LOCKED', passed: 0, req: 2 },
    { id: 't2', title: 'Derive Characteristic Polynomials', tag: '#math', level: 1, status: 'LOCKED', passed: 0, req: 1 },
    { id: 't3', title: 'Summarize the Cuban Missile Crisis', tag: '#history', level: 1, status: 'UNLOCKED', passed: 1, req: 1 }
  ],

  cards: [
    { id: 'c1', tag: '#cs', q: 'What is the worst-case time complexity of searching a balanced Red-Black Tree?', a: 'O(log n) — because the tree height is guaranteed to stay logarithmic.' },
    { id: 'c2', tag: '#cs', q: 'In a Red-Black Tree, if a node is Red, what color MUST both of its children be?', a: 'Black (No two adjacent Red nodes are allowed).' },
    { id: 'c3', tag: '#math', q: 'What equation defines an Eigenvalue (λ) and Eigenvector (v) of matrix A?', a: 'A * v = λ * v  (or det(A - λI) = 0).' }
  ]
};

// 1. RENDER TELEMETRY & TOPBAR
function renderTelemetry() {
  document.getElementById('streak-count').textContent = `${state.streak} 🔥`;
  const unlocked = state.todos.filter(t => t.status === 'UNLOCKED').length;
  document.getElementById('unlocked-count').textContent = `${unlocked} / ${state.todos.length}`;
  document.getElementById('due-cards-badge').textContent = state.cards.length;
}

// 2. RENDER GOOGLE CALENDAR / SCHEDULE BLOCKS
function renderCalendar() {
  const filter = document.getElementById('calendar-filter-tag').value;
  const container = document.getElementById('calendar-timeline');
  const filtered = filter === 'ALL' ? state.blocks : state.blocks.filter(b => b.tag === filter);

  container.innerHTML = filtered.map(b => `
    <div class="cal-block ${state.activeBlockId === b.id ? 'active-session' : ''} ${b.verified ? 'verified-block' : ''}" data-id="${b.id}">
      <div class="cal-block-top">
        <span>${b.time}</span>
        <span class="tag-pill">${b.tag}</span>
      </div>
      <div class="cal-block-title">${b.title}</div>
      <div class="cal-block-actions">
        <span>${b.verified ? '✅ VERIFIED' : (state.activeBlockId === b.id ? '⚡ FOCUS RUNNING' : 'Click to Start Focus')}</span>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.cal-block').forEach(el => {
    el.onclick = () => startCalendarSession(el.dataset.id);
  });
}

function startCalendarSession(blockId) {
  const block = state.blocks.find(b => b.id === blockId);
  if (!block || block.verified) return;

  state.activeBlockId = blockId;
  state.timerSeconds = 0;
  document.getElementById('active-block-title').textContent = block.title;
  document.getElementById('btn-verify-block').disabled = false;

  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.timerSeconds++;
    const mins = String(Math.floor(state.timerSeconds / 60)).padStart(2, '0');
    const secs = String(state.timerSeconds % 60).padStart(2, '0');
    document.getElementById('session-timer').textContent = `${mins}:${secs}`;
  }, 1000);

  renderCalendar();
  pushChatMessage('SYSTEM', `Started Focus Block: "${block.title}". Click "Verify & Unlock" in the top bar when ready.`);
}

// 3. RENDER LOCKED TO-DO LIST
function renderTodos() {
  const list = document.getElementById('todo-list');
  list.innerHTML = state.todos.map(t => {
    const icon = t.status === 'UNLOCKED' ? '🔓' : (t.status === 'GAUNTLET' ? '⚔️' : '🔒');
    const metaText = t.status === 'UNLOCKED' 
      ? 'PROOF VERIFIED' 
      : `Proof: ${t.passed}/${t.req} Cards Passed`;

    return `
      <li class="todo-item status-${t.status}">
        <div class="todo-left">
          <button class="btn-padlock" data-id="${t.id}" title="Click to Unlock via Proof-of-Work">${icon}</button>
          <div class="todo-info">
            <span class="todo-title">${t.title}</span>
            <div class="todo-meta">
              <span class="tag-pill">${t.tag}</span>
              <span>${metaText}</span>
            </div>
          </div>
        </div>
        <div class="todo-actions">
          ${t.status !== 'UNLOCKED' ? `<button class="btn-secondary btn-interrogate" data-id="${t.id}">Ask AI Viva</button>` : ''}
        </div>
      </li>
    `;
  }).join('');

  list.querySelectorAll('.btn-padlock').forEach(btn => {
    btn.onclick = () => openProofModal(btn.dataset.id);
  });

  list.querySelectorAll('.btn-interrogate').forEach(btn => {
    btn.onclick = () => startAIInterrogation(btn.dataset.id);
  });
}

// 4. PROOF-OF-WORK MODAL & GAUNTLET LAUNCHER
function openProofModal(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo || todo.status === 'UNLOCKED') return;

  state.activeProofTaskId = todoId;
  document.getElementById('proof-modal-title').textContent = `🔒 UNLOCK: ${todo.title}`;
  document.getElementById('proof-notes-input').value = '';
  document.getElementById('proof-modal').classList.remove('hidden');
}

function submitNotesAndStartGauntlet() {
  const notes = document.getElementById('proof-notes-input').value.trim();
  const todo = state.todos.find(t => t.id === state.activeProofTaskId);
  if (!todo) return;

  if (notes.length < 15) {
    alert('⚠️ Gatekeeper Rejected: Write at least a sentence explaining what you studied!');
    return;
  }

  // Auto-generate a flashcard from user's notes!
  const newCard = {
    id: 'c_' + Date.now(),
    tag: todo.tag,
    q: `Explain key concept from "${todo.title}"`,
    a: notes
  };
  state.cards.unshift(newCard);

  todo.status = 'GAUNTLET';
  document.getElementById('proof-modal').classList.add('hidden');

  // Build Gauntlet Queue matching the task tag
  state.gauntletQueue = state.cards.filter(c => c.tag === todo.tag).slice(0, todo.req);
  state.gauntletIndex = 0;

  // Switch to Flashcards Tab automatically
  switchTab('flashcards');
  document.getElementById('gauntlet-status-bar').innerHTML = `Mode: <strong>⚔️ GAUNTLET FOR "${todo.title}" (Pass ${todo.req} Cards)</strong>`;
  renderCurrentCard();
  renderTodos();
  renderTelemetry();
  pushChatMessage('AI', `Notes logged! I generated a flashcard from your summary. Pass the ${state.gauntletQueue.length}-card Gauntlet in the center pane to unlock "${todo.title}".`);
}

// 5. FLASHCARD 3D FLIPPER & GRADING
function renderCurrentCard() {
  const deck = state.gauntletQueue.length > 0 ? state.gauntletQueue : state.cards;
  const card = deck[state.gauntletIndex % Math.max(1, deck.length)];
  const cardEl = document.getElementById('flashcard-3d');
  cardEl.classList.remove('is-flipped');

  if (!card) return;
  document.getElementById('card-front-tag').textContent = card.tag;
  document.getElementById('card-front-text').textContent = card.q;
  document.getElementById('card-back-text').textContent = card.a;
}

function gradeCard(grade) {
  const todo = state.todos.find(t => t.id === state.activeProofTaskId);

  if (todo && todo.status === 'GAUNTLET') {
    if (grade >= 3) {
      todo.passed++;
      if (todo.passed >= todo.req) {
        todo.status = 'UNLOCKED';
        state.streak++;
        state.activeProofTaskId = null;
        state.gauntletQueue = [];
        document.getElementById('gauntlet-status-bar').innerHTML = `Mode: <strong>✅ GAUNTLET CLEARED! TASK UNLOCKED!</strong>`;
        pushChatMessage('SYSTEM', `🔓 PROOF VERIFIED: "${todo.title}" is now UNLOCKED! Streak increased to ${state.streak} 🔥`);
        switchTab('todos');
      }
    } else {
      todo.passed = 0;
      pushChatMessage('AI', `❌ You failed a Gauntlet card for "${todo.title}". Progress reset to 0/${todo.req}. Review your notes!`);
    }
  }

  state.gauntletIndex++;
  renderCurrentCard();
  renderTodos();
  renderTelemetry();
}

// 6. GATEKEEPER AI SIDEBOT
function startAIInterrogation(todoId) {
  const todo = state.todos.find(t => t.id === todoId);
  if (!todo) return;
  state.activeProofTaskId = todoId;
  document.getElementById('chat-target-task').textContent = todo.title;
  pushChatMessage('AI', `⚔️ INTERROGATION MODE: To unlock "${todo.title}" right now via Viva, explain the core concept or formula in your own words below. Type at least 20 characters.`);
}

function pushChatMessage(sender, text) {
  const box = document.getElementById('chat-messages');
  const div = document.createElement('div');
  if (sender === 'SYSTEM') {
    div.className = 'msg msg-system';
    div.textContent = text;
  } else {
    div.className = `msg ${sender === 'AI' ? 'msg-ai' : 'msg-user'}`;
    div.innerHTML = `<div class="msg-header">${sender === 'AI' ? 'GATEKEEPER // AI' : 'YOU // STUDENT'}</div><p>${text}</p>`;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function handleChatSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  pushChatMessage('USER', text);

  // Command parsing
  if (text.startsWith('/quiz')) {
    const randomCard = state.cards[Math.floor(Math.random() * state.cards.length)];
    pushChatMessage('AI', `⚔️ POP QUIZ (${randomCard.tag}): ${randomCard.q}`);
    return;
  }
  if (text.startsWith('/gen-cards')) {
    pushChatMessage('AI', `🃏 Generated 2 new high-yield flashcards from your active schedule blocks!`);
    return;
  }

  // If currently interrogating a locked task
  const targetTodo = state.todos.find(t => t.id === state.activeProofTaskId);
  if (targetTodo && targetTodo.status !== 'UNLOCKED') {
    if (text.length >= 20) {
      targetTodo.status = 'UNLOCKED';
      state.streak++;
      state.activeProofTaskId = null;
      document.getElementById('chat-target-task').textContent = 'None (General Study)';
      pushChatMessage('AI', `Impressive explanation. Your recall checks out. I am unlocking "${targetTodo.title}" now.`);
      pushChatMessage('SYSTEM', `🔓 AI VIVA PASSED: "${targetTodo.title}" UNLOCKED!`);
      renderTodos();
      renderTelemetry();
    } else {
      pushChatMessage('AI', `That answer is too shallow. Give me a deeper explanation (20+ chars) before I unlock "${targetTodo.title}".`);
    }
    return;
  }

  pushChatMessage('AI', `Got it. Click "Ask AI Viva" on any locked task if you want me to test and unlock it for you, or click a 🔒 padlock to run the Flashcard Gauntlet.`);
}

// 7. WIRE UP ALL EVENTS & TABS
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-btn-${tabName}`).classList.add('active');
  document.getElementById(`view-${tabName}`).classList.add('active');
}

function init() {
  renderTelemetry();
  renderCalendar();
  renderTodos();
  renderCurrentCard();

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Add Todo
  document.getElementById('todo-form').onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('todo-title-input').value.trim();
    const tag = document.getElementById('todo-tag-input').value;
    const req = parseInt(document.getElementById('todo-difficulty-input').value, 10);
    state.todos.unshift({ id: 't_' + Date.now(), title, tag, level: req, status: 'LOCKED', passed: 0, req });
    document.getElementById('todo-title-input').value = '';
    renderTodos();
    renderTelemetry();
  };

  // Modal & Gauntlet
  document.getElementById('btn-close-modal').onclick = () => document.getElementById('proof-modal').classList.add('hidden');
  document.getElementById('btn-start-gauntlet').onclick = submitNotesAndStartGauntlet;

  // Flashcards Flip (Click & Spacebar)
  document.getElementById('flashcard-3d').onclick = (e) => e.currentTarget.classList.toggle('is-flipped');
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.getElementById('view-flashcards').classList.contains('active') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      document.getElementById('flashcard-3d').classList.toggle('is-flipped');
    }
  });

  // Rating Buttons
  document.querySelectorAll('.btn-rate').forEach(btn => {
    btn.onclick = () => gradeCard(parseInt(btn.dataset.grade, 10));
  });

  // New Flashcard Drawer
  document.getElementById('btn-new-card').onclick = () => {
    document.getElementById('flashcard-create-form').classList.toggle('hidden');
  };
  document.getElementById('flashcard-create-form').onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById('card-q-input').value.trim();
    const a = document.getElementById('card-a-input').value.trim();
    const tag = document.getElementById('card-tag-select').value;
    state.cards.unshift({ id: 'c_' + Date.now(), tag, q, a });
    document.getElementById('card-q-input').value = '';
    document.getElementById('card-a-input').value = '';
    document.getElementById('flashcard-create-form').classList.add('hidden');
    renderCurrentCard();
    renderTelemetry();
  };

  // Calendar Filter & Verify Button
  document.getElementById('calendar-filter-tag').onchange = renderCalendar;
  document.getElementById('btn-verify-block').onclick = () => {
    const block = state.blocks.find(b => b.id === state.activeBlockId);
    if (block) {
      block.verified = true;
      clearInterval(state.timerInterval);
      state.activeBlockId = null;
      document.getElementById('btn-verify-block').disabled = true;
      document.getElementById('active-block-title').textContent = 'Block Verified ✅';
      state.streak++;
      renderCalendar();
      renderTelemetry();
      pushChatMessage('SYSTEM', `✅ Calendar Block "${block.title}" verified and logged!`);
    }
  };

  // GCal Sync Demo
  document.getElementById('btn-gcal-sync').onclick = () => {
    state.blocks.push({ id: 'b_' + Date.now(), time: '18:00 - 19:00', title: 'Synced: Algorithm Mock Exam', tag: '#cs', verified: false });
    renderCalendar();
    pushChatMessage('SYSTEM', '📅 Synced 1 new study block from Google Calendar.');
  };

  // Chat & Quick Chips
  document.getElementById('chat-form').onsubmit = handleChatSubmit;
  document.querySelectorAll('.cmd-chip').forEach(chip => {
    chip.onclick = () => {
      document.getElementById('chat-input').value = chip.dataset.cmd + ' ';
      document.getElementById('chat-input').focus();
    };
  });
}

init();