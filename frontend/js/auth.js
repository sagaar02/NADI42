function setActiveRole(role) {
  const normalized = ['mother', 'asha', 'phc'].includes(role) ? role : 'mother';
  localStorage.setItem('nadi42_role', normalized);
  return normalized;
}

function getActiveRole() {
  return localStorage.getItem('nadi42_role') || 'mother';
}

function routeByRole() {
  const role = getActiveRole();
  const routes = {
    mother: '/pages/mother/dashboard.html',
    asha: '/pages/asha/dashboard.html',
    phc: '/pages/phc/dashboard.html'
  };

  window.location.href = routes[role] || routes.mother;
}

window.NadiAuth = { setActiveRole, getActiveRole, routeByRole };
