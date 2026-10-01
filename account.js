(() => {
'use strict';

const state = {
  player: null,
  runId: null,
  runStartedAt: 0,
  cloudAvailable: true
};

const $ = id => document.getElementById(id);
const lang = () => localStorage.getItem('kukac3d-lang') || 'de';
const copy = key => (window.KUKAC_I18N?.[lang()]?.[key] ?? window.KUKAC_I18N?.de?.[key] ?? key);

async function api(path, options={}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  let body = {};
  try { body = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error(body.error || 'request_failed');
    err.code = body.error || 'request_failed';
    err.status = res.status;
    throw err;
  }
  return body;
}

function message(text, kind='info') {
  const el = $('accountMessage');
  if (!el) return;
  el.textContent = text || '';
  el.dataset.kind = kind;
}

function setMode(mode) {
  document.querySelectorAll('[data-account-pane]').forEach(el => {
    el.hidden = el.dataset.accountPane !== mode;
  });
  document.querySelectorAll('[data-account-mode]').forEach(el => {
    el.classList.toggle('active', el.dataset.accountMode === mode);
  });
  message('');
}

function refreshIdentity() {
  const chip = $('arcadeIdentity');
  const startChip = $('startIdentity');
  const accountBtn = $('accountBtn');
  if (state.player) {
    if (chip) chip.textContent = '● ' + state.player.nickname;
    if (startChip) startChip.textContent = state.player.nickname + ' · #' + (state.player.rank || '—');
    if (accountBtn) accountBtn.textContent = '👤';
  } else {
    if (chip) chip.textContent = copy('guestLabel');
    if (startChip) startChip.textContent = copy('guestLabel');
    if (accountBtn) accountBtn.textContent = '👤';
  }
}

function fillMyProfile() {
  const p = state.player;
  const box = $('myProfileSummary');
  if (!box) return;
  if (!p) {
    box.innerHTML = '<p>' + copy('notLoggedIn') + '</p>';
    return;
  }
  box.innerHTML = [
    '<div class="profile-hero"><strong>' + escapeHtml(p.nickname) + '</strong><span>' + copy('highScoreLabel') + ' ' + Number(p.highScore || 0).toLocaleString() + '</span></div>',
    statsGrid(p)
  ].join('');
}

function statsGrid(p) {
  const items = [
    [copy('rankLabel'), p.rank ? '#' + p.rank : '—'],
    [copy('highScoreLabel'), Number(p.highScore || 0).toLocaleString()],
    [copy('highestLevelLabel'), p.highestLevel || 1],
    [copy('gamesLabel'), p.totalGames || 0],
    [copy('starsLabel'), p.totalStars || 0],
    [copy('coinsLabel'), p.totalCoins || 0],
    [copy('bestComboLabel'), p.bestCombo || 0],
    [copy('savedStarsLabel'), p.starsRecovered || 0],
    [copy('dragonLabel'), p.dragonSurvivals || 0],
    [copy('royalStarsLabel'), p.royalStars || 0]
  ];
  return '<div class="profile-grid">' + items.map(([k,v]) =>
    '<div><small>' + escapeHtml(String(k)) + '</small><b>' + escapeHtml(String(v)) + '</b></div>'
  ).join('') + '</div>';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

async function loadMe() {
  try {
    const body = await api('/api/auth/me', { method:'GET', headers:{} });
    state.player = body.player || null;
    state.cloudAvailable = true;
  } catch (err) {
    if (err.code === 'cloud_unavailable' || err.status === 404) state.cloudAvailable = false;
    state.player = null;
  }
  refreshIdentity();
  fillMyProfile();
  return state.player;
}

async function register(e) {
  e.preventDefault();
  const nickname = $('registerNickname').value;
  const password = $('registerPassword').value;
  const password2 = $('registerPassword2').value;
  if (password !== password2) return message(copy('passwordMismatch'), 'error');
  try {
    message(copy('workingLabel'));
    const body = await api('/api/auth/register', {
      method:'POST', body:JSON.stringify({ nickname, password })
    });
    state.player = body.player;
    refreshIdentity();
    fillMyProfile();
    $('recoveryCodeValue').textContent = body.recoveryCode;
    $('recoveryReveal').hidden = false;
    message(copy('accountCreated'), 'success');
  } catch (err) {
    message(errorText(err.code), 'error');
  }
}

async function login(e) {
  e.preventDefault();
  try {
    message(copy('workingLabel'));
    const body = await api('/api/auth/login', {
      method:'POST',
      body:JSON.stringify({
        nickname:$('loginNickname').value,
        password:$('loginPassword').value
      })
    });
    state.player = body.player;
    refreshIdentity();
    fillMyProfile();
    message(copy('loginSuccess'), 'success');
    setMode('profile');
  } catch (err) {
    message(errorText(err.code), 'error');
  }
}

async function logout() {
  try { await api('/api/auth/logout', { method:'POST', body:'{}' }); } catch {}
  state.player = null;
  state.runId = null;
  refreshIdentity();
  fillMyProfile();
  setMode('login');
}

async function recoverNickname(e) {
  e.preventDefault();
  try {
    const body = await api('/api/auth/recover-nickname', {
      method:'POST',
      body:JSON.stringify({ recoveryCode:$('recoveryCodeInput').value })
    });
    $('recoveredNickname').textContent = body.nickname;
    $('recoveredNicknameBox').hidden = false;
    message(copy('nicknameRecovered'), 'success');
  } catch (err) {
    message(errorText(err.code), 'error');
  }
}

async function loadLeaderboard() {
  const list = $('leaderboardBody');
  if (!list) return;
  list.innerHTML = '<div class="loading-line">' + copy('workingLabel') + '</div>';
  try {
    const body = await api('/api/leaderboard?limit=50', { method:'GET', headers:{} });
    list.innerHTML = body.leaderboard.length ? body.leaderboard.map(row =>
      '<button class="leader-row player-link" data-nickname="' + escapeHtml(row.nickname) + '">' +
        '<span class="rank">#' + row.rank + '</span>' +
        '<strong>' + escapeHtml(row.nickname) + '</strong>' +
        '<span>' + Number(row.highScore).toLocaleString() + '</span>' +
        '<small>LVL ' + row.highestLevel + '</small>' +
      '</button>'
    ).join('') : '<p>' + copy('emptyLeaderboard') + '</p>';
  } catch (err) {
    list.innerHTML = '<p>' + errorText(err.code) + '</p>';
  }
}

async function showPlayer(nickname) {
  $('playerProfile').style.display = 'grid';
  const box = $('playerProfileContent');
  box.innerHTML = '<div class="loading-line">' + copy('workingLabel') + '</div>';
  try {
    const body = await api('/api/player?nickname=' + encodeURIComponent(nickname), { method:'GET', headers:{} });
    const p = body.player;
    box.innerHTML = '<div class="profile-hero"><strong>' + escapeHtml(p.nickname) + '</strong><span>#' + p.rank + '</span></div>' + statsGrid(p);
  } catch (err) {
    box.innerHTML = '<p>' + errorText(err.code) + '</p>';
  }
}

function errorText(code) {
  const map = {
    invalid_nickname:'invalidNickname',
    invalid_password:'invalidPassword',
    nickname_taken:'nicknameTaken',
    invalid_credentials:'invalidCredentials',
    invalid_recovery_code:'invalidRecovery',
    recovery_not_found:'recoveryNotFound',
    cloud_unavailable:'cloudUnavailable',
    auth_required:'authRequired',
    score_rejected:'scoreRejected'
  };
  return copy(map[code] || 'genericError');
}

async function startRun() {
  state.runId = null;
  state.runStartedAt = performance.now();
  if (!state.player) return null;
  try {
    const body = await api('/api/game/start', { method:'POST', body:'{}' });
    state.runId = body.runId;
    return body.runId;
  } catch {
    return null;
  }
}

async function submitRun(stats) {
  if (!state.player || !state.runId) return null;
  const runId = state.runId;
  state.runId = null;
  try {
    const body = await api('/api/game/submit', {
      method:'POST',
      body:JSON.stringify({ runId, ...stats })
    });
    if (body.player) {
      state.player = body.player;
      refreshIdentity();
      fillMyProfile();
    }
    return body;
  } catch (err) {
    console.warn('Score submit failed:', err.code || err);
    return null;
  }
}

function openAccount(mode = state.player ? 'profile' : 'login') {
  $('account').style.display = 'grid';
  setMode(mode);
  fillMyProfile();
}

function closeOverlay(id) {
  const el = $(id);
  if (el) el.style.display = 'none';
}

function bind() {
  $('accountBtn')?.addEventListener('click', () => openAccount());
  $('startIdentity')?.addEventListener('click', () => openAccount());
  $('leaderboardBtn')?.addEventListener('click', async () => {
    $('leaderboard').style.display='grid';
    await loadLeaderboard();
  });
  $('closeAccount')?.addEventListener('click', () => closeOverlay('account'));
  $('closeLeaderboard')?.addEventListener('click', () => closeOverlay('leaderboard'));
  $('closePlayerProfile')?.addEventListener('click', () => closeOverlay('playerProfile'));
  $('logoutBtn')?.addEventListener('click', logout);
  $('loginForm')?.addEventListener('submit', login);
  $('registerForm')?.addEventListener('submit', register);
  $('recoverForm')?.addEventListener('submit', recoverNickname);
  document.querySelectorAll('[data-account-mode]').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.accountMode)));
  document.addEventListener('click', e => {
    const btn = e.target.closest('.player-link');
    if (btn?.dataset.nickname) showPlayer(btn.dataset.nickname);
  });
}

bind();
loadMe();

window.KUKAC_ACCOUNT = {
  startRun, submitRun, loadMe, loadLeaderboard, showPlayer,
  get player(){ return state.player; },
  get cloudAvailable(){ return state.cloudAvailable; }
};
})();
