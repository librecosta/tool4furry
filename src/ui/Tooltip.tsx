import styles from './Tooltip.module.scss';
import type { ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Popover } from '@base-ui/react/popover';
export function Tooltip({
  children,
  content,
  open,
  onOpenChange,
}: {
  children: ReactElement;
  content: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <BaseTooltip.Root open={open} onOpenChange={onOpenChange}>
      <BaseTooltip.Trigger render={children} delay={150} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          sideOffset={8}
          collisionPadding={12}
          className={styles.positioner}
        >
          <BaseTooltip.Popup className={styles.popup}>
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
/** Hover help that can also be opened by touch or keyboard activation. */
export function HelpPopover({ children, content, label }: {
  children: ReactElement;
  content: ReactNode;
  label: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger render={children} openOnHover delay={150} />
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} collisionPadding={12} className={styles.positioner}>
          <Popover.Popup aria-label={label} initialFocus={false} className={styles.popup}>
            <Popover.Description className={styles.description}>{content}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
