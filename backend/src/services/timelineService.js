const buildTimeline = ({ mother, checkIns, cases, followUps }) => {
  const events = [{ type: 'delivery', occurredAt: mother.deliveryDate, title: 'Delivery', riskLevel: 'green' }];
  checkIns.forEach((item) => events.push({ type: 'check_in', occurredAt: item.createdAt, title: 'Check-in completed', riskLevel: item.riskLevel, reasons: item.riskReasons }));
  cases.forEach((item) => {
    events.push({ type: 'case_created', occurredAt: item.createdAt, title: `${item.riskLevel === 'red' ? 'Urgent' : 'Care'} case created`, riskLevel: item.riskLevel, caseId: item._id, status: item.status });
    if (item.status !== 'open') events.push({ type: 'case_acknowledged', occurredAt: item.updatedAt, title: 'ASHA acknowledged case', caseId: item._id });
    if (item.resolvedAt) events.push({ type: 'case_resolved', occurredAt: item.resolvedAt, title: 'Case resolved', riskLevel: 'green', caseId: item._id });
  });
  followUps.forEach((item) => events.push({ type: `follow_up_${item.status}`, occurredAt: item.completedAt || item.scheduledAt, title: `Follow-up ${item.status}`, caseId: item.caseId, status: item.status }));
  return events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
};

module.exports = { buildTimeline };
