import { PaletteIcon, MusicNotesIcon, CodeIcon, FilmStripIcon, MegaphoneIcon, BuildingsIcon } from '@phosphor-icons/react/ssr';
import { roles, type RoleId } from '../../site/roles';

const icons = { Palette: PaletteIcon, MusicNotes: MusicNotesIcon, Code: CodeIcon, FilmStrip: FilmStripIcon, Megaphone: MegaphoneIcon, Buildings: BuildingsIcon };
export function roleIcon(id: RoleId) { return icons[roles[id].icon]; }
