import type { ReactNode } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { Toast } from '@base-ui/react/toast';
import { ToastViewport, type UiLabels } from './Toast';

/** Each hydrated Lab/Tool owns its queue. The static Site Shell never imports this. */
export function UiProvider({
  children,
  labels,
}: {
  children: ReactNode;
  labels: UiLabels;
}) {
  return (
    <Tooltip.Provider>
      <Toast.Provider limit={3} timeout={5000}>
        {children}
        <ToastViewport labels={labels} />
      </Toast.Provider>
    </Tooltip.Provider>
  );
}
