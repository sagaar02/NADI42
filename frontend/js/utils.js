const NADI_DEMO_KEY = 'nadi42_demo_state';
const NADI_ROLE_KEY = 'nadi42_role';

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function readDemoState() {
  const current = safeParse(localStorage.getItem(NADI_DEMO_KEY), null);
  if (current) return current;

  const initial = {
    mother: {
      name: 'Meena Sharma',
      day: 11,
      asha: 'Priya',
      phc: 'Kaveri PHC',
      risk: 'green',
      currentRisk: 'green'
    },
    checkIns: [
      { id: 'checkin-1', date: 'Day 1', riskLevel: 'green', reasons: ['No warning signs'] },
      { id: 'checkin-2', date: 'Day 7', riskLevel: 'green', reasons: ['Stable recovery'] },
      { id: 'checkin-3', date: 'Day 11', riskLevel: 'green', reasons: ['No warning signs'] }
    ],
    cases: [],
    followUps: [],
    riskLevel: 'green',
    lastCheckIn: null,
    caseStatus: 'stable'
  };

  localStorage.setItem(NADI_DEMO_KEY, JSON.stringify(initial));
  return initial;
}

function writeDemoState(value) {
  localStorage.setItem(NADI_DEMO_KEY, JSON.stringify(value));
  return value;
}

function resetDemoState() {
  const resetState = {
    mother: {
      name: 'Meena Sharma',
      day: 11,
      asha: 'Priya',
      phc: 'Kaveri PHC',
      risk: 'green',
      currentRisk: 'green'
    },
    checkIns: [
      { id: 'checkin-1', date: 'Day 1', riskLevel: 'green', reasons: ['No warning signs'] },
      { id: 'checkin-2', date: 'Day 7', riskLevel: 'green', reasons: ['Stable recovery'] },
      { id: 'checkin-3', date: 'Day 11', riskLevel: 'green', reasons: ['No warning signs'] }
    ],
    cases: [],
    followUps: [],
    riskLevel: 'green',
    lastCheckIn: null,
    caseStatus: 'stable'
  };

  localStorage.setItem(NADI_DEMO_KEY, JSON.stringify(resetState));
  return resetState;
}

function getDemoRole() {
  return localStorage.getItem(NADI_ROLE_KEY) || 'mother';
}

function setDemoRole(role) {
  localStorage.setItem(NADI_ROLE_KEY, role);
  return role;
}

function calculateRiskLevel(payload = {}) {
  const answers = {
    bleeding: payload.bleeding || 'normal',
    fever: Boolean(payload.fever),
    severeHeadache: Boolean(payload.severeHeadache),
    visionChanges: Boolean(payload.visionChanges),
    emotionalDistress: Boolean(payload.emotionalDistress),
    feedingDifficulty: Boolean(payload.feedingDifficulty)
  };

  const reasons = [];

  if (answers.bleeding === 'heavy' || answers.bleeding === 'more') {
    reasons.push('Increased bleeding');
  }

  if (answers.fever) reasons.push('Fever');
  if (answers.severeHeadache) reasons.push('Severe headache');
  if (answers.visionChanges) reasons.push('Vision changes');
  if (answers.emotionalDistress) reasons.push('Emotional distress');
  if (answers.feedingDifficulty) reasons.push('Feeding difficulty');

  if (answers.fever || answers.severeHeadache || answers.visionChanges || answers.bleeding === 'heavy') {
    return {
      riskLevel: 'red',
      riskReasons: reasons.length ? reasons : ['Support needed today'],
      supportMessage: 'Support needed today'
    };
  }

  if (answers.bleeding === 'more' || answers.emotionalDistress || answers.feedingDifficulty) {
    return {
      riskLevel: 'amber',
      riskReasons: reasons.length ? reasons : ['Please follow up with your care team'],
      supportMessage: 'Please follow up with your care team'
    };
  }

  return {
    riskLevel: 'green',
    riskReasons: ['No concerning symptoms reported'],
    supportMessage: "You're on track"
  };
}

window.NadiUtils = {
  NADI_DEMO_KEY,
  NADI_ROLE_KEY,
  readDemoState,
  writeDemoState,
  resetDemoState,
  getDemoRole,
  setDemoRole,
  calculateRiskLevel
};
