export const routingLabels = { ASSIGNED: 'Đã giao', TEAM_QUEUE: 'Chờ nhóm nhận', REVIEW_REQUIRED: 'Chờ điều phối' };

export function defaultRoutingDraft(settings) {
  return { ...settings,
    units: settings.defaults.map(({ code, name }) => ({ code, name, is_active: true, members: [] })),
    routes: settings.defaults.flatMap(unit => {
      const category = settings.categories.find(row => row.name === unit.category);
      return category ? [{ category_id: category.id, unit_code: unit.code, keywords: unit.keywords }] : [];
    }),
  };
}

export function settingsPayload(settings) {
  return { version: settings.version, auto_assign: settings.auto_assign, max_open_per_agent: Number(settings.max_open_per_agent),
    units: settings.units.map(({ code, name, is_active, members }) => ({ code, name, is_active, members })),
    routes: settings.routes.map(({ category_id, unit_code, keywords }) => ({ category_id, unit_code,
      keywords: typeof keywords === 'string' ? keywords.split(',').map(word => word.trim()).filter(Boolean) : keywords })),
  };
}
