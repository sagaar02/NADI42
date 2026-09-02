(function () {
  const DEMO_MODE = false;
  const credentials = {
    mother: { email: 'meena@nadi42.demo', password: 'Demo@123' },
    asha: { email: 'priya@nadi42.demo', password: 'Demo@123' },
    phc: { email: 'phc@nadi42.demo', password: 'Demo@123' }
  };
  const routes = {
    mother: '/pages/mother/dashboard.html',
    asha: '/pages/asha/dashboard.html',
    phc: '/pages/phc/dashboard.html'
  };

  const savedUser = () => {
    try { return JSON.parse(localStorage.getItem('nadi42_user') || 'null'); } catch (_) { return null; }
  };

  async function signIn(role) {
    const user = savedUser();
    if (localStorage.getItem('nadi42_token') && user?.role === role) {
      try {
        await api.get('/auth/me');
        return user;
      } catch (_) {
        localStorage.removeItem('nadi42_token');
        localStorage.removeItem('nadi42_user');
      }
    }
    const result = await api.login(credentials[role].email, credentials[role].password);
    return result.user || result.data?.user;
  }

  function showError(error) {
    console.error('Nadi42 API error:', error);
    window.alert(error.message || 'Unable to connect to Nadi42. Is the backend running on port 5000?');
  }

  function text(selector, value) {
    const element = document.querySelector(selector);
    if (element && value !== undefined && value !== null) element.textContent = value;
  }

  function statusClass(level) {
    return level === 'red' ? 'red' : level === 'amber' ? 'amber' : 'green';
  }

  async function landing() {
    const navigate = async (role) => {
      try {
        localStorage.setItem('nadi42_role', role);
        await signIn(role);
        window.location.href = routes[role] || routes.mother;
      } catch (error) { showError(error); }
    };
    document.querySelectorAll('[data-nav], [data-role]').forEach((button) => {
      button.addEventListener('click', () => navigate(button.dataset.nav || button.dataset.role || 'mother'));
    });
  }

  async function motherDashboard() {
    try {
      await signIn('mother');
      const result = await api.get('/mothers/me');
      const profile = result.data || {};
      text('h1', `Good morning, ${(profile.name || 'Meena').split(' ')[0]}`);
      text('p.text-body-lg', `Day ${profile.postpartumDay || 0} after birth`);
      const start = Array.from(document.querySelectorAll('button')).find((item) => (item.textContent || '').includes("Start today's check-in"));
      if (start) start.addEventListener('click', () => { window.location.href = '/pages/mother/daily-check-in.html'; });
      const timeline = Array.from(document.querySelectorAll('a')).find((item) => (item.textContent || '').toLowerCase().includes('care timeline'));
      if (timeline) timeline.href = '/pages/mother/timeline.html';
    } catch (error) { showError(error); }
  }

  async function checkIn() {
    const form = document.querySelector('form');
    const continueButton = document.getElementById('continue-btn');
    if (!form || !continueButton) return;
    continueButton.addEventListener('click', async () => {
      const bleeding = form.querySelector('input[name="bleeding_status"]:checked')?.value;
      if (!bleeding) return window.alert('Please select an answer before continuing.');
      continueButton.disabled = true;
      try {
        await signIn('mother');
        await api.post('/checkins', {
          bleeding,
          fever: form.querySelector('[name="fever"]:checked')?.value === 'yes',
          severeHeadache: form.querySelector('[name="severeHeadache"]:checked')?.value === 'yes',
          visionChanges: form.querySelector('[name="visionChanges"]:checked')?.value === 'yes',
          emotionalDistress: form.querySelector('[name="emotionalDistress"]:checked')?.value === 'yes',
          feedingDifficulty: form.querySelector('[name="feedingDifficulty"]:checked')?.value === 'yes'
        });
        window.location.href = '/pages/mother/check-in-result.html';
      } catch (error) {
        continueButton.disabled = false;
        showError(error);
      }
    });
  }

  async function result() {
    try {
      await signIn('mother');
      const response = await api.get('/checkins/latest');
      const checkInData = response.data;
      const level = statusClass(checkInData?.riskLevel);
      text('h1', level === 'red' ? 'Support needed today' : level === 'amber' ? "Let's keep an eye on this." : 'You are on track');
      const badge = document.getElementById('risk-badge');
      if (badge) { badge.textContent = level.toUpperCase(); badge.className = `nadi-status-badge nadi-status-${level}`; }
    } catch (error) { showError(error); }
  }

  let pollingInterval = null;

  async function refreshAshaDashboard() {
    try {
      await signIn('asha');
      const response = await api.get('/asha/dashboard');
      const data = response.data || {};
      const metrics = data.metrics || {};
      const displays = document.querySelectorAll('.text-display');
      if (displays[0]) displays[0].textContent = String(metrics.stableMothers !== undefined ? metrics.stableMothers : 0);
      if (displays[1]) displays[1].textContent = String(metrics.pendingFollowUps !== undefined ? metrics.pendingFollowUps : 0);
      if (displays[2]) displays[2].textContent = String(metrics.urgentCases !== undefined ? metrics.urgentCases : 0);
      const caseItem = data.urgentCases?.[0];
      const review = Array.from(document.querySelectorAll('button')).find((item) => (item.textContent || '').toLowerCase().includes('review case'));
      if (review && caseItem?._id) {
        review.onclick = () => { window.location.href = `/pages/asha/case-detail.html?id=${caseItem._id}`; };
      }
    } catch (error) {
      console.warn('ASHA dashboard poll error:', error.message);
    }
  }

  async function ashaDashboard() {
    try {
      await refreshAshaDashboard();
      if (!pollingInterval) {
        pollingInterval = setInterval(refreshAshaDashboard, 4000);
      }
    } catch (error) { showError(error); }
  }

  async function caseDetail() {
    const caseId = new URLSearchParams(window.location.search).get('id');
    if (!caseId) return window.alert('This case link does not contain a case ID.');
    try {
      await signIn('asha');
      const response = await api.get(`/cases/${caseId}`);
      const item = response.data?.case || {};
      const motherName = item.motherId?.userId?.name || item.motherId?.name || 'Mother';
      text('#mother-name', motherName);
      const riskLevel = (item.riskLevel || 'red').toUpperCase();
      const status = item.status || 'open';
      const badgeText = status === 'resolved' ? 'RESOLVED' : `${riskLevel} (${status.toUpperCase()})`;
      text('#risk-level', badgeText);
      const riskBadge = document.getElementById('risk-level');
      if (riskBadge) {
        riskBadge.className = `rounded-full px-4 py-2 text-xs font-bold uppercase ${status === 'resolved' ? 'status-green' : item.riskLevel === 'amber' ? 'status-amber' : 'status-red'}`;
      }
      text('#risk-reasons', (item.trigger || []).join(', ') || 'Reported symptoms');
      text('#asha-name', item.assignedAshaId?.name || 'Priya');
      text('#phc-name', item.phcId?.name || 'Kaveri PHC');
      const button = (label) => Array.from(document.querySelectorAll('button')).find((btn) => (btn.textContent || '').toLowerCase().includes(label));
      
      const ackBtn = button('acknowledge');
      if (ackBtn) {
        ackBtn.onclick = async () => {
          try {
            await api.patch(`/cases/${caseId}/acknowledge`);
            window.location.reload();
          } catch (err) { showError(err); }
        };
      }

      const schedBtn = button('schedule follow-up');
      if (schedBtn) {
        schedBtn.onclick = async () => {
          try {
            await api.post('/followups', { caseId, scheduledAt: new Date(Date.now() + 86400000).toISOString(), notes: 'Follow-up call' });
            window.alert('Follow-up scheduled successfully.');
            window.location.reload();
          } catch (err) { showError(err); }
        };
      }

      const resBtn = button('resolve case');
      if (resBtn) {
        resBtn.onclick = async () => {
          try {
            await api.patch(`/cases/${caseId}/resolve`);
            window.location.href = '/pages/asha/dashboard.html';
          } catch (err) { showError(err); }
        };
      }
    } catch (error) { showError(error); }
  }

  async function refreshPhcDashboard() {
    try {
      await signIn('phc');
      const response = await api.get('/phc/dashboard');
      const metrics = response.data?.metrics || {};
      document.querySelectorAll('[data-metric]').forEach((node) => {
        const key = node.dataset.metric;
        if (metrics[key] !== undefined) node.textContent = String(metrics[key]);
        else if (key === 'total' && metrics.totalMothers !== undefined) node.textContent = String(metrics.totalMothers);
      });
    } catch (error) {
      console.warn('PHC dashboard poll error:', error.message);
    }
  }

  async function phcDashboard() {
    try {
      await refreshPhcDashboard();
      if (!pollingInterval) {
        pollingInterval = setInterval(refreshPhcDashboard, 4000);
      }
    } catch (error) { showError(error); }
  }

  async function timeline() {
    try {
      await signIn('mother');
      const response = await api.get('/mothers/me/timeline');
      const target = document.getElementById('timeline');
      const events = response.data?.events || [];
      if (target) target.innerHTML = events.map((event) => `<div class="flex gap-4 items-start border-l-2 border-surface-container-high pl-5 pb-2"><div class="w-4 h-4 rounded-full mt-2 bg-green-500"></div><div class="flex-1 rounded-2xl bg-surface-container-low p-4"><div class="flex items-center justify-between gap-4"><h2 class="text-xl font-semibold text-primary">${event.title || event.type || 'Care event'}</h2><span class="rounded-full px-3 py-1 text-xs font-semibold uppercase status-green">${event.status || 'complete'}</span></div><p class="mt-2 text-sm text-on-surface-variant">${event.description || event.detail || ''}</p></div></div>`).join('');
    } catch (error) { showError(error); }
  }

  function wireCommonInteractions() {
    const path = window.location.pathname;
    const go = (url) => { window.location.href = url; };
    const links = Array.from(document.querySelectorAll('a'));
    const byText = (value) => links.find((link) => (link.textContent || '').trim().toLowerCase().includes(value));

    if (path.includes('/pages/mother/')) {
      const overview = byText('overview');
      if (overview) overview.href = '/pages/mother/dashboard.html';
      const activeCases = byText('active cases');
      if (activeCases) activeCases.href = '/pages/mother/dashboard.html#active-cases';
      const timelineLink = byText('care timeline') || byText('timeline');
      if (timelineLink) timelineLink.href = '/pages/mother/timeline.html';
      const landing = byText('log out');
      if (landing) landing.addEventListener('click', (event) => { event.preventDefault(); localStorage.clear(); go('/pages/landing/'); });
      document.querySelectorAll('button[aria-label="Go back"]').forEach((button) => button.addEventListener('click', () => go('/pages/mother/dashboard.html')));
      document.querySelectorAll('button[aria-label="Save and close"]').forEach((button) => button.addEventListener('click', () => go('/pages/mother/dashboard.html')));
      const resultBack = Array.from(document.querySelectorAll('button')).find((button) => (button.textContent || '').toLowerCase().includes('contact asha'));
      if (resultBack) resultBack.addEventListener('click', () => window.alert('Your ASHA has been notified through Nadi42.'));
      const tips = Array.from(document.querySelectorAll('button')).find((button) => (button.textContent || '').toLowerCase().includes('recovery tips'));
      if (tips) tips.addEventListener('click', () => go('/pages/mother/timeline.html'));
    }

    if (path.includes('/pages/asha/')) {
      const overview = byText('overview');
      if (overview) overview.href = '/pages/asha/dashboard.html';
      const timelineLink = byText('care timeline');
      if (timelineLink) timelineLink.href = '/pages/asha/dashboard.html';
      const support = byText('support');
      if (support) support.addEventListener('click', (event) => { event.preventDefault(); window.alert('Nadi42 support is available through your PHC supervisor.'); });
      const logout = byText('log out');
      if (logout) logout.addEventListener('click', (event) => { event.preventDefault(); localStorage.clear(); go('/pages/landing/'); });
      const newCase = Array.from(document.querySelectorAll('button')).find((button) => (button.textContent || '').toLowerCase().includes('new case'));
      if (newCase) newCase.addEventListener('click', () => window.alert('New cases are created from a mother check-in.'));
      const viewAll = byText('view all');
      if (viewAll) viewAll.href = '/pages/asha/dashboard.html#attention-required';
      const scheduleVisit = Array.from(document.querySelectorAll('button')).find((button) => (button.textContent || '').toLowerCase().includes('schedule visit'));
      if (scheduleVisit) scheduleVisit.addEventListener('click', () => window.alert('Select a case to schedule its follow-up.'));
    }

    if (path.includes('/pages/phc/')) {
      const landing = byText('landing');
      if (landing) landing.href = '/pages/landing/';
    }
  }

  function init() {
    const path = window.location.pathname;
    if (path === '/' || path === '/pages/landing/' || path.endsWith('/pages/landing/index.html')) return landing();
    if (path.includes('/pages/mother/dashboard.html')) return motherDashboard();
    if (path.includes('/pages/mother/check-in.html') || path.includes('/pages/mother/daily-check-in.html')) return checkIn();
    if (path.includes('/pages/mother/result.html') || path.includes('/pages/mother/check-in-result.html')) return result();
    if (path.includes('/pages/mother/timeline.html')) return timeline();
    if (path.includes('/pages/asha/dashboard.html')) return ashaDashboard();
    if (path.includes('/pages/asha/case-detail.html') || path.includes('/pages/asha/urgent-case.html')) return caseDetail();
    if (path.includes('/pages/phc/dashboard.html')) return phcDashboard();
  }

  window.addEventListener('DOMContentLoaded', () => { init(); wireCommonInteractions(); });
  window.NadiDemo = { DEMO_MODE, signIn };
})();
