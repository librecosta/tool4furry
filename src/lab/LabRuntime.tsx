import { lazy, Suspense } from 'react';
import { messages } from '../i18n/messages';
import type { Region } from '../config/region';
import type { LabMode } from './routes';
import { UiProvider } from '../ui/UiProvider';
import type { LanguageLink } from '../site/language';
// Build cannot reach demo implementations, even when Astro scans island entries.
const Lab = import.meta.env.DEV ? lazy(() => import('./WorkbenchLab')) : null;
export default function LabRuntime({
  mode,
  region,
  navigation,
}: {
  mode: LabMode;
  region: Region;
  navigation?: LanguageLink;
}) {
  return Lab ? (
    <UiProvider labels={messages[region]}>
      <Suspense fallback={<p role="status">{messages[region].loading}</p>}>
        <Lab mode={mode} region={region} navigation={navigation} />
      </Suspense>
    </UiProvider>
  ) : null;
}
