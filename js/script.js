/* ====================================================
   GLITCH CHAT v2 — script.js
   Arquitectura: State → Render → Events
   ==================================================== */

'use strict';

// ══════════════════════════════════════════
//  AUDIO ENGINE
// ══════════════════════════════════════════
const Audio = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function tone(freq, type, duration, gain = 0.12, delay = 0) {
    try {
      const ac = getCtx();
      const o  = ac.createOscillator();
      const g  = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = type;
      o.frequency.setValueAtTime(freq, ac.currentTime + delay);
      o.frequency.exponentialRampToValueAtTime(freq * 0.5, ac.currentTime + delay + duration);
      g.gain.setValueAtTime(0, ac.currentTime + delay);
      g.gain.linearRampToValueAtTime(gain, ac.currentTime + delay + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration);
      o.start(ac.currentTime + delay);
      o.stop(ac.currentTime + delay + duration + 0.05);
    } catch(_) {}
  }
  return {
    send()    { tone(820,'sine',0.08,0.10); tone(1080,'sine',0.06,0.06,0.05); },
    receive() { tone(520,'triangle',0.12,0.08); tone(780,'triangle',0.10,0.05,0.06); },
    switch()  { tone(300,'sine',0.06,0.06); },
    notify()  { tone(660,'sine',0.1,0.08); tone(880,'sine',0.1,0.07,0.12); },
  };
})();

// ══════════════════════════════════════════
//  CANVAS BACKGROUND
// ══════════════════════════════════════════
function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function makeParticles() {
    particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + 0.2,
      dx: (Math.random() - 0.5) * 0.15,
      dy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.4 + 0.05,
      color: Math.random() > 0.5 ? '0,245,196' : '107,127,240',
    }));
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${p.alpha})`; ctx.fill();
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > W) p.dx *= -1;
      if (p.y < 0 || p.y > H) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); makeParticles(); });
  resize(); makeParticles(); draw();
}

// ══════════════════════════════════════════
//  LOCALSTORAGE
// ══════════════════════════════════════════
const LS = {
  KEY: 'glitchchat_msgs_v2',
  save(messages) { try { localStorage.setItem(this.KEY, JSON.stringify(messages)); } catch(_) {} },
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      Object.values(data).forEach(ch => ch.forEach(m => { m.time = new Date(m.time); }));
      return data;
    } catch(_) { return null; }
  },
};

// ══════════════════════════════════════════
//  AVATAR OPTIONS
// ══════════════════════════════════════════
const AVATAR_SEEDS = ['You','Pixel','Glitch','Nova','Kira','Zeta'];
const AVATAR_URLS  = AVATAR_SEEDS.map(s => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`);

// ══════════════════════════════════════════
//  DATOS
// ══════════════════════════════════════════
const USERS = [
  { id:'u1', name:'Axel',  avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Axel',  status:'online',  role:'Admin' },
  { id:'u2', name:'Sara',  avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Sara',  status:'online',  role:'Mod' },
  { id:'u3', name:'Lucas', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas', status:'away',    role:'Member' },
  { id:'u4', name:'Mía',   avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia',   status:'online',  role:'Member' },
  { id:'u5', name:'Dante', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Dante', status:'offline', role:'Member' },
  { id:'u6', name:'Neymar', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Neymar', status:'offline', role:'Member' },
  { id:'u7', name:'Doku', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Doku', status:'offline', role:'Member' },
  { id:'u8', name:'Jorge', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Jorge', status:'offline', role:'Member' },
  { id:'u9', name:'Sofi', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofi', status:'offline', role:'Member' },
  { id:'u10', name:'Leo', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo', status:'offline', role:'Member' },
  { id:'u11', name:'Elon', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=Elon', status:'offline', role:'Member' },
];

const ME = { id:'me', name:'Tú', avatar:'https://api.dicebear.com/7.x/avataaars/svg?seed=You' };

const CHANNEL_DESCS = {
  general:    'Canal principal de la comunidad',
  gaming:     'Todo sobre videojuegos 🎮',
  memes:      'Memes y humor 😂',
  musica:     'Comparte lo que escuchás 🎵',
  'dm-sara':  'Mensaje directo con Sara',
  'dm-lucas': 'Mensaje directo con Lucas',
};

const AUTHOR_COLORS = {
  u1:'var(--c-u1)', u2:'var(--c-u2)', u3:'var(--c-u3)',
  u4:'var(--c-u4)', u5:'var(--c-u5)', me:'var(--c-me)',
};

const BOT_POOL = {
  general: ['¡Bienvenidos a Glitch! 🚀','gg everyone 🎉','¿Alguien por acá? 👀','Reunión mañana 20hs 📅'],
  gaming:  ['¡Conseguí el logro! 🏆','Ez clap ngl','Buscando 1 más 🎮','Alguien juega esta noche?'],
  memes:   ['This is fine 🔥🐶🔥','No puedo parar de reír 😂','Clásico.'],
  musica:  ['🎵 Tame Impala — Borderline','Lofi a las 3am 🌙','Recomendaciones? 🎧'],
  'dm-sara':  ['Hola! cómo estás?','¿Viste el proyecto?'],
  'dm-lucas': ['Hola, ¿cómo va todo?','Dame update del avance'],
};

const INITIAL_MSGS = {
  general: [
    { userId:'u1', text:'¡Bienvenidos a Glitch! 🚀' },
    { userId:'u2', text:'Hola a todos, qué bueno estar acá 🎉' },
    { userId:'u3', text:'Este diseño está increíble 🔥' },
  ],
  gaming: [
    { userId:'u3', text:'¿Alguien quiere partida esta noche? 🎮' },
    { userId:'u4', text:'Yo me apunto, ¿qué jugamos?' },
  ],
  memes: [
    { userId:'u2', text:'Cuando el código funciona sin saber por qué 😂' },
    { userId:'u5', text:'Clásico. Igual lo mergeo.' },
  ],
  musica: [
    { userId:'u4', text:'Escuchando Tame Impala ahora mismo 🎵' },
    { userId:'u1', text:'Buen gusto 🤘' },
  ],
  'dm-sara':  [{ userId:'u2', text:'Hola! Este canal es privado 🔒' }],
  'dm-lucas': [{ userId:'u3', text:'Hey, ¿cómo va el proyecto?' }],
};

// ══════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════
let msgId = 0;
const newId = () => 'msg-' + (++msgId);

const State = {
  currentChannel: 'general',
  searchQuery: '',
  messages: null,
  unread: {},
  activity: [],
  editingId: null,
  typingTimer: null,
  // Favoritos globales: array de {msgId, channel}
  favorites: [],
  dmTargetUser: null,
};

function getUserById(id) {
  if (id === 'me') return ME;
  return USERS.find(u => u.id === id) || USERS[0];
}

function makeMsg(user, text) {
  return {
    id: newId(), userId: user.id, author: user.name, avatar: user.avatar,
    text, time: new Date(),
    reactions: {}, pinned: false, favorited: false, edited: false,
  };
}

function initState() {
  const saved = LS.load();
  if (saved) {
    State.messages = saved;
    Object.keys(INITIAL_MSGS).forEach(ch => {
      if (!State.messages[ch]) State.messages[ch] = [];
    });
  } else {
    State.messages = {};
    Object.entries(INITIAL_MSGS).forEach(([ch, msgs]) => {
      State.messages[ch] = msgs.map(m => makeMsg(getUserById(m.userId), m.text));
    });
  }
  Object.keys(INITIAL_MSGS).forEach(ch => { State.unread[ch] = 0; });
}

function persistMessages() {
  LS.save(State.messages);
}

// ══════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════
function fmtTime(d) { return d.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }); }
function escHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function logAct(text) {
  State.activity.unshift({ text, time: new Date() });
  if (State.activity.length > 60) State.activity.pop();
}

// ══════════════════════════════════════════
//  TYPING INDICATOR
// ══════════════════════════════════════════
let typingVisible = false;

function showTyping(name) {
  const el = document.getElementById('typing-indicator');
  const text = document.getElementById('typing-text');
  if (!el) return;
  text.textContent = `${name} está escribiendo…`;
  el.classList.remove('hidden');
  typingVisible = true;
  scrollToBottom();
}
function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (!el) return;
  el.classList.add('hidden');
  typingVisible = false;
}
function botSendWithTyping(channel, user, text) {
  if (channel === State.currentChannel) {
    showTyping(user.name);
    setTimeout(() => { hideTyping(); deliverBotMsg(channel, user, text); }, 500 + Math.random() * 750);
  } else {
    setTimeout(() => deliverBotMsg(channel, user, text), 300);
  }
}
function deliverBotMsg(channel, user, text) {
  const msg = makeMsg(user, text);
  State.messages[channel].push(msg);
  persistMessages();
  logAct(`${user.name} escribió en #${channel}`);
  if (channel === State.currentChannel) {
    renderMessages(); scrollToBottom(); Audio.receive();
  } else {
    State.unread[channel] = (State.unread[channel] || 0) + 1;
    const badge = document.getElementById(`badge-${channel}`);
    if (badge) { badge.textContent = State.unread[channel]; badge.classList.remove('hidden'); }
    showToast('💬', `${user.name} escribió en #${channel}`);
    Audio.notify();
  }
}

// ══════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════
function showToast(icon, msg, ms = 3200) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span class="ti">${icon}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, ms);
}

// ══════════════════════════════════════════
//  RENDER — MESSAGES
// ══════════════════════════════════════════
function renderMessages() {
  const container = document.getElementById('messages-container');
  const ch   = State.currentChannel;
  let   msgs = State.messages[ch] || [];
  const q    = State.searchQuery.trim().toLowerCase();

  if (q) {
    msgs = msgs.filter(m => m.text.toLowerCase().includes(q));
    document.getElementById('search-notice').classList.remove('hidden');
    document.getElementById('search-notice-text').textContent =
      `${msgs.length} resultado(s) para "${State.searchQuery}"`;
  } else {
    document.getElementById('search-notice').classList.add('hidden');
  }

  container.innerHTML = '';
  if (msgs.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="es-icon">${q ? '🔍' : '🌌'}</span>
      <span>${q ? 'Sin resultados.' : 'Sé el primero en escribir algo.'}</span>
    </div>`;
    document.getElementById('msg-counter').textContent = `${(State.messages[ch]||[]).length} msgs`;
    return;
  }

  const frag = document.createDocumentFragment();
  msgs.forEach(m => frag.appendChild(buildMsgEl(m, q)));
  container.appendChild(frag);
  document.getElementById('msg-counter').textContent = `${(State.messages[ch]||[]).length} msgs`;
}

function buildMsgEl(msg, q = '') {
  const div = document.createElement('div');
  div.className = 'message';
  div.dataset.id = msg.id;
  if (msg.pinned)    div.classList.add('pinned-msg');
  if (msg.favorited) div.classList.add('fav-msg');
  if (q && msg.text.toLowerCase().includes(q)) div.classList.add('search-hl');

  const tags = [
    msg.pinned    ? `<span class="tag t-pin">📌 fijado</span>`  : '',
    msg.favorited ? `<span class="tag t-fav">⭐ fav</span>`      : '',
    msg.edited    ? `<span class="tag t-edit">✏️ editado</span>` : '',
  ].join('');

  const rxns = Object.entries(msg.reactions)
    .filter(([,d]) => d.count > 0)
    .map(([e,d]) =>
      `<button class="rxn-btn ${d.mine ? 'mine' : ''}" data-emoji="${e}" data-id="${msg.id}">
        ${e}<span class="rxn-count">${d.count}</span>
      </button>`
    ).join('');

  const isOwn = msg.userId === 'me';
  const QUICK = ['👍','❤️','😂','🔥'];

  div.innerHTML = `
    <div class="msg-actions">
      ${QUICK.map(e => `<button class="act-btn qr" data-emoji="${e}" data-id="${msg.id}">${e}</button>`).join('')}
      <button class="act-btn ab-pin" data-id="${msg.id}" title="Fijar">📌</button>
      <button class="act-btn ab-fav" data-id="${msg.id}" title="Favorito">⭐</button>
      ${isOwn ? `<button class="act-btn ab-edit" data-id="${msg.id}" title="Editar">✏️</button>` : ''}
      ${isOwn ? `<button class="act-btn ab-del"  data-id="${msg.id}" title="Eliminar">🗑️</button>` : ''}
    </div>
    <img class="msg-ava" src="${msg.avatar}" alt="${msg.author}" />
    <div class="msg-body">
      <div class="msg-head">
        <span class="msg-author" style="color:${AUTHOR_COLORS[msg.userId] || 'var(--c-me)'}">${msg.author}</span>
        <span class="msg-time">${fmtTime(msg.time)}</span>
        <div class="msg-tags">${tags}</div>
      </div>
      <div class="msg-text">${escHtml(msg.text)}</div>
      ${rxns ? `<div class="msg-reactions">${rxns}</div>` : '<div class="msg-reactions"></div>'}
    </div>`;
  return div;
}

// ══════════════════════════════════════════
//  RENDER — MEMBERS (con botón DM)
// ══════════════════════════════════════════
function renderMembers() {
  const list   = document.getElementById('members-list');
  const online = USERS.filter(u => u.status !== 'offline').length;
  document.getElementById('online-count').textContent = online;

  list.innerHTML = USERS.map(u => `
    <div class="member-card" data-uid="${u.id}">
      <img class="member-ava" src="${u.avatar}" alt="${u.name}"/>
      <div class="member-info">
        <div class="member-name">${u.name}</div>
        <div class="member-role">${u.role.toUpperCase()}</div>
      </div>
      <button class="member-dm-btn" data-uid="${u.id}" title="Enviar mensaje">💬</button>
      <span class="sdot ${u.status}"></span>
    </div>`).join('');

  // Eventos DM en members
  list.querySelectorAll('.member-dm-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const uid = btn.dataset.uid;
      const user = USERS.find(u => u.id === uid);
      if (user) openDMModal(user);
    });
  });
}

// ══════════════════════════════════════════
//  RENDER — PINNED (todos los canales)
// ══════════════════════════════════════════
function renderPinned() {
  const list = document.getElementById('pinned-list');
  // Busca mensajes fijados en TODOS los canales
  const pinned = [];
  Object.entries(State.messages).forEach(([ch, msgs]) => {
    msgs.filter(m => m.pinned).forEach(m => pinned.push({ ...m, channel: ch }));
  });
  list.innerHTML = pinned.length
    ? pinned.map(m => `
      <div class="pinned-entry">
        <div class="pe-author">${m.author} <span style="color:var(--t3);font-size:9px;">#${m.channel}</span></div>
        <div class="pe-text">${escHtml(m.text)}</div>
      </div>`).join('')
    : '<div style="color:var(--t3);font-size:12px;text-align:center;padding:20px;">Sin mensajes fijados.</div>';
}

// ══════════════════════════════════════════
//  RENDER — FAVORITES
// ══════════════════════════════════════════
function renderFavorites() {
  const list = document.getElementById('favorites-list');
  const favs = [];
  Object.entries(State.messages).forEach(([ch, msgs]) => {
    msgs.filter(m => m.favorited).forEach(m => favs.push({ ...m, channel: ch }));
  });
  list.innerHTML = favs.length
    ? favs.map(m => `
      <div class="fav-entry">
        <div class="fe-author">${m.author}</div>
        <div class="fe-channel">#${m.channel}</div>
        <div class="fe-text">${escHtml(m.text)}</div>
      </div>`).join('')
    : '<div style="color:var(--t3);font-size:12px;text-align:center;padding:20px;">Sin mensajes favoritos.</div>';
}

// ══════════════════════════════════════════
//  RENDER — ACTIVITY
// ══════════════════════════════════════════
function renderActivity() {
  const list = document.getElementById('activity-list');
  list.innerHTML = State.activity.length
    ? State.activity.map(a => `<div class="act-entry">${a.text}<span class="ae-time">${fmtTime(a.time)}</span></div>`).join('')
    : '<div style="color:var(--t3);font-size:12px;text-align:center;padding:20px;">Sin actividad aún.</div>';
}

// ══════════════════════════════════════════
//  ACCIONES
// ══════════════════════════════════════════
function sendMessage() {
  const input = document.getElementById('message-input');
  const text  = input.value.trim();
  if (!text) return;
  const msg = makeMsg(ME, text);
  State.messages[State.currentChannel].push(msg);
  persistMessages();
  logAct(`${ME.name} envió un mensaje en #${State.currentChannel}`);
  input.value = ''; input.style.height = 'auto';
  renderMessages(); scrollToBottom();
  Audio.send(); updatePlaceholder();
}

function deleteMessage(id) {
  const ch = State.currentChannel;
  State.messages[ch] = State.messages[ch].filter(m => m.id !== id);
  persistMessages(); logAct(`Mensaje eliminado en #${ch}`); renderMessages();
}

function openEditModal(id) {
  const msg = findMsg(id);
  if (!msg || msg.userId !== 'me') return;
  State.editingId = id;
  document.getElementById('edit-input').value = msg.text;
  document.getElementById('edit-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('edit-input').focus(), 50);
}
function confirmEdit() {
  const t = document.getElementById('edit-input').value.trim();
  if (!t) return;
  const msg = findMsg(State.editingId);
  if (msg) { msg.text = t; msg.edited = true; persistMessages(); logAct('Mensaje editado'); }
  closeEditModal(); renderMessages();
}
function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
  State.editingId = null;
}

function toggleReaction(id, emoji) {
  const msg = findMsg(id);
  if (!msg) return;
  if (!msg.reactions[emoji]) msg.reactions[emoji] = { count:0, mine:false };
  const r = msg.reactions[emoji];
  r.mine ? (r.count--, r.mine = false) : (r.count++, r.mine = true);
  if (r.count <= 0) delete msg.reactions[emoji];
  persistMessages(); renderMessages();
}

function togglePin(id) {
  const msg = findMsg(id);
  if (!msg) return;
  msg.pinned = !msg.pinned;
  persistMessages();
  showToast('📌', msg.pinned ? 'Mensaje fijado' : 'Desfijado');
  logAct(`Mensaje ${msg.pinned ? 'fijado' : 'desfijado'}`);
  renderMessages(); renderPinned();
}

function toggleFav(id) {
  const msg = findMsg(id);
  if (!msg) return;
  msg.favorited = !msg.favorited;
  persistMessages();
  showToast('⭐', msg.favorited ? 'Guardado en favoritos' : 'Removido de favoritos');
  logAct(`Mensaje ${msg.favorited ? 'marcado favorito' : 'removido de favoritos'}`);
  renderMessages(); renderFavorites();
}

function switchChannel(ch) {
  if (ch === State.currentChannel) return;
  hideTyping();
  State.currentChannel = ch;
  State.searchQuery    = '';
  document.getElementById('search-input').value = '';

  document.querySelectorAll('.ch-item[data-channel]').forEach(el =>
    el.classList.toggle('active', el.dataset.channel === ch)
  );

  const isDM = ch.startsWith('dm-');
  document.getElementById('channel-title').textContent =
    isDM ? `💬 ${ch.replace('dm-','')}` : `# ${ch}`;
  document.getElementById('channel-desc').textContent = CHANNEL_DESCS[ch] || '';
  updatePlaceholder();

  State.unread[ch] = 0;
  const badge = document.getElementById(`badge-${ch}`);
  if (badge) { badge.textContent = ''; badge.classList.add('hidden'); }

  logAct(`Entraste a #${ch}`);
  renderMessages(); scrollToBottom(); Audio.switch();
}

// ══════════════════════════════════════════
//  DM MODAL
// ══════════════════════════════════════════
function openDMModal(user) {
  State.dmTargetUser = user;
  document.getElementById('dm-target-name').textContent = user.name;
  document.getElementById('dm-input').value = '';
  document.getElementById('dm-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('dm-input').focus(), 50);
}
function closeDMModal() {
  document.getElementById('dm-modal').classList.add('hidden');
  State.dmTargetUser = null;
}
function confirmDM() {
  const text = document.getElementById('dm-input').value.trim();
  if (!text || !State.dmTargetUser) return;
  const user = State.dmTargetUser;
  const chKey = `dm-${user.name.toLowerCase()}`;
  // Asegurar que el canal DM existe
  if (!State.messages[chKey]) {
    State.messages[chKey] = [];
    CHANNEL_DESCS[chKey] = `Mensaje directo con ${user.name}`;
    // Agregar al sidebar si no existe
    addDMToSidebar(user, chKey);
  }
  const msg = makeMsg(ME, text);
  State.messages[chKey].push(msg);
  persistMessages();
  logAct(`Enviaste DM a ${user.name}`);
  showToast('💬', `DM enviado a ${user.name}`);
  closeDMModal();
  // Cambiar al canal del DM
  switchChannel(chKey);
  Audio.send();
}

function addDMToSidebar(user, chKey) {
  const ul = document.getElementById('dm-list');
  if (ul.querySelector(`[data-channel="${chKey}"]`)) return;
  const li = document.createElement('li');
  li.className = 'ch-item';
  li.dataset.channel = chKey;
  li.innerHTML = `
    <img src="${user.avatar}" class="dm-ava"/>
    <span class="ch-name">${user.name}</span>
    <span class="pulsedot ${user.status === 'online' ? 'green' : 'amber'}"></span>
  `;
  li.addEventListener('click', () => switchChannel(chKey));
  ul.appendChild(li);
}

// ══════════════════════════════════════════
//  PERFIL MODAL
// ══════════════════════════════════════════
let selectedProfileAvatar = ME.avatar;

function openProfileModal() {
  selectedProfileAvatar = ME.avatar;
  document.getElementById('profile-current-ava').src = ME.avatar;
  document.getElementById('profile-name-input').value = ME.name;

  // Render avatar options
  const cont = document.getElementById('profile-avatars');
  cont.innerHTML = '';
  AVATAR_URLS.forEach(url => {
    const div = document.createElement('div');
    div.className = 'profile-ava-opt' + (url === ME.avatar ? ' selected' : '');
    div.innerHTML = `<img src="${url}" alt="avatar"/>`;
    div.addEventListener('click', () => {
      cont.querySelectorAll('.profile-ava-opt').forEach(d => d.classList.remove('selected'));
      div.classList.add('selected');
      selectedProfileAvatar = url;
      document.getElementById('profile-current-ava').src = url;
    });
    cont.appendChild(div);
  });

  document.getElementById('profile-modal').classList.remove('hidden');
  setTimeout(() => document.getElementById('profile-name-input').focus(), 50);
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.add('hidden');
}

function confirmProfile() {
  const newName = document.getElementById('profile-name-input').value.trim();
  if (!newName || newName.length < 2) {
    showToast('⚠️', 'El nombre debe tener al menos 2 caracteres');
    return;
  }
  ME.name = newName;
  ME.avatar = selectedProfileAvatar;

  // Actualizar UI
  document.getElementById('me-name-display').textContent = newName;
  document.getElementById('me-avatar-btn').src = ME.avatar;

  // Actualizar mensajes existentes del usuario
  Object.values(State.messages).forEach(msgs => {
    msgs.filter(m => m.userId === 'me').forEach(m => {
      m.author = ME.name;
      m.avatar = ME.avatar;
    });
  });
  persistMessages();
  renderMessages();
  closeProfileModal();
  showToast('✅', 'Perfil actualizado');
  logAct(`Cambiaste tu perfil a "${newName}"`);
}

// ══════════════════════════════════════════
//  WELCOME SCREEN
// ══════════════════════════════════════════
let welcomeSelectedAvatar = AVATAR_URLS[0];

function initWelcomeScreen() {
  const cont = document.getElementById('welcome-avatars');
  AVATAR_URLS.forEach((url, i) => {
    const div = document.createElement('div');
    div.className = 'welcome-ava-opt' + (i === 0 ? ' selected' : '');
    div.innerHTML = `<img src="${url}" alt="avatar"/>`;
    div.addEventListener('click', () => {
      cont.querySelectorAll('.welcome-ava-opt').forEach(d => d.classList.remove('selected'));
      div.classList.add('selected');
      welcomeSelectedAvatar = url;
    });
    cont.appendChild(div);
  });

  const enterBtn = document.getElementById('welcome-enter');
  const nameInput = document.getElementById('welcome-username');
  const errEl = document.getElementById('welcome-error');

  // Enter key
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') enterApp();
  });

  enterBtn.addEventListener('click', enterApp);

  function enterApp() {
    const name = nameInput.value.trim();
    if (!name || name.length < 2) {
      errEl.classList.remove('hidden');
      nameInput.style.outline = '2px solid #f87171';
      setTimeout(() => { nameInput.style.outline = ''; }, 1200);
      return;
    }
    errEl.classList.add('hidden');

    ME.name = name;
    ME.avatar = welcomeSelectedAvatar;

    // Animate out
    const card = document.querySelector('.welcome-card');
    card.style.animation = 'welcomeCardIn 0.35s ease reverse both';
    document.querySelector('.welcome-screen').style.animation = 'welcomeFadeIn 0.4s ease 0.2s reverse both';

    setTimeout(() => {
      document.getElementById('welcome-screen').style.display = 'none';
      const app = document.getElementById('app');
      app.classList.remove('hidden');
      app.style.animation = 'welcomeFadeIn 0.4s ease both';

      // Actualizar UI con el nombre y avatar elegidos
      document.getElementById('me-name-display').textContent = ME.name;
      document.getElementById('me-avatar-btn').src = ME.avatar;

      logAct(`Iniciaste sesión como "${ME.name}"`);
      showToast('🚀', `¡Bienvenido a Glitch, ${ME.name}!`);
      Audio.notify();
      setTimeout(() => showToast('💾', 'Tus mensajes se guardan automáticamente'), 2800);
    }, 400);
  }
}

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
function findMsg(id) {
  for (const msgs of Object.values(State.messages)) {
    const m = msgs.find(m => m.id === id);
    if (m) return m;
  }
  return null;
}
function scrollToBottom() {
  const w = document.getElementById('messages-wrapper');
  if (w) w.scrollTop = w.scrollHeight;
}
function updatePlaceholder() {
  const ch = State.currentChannel;
  const label = ch.startsWith('dm-') ? ch.replace('dm-','') : `#${ch}`;
  document.getElementById('message-input').placeholder = `Escribe en ${label}…`;
}

// ══════════════════════════════════════════
//  BOTS
// ══════════════════════════════════════════
function scheduleBotMsg() {
  // Obtenemos todos los canales donde hay mensajes actualmente
  const activeChannels = Object.keys(State.messages);
  
  // Elegimos uno al azar
  const ch = activeChannels[Math.floor(Math.random() * activeChannels.length)];
  
  let pool = BOT_POOL[ch];
  let user = USERS[Math.floor(Math.random() * USERS.length)];

  // ─── NUEVA LÓGICA: Manejo especial si cae en un canal de DM ───
  if (ch.startsWith('dm-')) {
    const targetName = ch.replace('dm-', '');
    // Buscamos al usuario dueño de ese DM
    const dmUser = USERS.find(u => u.name.toLowerCase() === targetName.toLowerCase());
    
    if (dmUser) {
      user = dmUser; // Forzamos a que el que responda sea el dueño del DM
      
      // Acá ya te dejé el pack con las 6 frases nuevas, modernas y juveniles de respuesta por defecto
      pool = BOT_POOL[ch] || [
        '¡Holaaa! Sisi, ya vi tu mensaje 👀 Dame dos minutitos y te respondo bien.',
        'Buenas! Alguien está necesitando mi ayuda de experto por lo que veo... 😎✨',
        'Hola! Mensaje recibido 📥 Si tardo en contestar es porque me colgué con un TikTok jajaja',
        'Holiis 👋 Bancame que me tomo un café y nos ponemos al dia con eso ☕',
        '¡Aparición con vida! Qué onda? Pasame el chisme completo de una',
        'Aloha! Mi detector de notificaciones acaba de sonar 🚨 Decime, qué rompimos ahora? 😂'
      ];
    } else {
      return; // Si por alguna razón no encuentra al usuario, salta este ciclo
    }
  }
  // ─────────────────────────────────────────────────────────────

  const text = pool[Math.floor(Math.random() * pool.length)];
  botSendWithTyping(ch, user, text);
}
function scheduleConnectionNotif() {
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const acts = ['se conectó', 'está en línea', 'se desconectó'];
  const act  = acts[Math.floor(Math.random() * acts.length)];
  
  // ─── NUEVA LÓGICA: Actualiza el estado real de la pelotita ───
  if (act === 'se desconectó') {
    user.status = 'offline';
  } else {
    // Si dice 'se conectó' o 'está en línea', pasa a 'online'
    user.status = 'online';
  }
  
  // Volvemos a renderizar la lista de miembros para que cambie el color
  renderMembers();
  // ─────────────────────────────────────────────────────────────

  showToast('👤', `${user.name} ${act}`);
  Audio.notify();
  logAct(`${user.name} ${act}`);
}

// ══════════════════════════════════════════
//  EVENTOS
// ══════════════════════════════════════════
function initEvents() {
  // Canales
  document.querySelectorAll('.ch-item[data-channel]').forEach(el =>
    el.addEventListener('click', () => switchChannel(el.dataset.channel))
  );

  // Enviar
  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('message-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.getElementById('message-input').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
  });

  // Búsqueda
  document.getElementById('search-input').addEventListener('input', e => {
    State.searchQuery = e.target.value; renderMessages();
  });
  document.getElementById('clear-search').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    State.searchQuery = ''; renderMessages();
  });

  // Delegación en mensajes — CLAVE: usa closest('[data-id]') en cada clase específica
  document.getElementById('messages-container').addEventListener('click', e => {
    const pin  = e.target.closest('.ab-pin');
    const fav  = e.target.closest('.ab-fav');
    const edit = e.target.closest('.ab-edit');
    const del  = e.target.closest('.ab-del');
    const qr   = e.target.closest('.qr');
    const rxn  = e.target.closest('.rxn-btn');

    if (pin)  { togglePin(pin.dataset.id);       return; }
    if (fav)  { toggleFav(fav.dataset.id);        return; }
    if (edit) { openEditModal(edit.dataset.id);   return; }
    if (del)  { deleteMessage(del.dataset.id);    return; }
    if (qr && qr.dataset.emoji)  { toggleReaction(qr.dataset.id, qr.dataset.emoji);  return; }
    if (rxn && rxn.dataset.emoji){ toggleReaction(rxn.dataset.id, rxn.dataset.emoji); return; }
  });

  // Modal editar
  document.getElementById('confirm-edit').addEventListener('click', confirmEdit);
  document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target.id === 'edit-modal') closeEditModal();
  });

  // Modal perfil
  document.getElementById('me-avatar-btn').addEventListener('click', openProfileModal);
  document.getElementById('confirm-profile').addEventListener('click', confirmProfile);
  document.getElementById('cancel-profile').addEventListener('click', closeProfileModal);
  document.getElementById('profile-modal').addEventListener('click', e => {
    if (e.target.id === 'profile-modal') closeProfileModal();
  });

  // Modal DM
  document.getElementById('confirm-dm').addEventListener('click', confirmDM);
  document.getElementById('cancel-dm').addEventListener('click', closeDMModal);
  document.getElementById('dm-modal').addEventListener('click', e => {
    if (e.target.id === 'dm-modal') closeDMModal();
  });
  document.getElementById('dm-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmDM(); }
  });

  // Panel Fijados
  const openPinned = () => {
    renderPinned();
    document.getElementById('pinned-panel').classList.toggle('hidden');
    document.getElementById('activity-panel').classList.add('hidden');
    document.getElementById('favorites-panel').classList.add('hidden');
  };
  document.getElementById('open-pinned').addEventListener('click', openPinned);
  document.getElementById('btn-pinned-header').addEventListener('click', openPinned);
  document.getElementById('close-pinned').addEventListener('click', () =>
    document.getElementById('pinned-panel').classList.add('hidden'));

  // Panel Actividad
  document.getElementById('open-activity').addEventListener('click', () => {
    renderActivity();
    document.getElementById('activity-panel').classList.toggle('hidden');
    document.getElementById('pinned-panel').classList.add('hidden');
    document.getElementById('favorites-panel').classList.add('hidden');
  });
  document.getElementById('close-activity').addEventListener('click', () =>
    document.getElementById('activity-panel').classList.add('hidden'));

  // Panel Favoritos
  document.getElementById('open-favorites').addEventListener('click', () => {
    renderFavorites();
    document.getElementById('favorites-panel').classList.toggle('hidden');
    document.getElementById('pinned-panel').classList.add('hidden');
    document.getElementById('activity-panel').classList.add('hidden');
  });
  document.getElementById('close-favorites').addEventListener('click', () =>
    document.getElementById('favorites-panel').classList.add('hidden'));

  // Emoji bar
  document.getElementById('emoji-toggle').addEventListener('click', () =>
    document.getElementById('emoji-bar').classList.toggle('hidden')
  );
  document.querySelectorAll('.eq').forEach(el =>
    el.addEventListener('click', () => {
      const input = document.getElementById('message-input');
      input.value += el.dataset.e;
      input.focus();
      document.getElementById('emoji-bar').classList.add('hidden');
    })
  );

  // Esc cierra todo
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeEditModal(); closeProfileModal(); closeDMModal();
    ['pinned-panel','activity-panel','favorites-panel'].forEach(id =>
      document.getElementById(id).classList.add('hidden')
    );
  });

  // Atajos Alt+1..4
  const CHANNELS = ['general','gaming','memes','musica'];
  document.addEventListener('keydown', e => {
    if (!e.altKey) return;
    const n = parseInt(e.key) - 1;
    if (n >= 0 && n < CHANNELS.length) { e.preventDefault(); switchChannel(CHANNELS[n]); }
  });
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initState();
  initWelcomeScreen();
  initEvents();
  renderMembers();
  renderMessages();
  scrollToBottom();

  // Bots (arrancan después de que el usuario entre)
  setTimeout(() => scheduleBotMsg(), 3000);
  setInterval(() => scheduleBotMsg(), 3000);
  setInterval(() => scheduleConnectionNotif(), 3000);
});
