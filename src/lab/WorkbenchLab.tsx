import { type Locale } from '../i18n/locale';
import type { Region } from '../config/region';
import type { LabMode } from './routes';
import { messages } from './messages';
import ToolPageFrame from '../tools/ToolPageFrame';
import LabMenu from './LabMenu';
import CanvasDemo from './CanvasDemo';
import FormDemo from './FormDemo';
import BatchDemo from './BatchDemo';
import UILab from './UILab';
import FilesLab from './FilesLab';
import HeroEffectsLab from './hero-effects/HeroEffectsLab';
import type { LanguageLink } from '../site/language';

export default function WorkbenchLab({
  mode,
  region,
  locale,
  navigation,
}: {
  mode: LabMode;
  region: Region; locale: Locale;
  navigation?: LanguageLink;
}) {
  const t = messages[locale];
  return (
    <ToolPageFrame
      region={region} locale={locale}
      mode={mode === 'ui' || mode === 'files' || mode === 'hero-effects' ? 'custom' : mode}
      title={`DEMO · ${t[mode]}`}
      debug={<LabMenu mode={mode} t={t} />}
      navigation={navigation}
    >
      {mode === 'canvas' ? (
        <CanvasDemo t={t} header={null} />
      ) : mode === 'form' ? (
        <FormDemo t={t} header={null} />
      ) : mode === 'batch' ? (
        <BatchDemo t={t} header={null} />
      ) : mode === 'ui' ? (
        <UILab t={t} header={null} />
      ) : mode === 'files' ? (
        <FilesLab t={t} header={null} />
      ) : (
        <HeroEffectsLab locale={locale} />
      )}
    </ToolPageFrame>
  );
}
