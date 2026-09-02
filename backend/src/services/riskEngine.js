function calculateRisk(data) {
  const reasons = [];

  if (data.bleeding === 'heavy') {
    reasons.push('Heavy bleeding');
  } else if (data.bleeding === 'more') {
    reasons.push('Increased bleeding');
  }

  if (data.fever) {
    reasons.push('Fever');
  }

  if (data.severeHeadache) {
    reasons.push('Severe headache');
  }

  if (data.visionChanges) {
    reasons.push('Vision changes');
  }

  if (data.emotionalDistress) {
    reasons.push('Emotional distress');
  }

  if (data.feedingDifficulty) {
    reasons.push('Feeding difficulty');
  }

  if (
    data.bleeding === 'heavy' ||
    data.fever ||
    data.severeHeadache ||
    data.visionChanges
  ) {
    return {
      level: 'red',
      reasons: reasons.length ? reasons : ['Urgent symptoms reported'],
      supportMessage: 'Support is needed today'
    };
  }

  if (
    data.bleeding === 'more' ||
    data.emotionalDistress ||
    data.feedingDifficulty
  ) {
    return {
      level: 'amber',
      reasons: reasons.length ? reasons : ['Follow-up symptoms reported'],
      supportMessage: 'Please follow up with your care team'
    };
  }

  return {
    level: 'green',
    reasons: ['No warning signs detected'],
    supportMessage: "You're on track"
  };
}

module.exports = calculateRisk;
