import { type Locale } from '../i18n/locale';
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
  locale,
  navigation,
}: {
  mode: LabMode;
  region: Region; locale: Locale;
  navigation?: LanguageLink;
}) {
  return Lab ? (
    <UiProvider labels={messages[locale]}>
      <Suspense fallback={<p role="status">{messages[locale].loading}</p>}>
        <Lab mode={mode} region={region} locale={locale} navigation={navigation} />
      </Suspense>
    </UiProvider>
  ) : null;
}
