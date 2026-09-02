document.addEventListener('DOMContentLoaded', () => {
  const role = localStorage.getItem('nadi42_role') || 'mother';
  const navLinks = document.querySelectorAll('a[href]');

  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    if (href.includes('/pages/landing') || href.includes('/pages/mother') || href.includes('/pages/asha') || href.includes('/pages/phc')) {
      link.setAttribute('data-role-aware', 'true');
    }
  });

  const logout = document.querySelector('[data-action="logout"]');
  if (logout) {
    logout.addEventListener('click', (event) => {
      event.preventDefault();
      localStorage.removeItem('nadi42_token');
      localStorage.removeItem('nadi42_role');
      window.location.href = '/pages/landing/';
    });
  }

  const roleButton = document.querySelector('[data-role]');
  if (roleButton) {
    roleButton.addEventListener('click', () => {
      const next = roleButton.dataset.role;
      localStorage.setItem('nadi42_role', next);
      window.location.href = {
        mother: '/pages/mother/dashboard.html',
        asha: '/pages/asha/dashboard.html',
        phc: '/pages/phc/dashboard.html'
      }[next] || '/pages/mother/dashboard.html';
    });
  }

  const resetButton = document.querySelector('[data-reset-demo]');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      resetDemoState();
      window.location.reload();
    });
  }
});
