import type { ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Popover } from '@base-ui/react/popover';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
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
          {...stylex.props(styles.positioner)}
        >
          <BaseTooltip.Popup {...stylex.props(styles.popup)}>
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
        <Popover.Positioner sideOffset={8} collisionPadding={12} {...stylex.props(styles.positioner)}>
          <Popover.Popup aria-label={label} initialFocus={false} {...stylex.props(styles.popup)}>
            <Popover.Description {...stylex.props(styles.description)}>{content}</Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
const styles = stylex.create({
  description: { margin: 0 },
  positioner: { zIndex: tokens.layerTooltip },
  popup: {
    maxWidth: 'min(280px, calc(100vw - 24px))',
    backgroundColor: tokens.surfaceFloating,
    color: tokens.textPrimary,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.border,
    borderRadius: tokens.radiusMd,
    paddingBlock: tokens.space8,
    paddingInline: tokens.space12,
    boxShadow: tokens.shadowFloating,
    fontSize: 13,
    overflowWrap: 'anywhere',
  },
});
