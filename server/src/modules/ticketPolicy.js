const impacts = new Set(['individual', 'department', 'organization']);

export function normalizePhrase(value) {
  return String(value).normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase().replace(/đ/g, 'd').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function classifyPriority({ title, description, impact }, rules) {
  if (!impacts.has(impact)) throw new Error('Invalid impact');
  const fields = [title, description].map(value => ` ${normalizePhrase(value)} `);
  const matches = rules.filter(rule => {
    const keyword = normalizePhrase(rule.keyword);
    return Boolean(rule.is_active) && keyword.length > 0
      && fields.some(field => field.includes(` ${keyword} `));
  }).map(rule => ({ id: rule.id, keyword: rule.keyword, priority: rule.priority }));
  const organizationImpact = impact === 'organization';
  const levels = matches.map(rule => ({ URGENT: 'P1', NORMAL: 'P3' })[rule.priority] || rule.priority).filter(level => ['P1', 'P2', 'P3', 'P4'].includes(level));
  const matchedPriority = levels.sort()[0] || 'P3';
  return {
    priority: organizationImpact ? 'P1' : matchedPriority,
    evidence: { version: 1, impact, matches },
    reason: organizationImpact ? 'Ảnh hưởng toàn tổ chức'
      : levels.length ? 'Khớp quy tắc ưu tiên' : 'Ưu tiên mặc định P3',
  };
}

export function calculateDeadlines(createdAt, policy) {
  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime()) || !policy || !policy.is_active) {
    throw new Error('Valid creation time and active SLA policy required');
  }
  const response = Number(policy.response_minutes);
  const resolution = Number(policy.resolution_minutes);
  if (!Number.isSafeInteger(response) || response <= 0
      || !Number.isSafeInteger(resolution) || resolution < response) {
    throw new Error('Invalid SLA targets');
  }
  const responseDeadline = new Date(created.getTime() + response * 60000);
  const resolutionDeadline = new Date(created.getTime() + resolution * 60000);
  if (!Number.isFinite(resolutionDeadline.getTime())) throw new Error('SLA deadline overflow');
  return { response_deadline_at: responseDeadline, resolution_deadline_at: resolutionDeadline };
}

export function assertStatusTransition(from, to) {
  const transitions = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED' };
  if (!Object.hasOwn(transitions, from) || transitions[from] !== to) {
    const error = new Error('Invalid ticket status transition');
    error.statusCode = 409;
    error.code = 'INVALID_TRANSITION';
    throw error;
  }
}
