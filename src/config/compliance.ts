import type { Region } from './region';

export const icpQueryUrl = 'https://beian.miit.gov.cn/';

export type ComplianceEntry = Readonly<{
  label: string;
  href?: string;
  iconSrc?: string;
}>;
type RegistrationKind = 'icp' | 'public-security';
type ListedComplianceEntry = ComplianceEntry & { kind: RegistrationKind | 'additional' };
export type SiteCompliance = Readonly<{
  icp?: { number: string };
  publicSecurity?: { number: string; href: string; iconSrc: string };
  additional?: readonly ComplianceEntry[];
}>;
export type RegionalCompliance = Readonly<Record<Region, SiteCompliance>>;

// Add only approved, site-specific records and the actual approved link/icon.
// CN DEV can show a placeholder for each missing registration.
export const siteCompliance: RegionalCompliance = {
  cn: { icp: { number: '蜀ICP备2025158691号-4' } },
  global: {},
};

export function getComplianceEntries(
  region: Region,
  configuration: RegionalCompliance = siteCompliance,
): readonly ListedComplianceEntry[] {
  const current = configuration[region];
  const entries: ListedComplianceEntry[] = [];
  if (region === 'cn') {
    if (current.icp?.number.trim())
      entries.push({ kind: 'icp', label: current.icp.number.trim(), href: icpQueryUrl });
    const police = current.publicSecurity;
    if (police?.number.trim() && police.href.trim() && police.iconSrc.trim())
      entries.push({
        kind: 'public-security',
        label: police.number.trim(),
        href: police.href,
        iconSrc: police.iconSrc,
      });
  }
  return [...entries, ...(current.additional ?? []).map(entry => ({ ...entry, kind: 'additional' as const }))].filter(
    (entry) => entry.label.trim().length > 0,
  );
}

/** Presentation hint only; never represented as an approved compliance entry. */
export function showCompliancePreview(region: Region, dev: boolean, entries: readonly ListedComplianceEntry[], kind: RegistrationKind) {
  return dev && region === 'cn' && !entries.some(entry => entry.kind === kind);
}
