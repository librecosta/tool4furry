import { type Locale } from '../i18n/locale';
import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react';
import type { Region } from '../config/region';
import { messages } from '../i18n/messages';
import { toolLoaders } from './loaders';
import { UiProvider } from '../ui/UiProvider';
import { getAvailableTools } from './registry';
import ToolPageFrame from './ToolPageFrame';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import type { LanguageLink } from '../site/language';
class LoadBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function ToolRuntime({
  toolId,
  region,
  locale,
  intro,
  navigation,
}: {
  toolId: string;
  region: Region; locale: Locale;
  intro?: ReactNode;
  navigation?: LanguageLink;
}) {
  const t = messages[locale];
  const definition = getAvailableTools(region, import.meta.env.DEV)
    .find((tool) => tool.id === toolId);
  const Tool = useMemo(() => {
    const loader = toolLoaders[toolId];
    return loader ? lazy(loader) : null;
  }, [toolId]);
  const statusStyle = stylex.props(
    s.status,
    definition?.mode === 'canvas' && !intro && s.canvasStatus,
  );
  const fallback = (
    <p role="alert" {...statusStyle}>
      {t.unavailable}
    </p>
  );
  return (
    <UiProvider labels={t}>
      <ToolPageFrame
        region={region} locale={locale}
        mode={definition?.mode ?? 'custom'}
        title={definition?.copy[locale].title ?? t.unavailable}
        currentToolId={definition?.id}
        intro={intro}
        navigation={navigation}
      >
        <div data-tool-runtime={toolId}>
          <LoadBoundary key={toolId} fallback={fallback}>
            <Suspense
              fallback={
                <p role="status" {...statusStyle}>
                  {t.loading}
                </p>
              }
            >
              {definition && Tool ? <Tool region={region} locale={locale} /> : fallback}
            </Suspense>
          </LoadBoundary>
        </div>
      </ToolPageFrame>
    </UiProvider>
  );
}

const s = stylex.create({
  status: { padding: tokens.space24, margin: 0 },
  // Loading/error copy stays below the product entry before a Canvas tool mounts.
  canvasStatus: { paddingTop: 96 },
});
