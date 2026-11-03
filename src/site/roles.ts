/** Shared identity semantics; editorial selections remain in homepage-showcase. */
export const roles = {
  painter: { zh: '画师', en: 'Artists', icon: 'Palette' },
  composer: { zh: '调音师', en: 'Audio Engineers', icon: 'MusicNotes' },
  developer: { zh: '开发者', en: 'Developers', icon: 'Code' },
  animator: { zh: '动画师', en: 'Animators', icon: 'FilmStrip' },
  operations: { zh: '运营', en: 'Operations', icon: 'Megaphone' },
  studio: { zh: '工作室', en: 'Studios', icon: 'Buildings' },
} as const;
export type RoleId = keyof typeof roles;
export function roleLabel(id: RoleId) { return { zh: roles[id].zh, en: roles[id].en }; }
