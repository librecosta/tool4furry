import { Menu } from '@base-ui/react/menu';
import { FlaskIcon } from '@phosphor-icons/react';
import { labModes, type LabMode } from './routes';
import type { LabMessages } from './messages';
import c from '../ui/controls.module.scss';
import s from '../styles/menu.module.scss';

export default function LabMenu({
  mode,
  t,
}: {
  mode: LabMode;
  t: LabMessages;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`${t.lab} · DEV ONLY`}
        className={[c.button, c.ghost, c.small].filter(Boolean).join(' ')}
      >
        <FlaskIcon size={18} aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          align="end"
          sideOffset={8}
          collisionPadding={16}
          className={s.positioner}
        >
          <Menu.Popup aria-label={t.lab} className={s.popup}>
            <Menu.Group>
              <Menu.GroupLabel className={s.label}>
                DEV ONLY · {t.lab}
              </Menu.GroupLabel>
              <p className={s.note}>{t.labNote}</p>
              {labModes.map((item) => (
                <Menu.LinkItem
                  key={item}
                  href={`/lab/${item}`}
                  aria-current={mode === item ? 'page' : undefined}
                  className={s.item}
                >
                  {t[item]}
                </Menu.LinkItem>
              ))}
            </Menu.Group>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
