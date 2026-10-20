import type { ReactElement, ReactNode } from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
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
      <BaseTooltip.Trigger render={children} />
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
const styles = stylex.create({
  positioner: { zIndex: tokens.layerTooltip },
  popup: {
    maxWidth: 'min(280px, calc(100vw - 24px))',
    backgroundColor: tokens.surfaceMuted,
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
