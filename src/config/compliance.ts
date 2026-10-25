import type { Region } from './region';

export const icpQueryUrl = 'https://beian.miit.gov.cn/';

export type ComplianceEntry = Readonly<{
  label: string;
  href?: string;
  iconSrc?: string;
}>;
export type SiteCompliance = Readonly<{
  icp?: { number: string };
  publicSecurity?: { number: string; href: string; iconSrc: string };
  additional?: readonly ComplianceEntry[];
}>;
export type RegionalCompliance = Readonly<Record<Region, SiteCompliance>>;

// Add only approved, site-specific records and the actual approved link/icon.
// Empty configuration renders no public records; only CN DEV may mark the slot.
export const siteCompliance: RegionalCompliance = {
  cn: {},
  global: {},
};

export function getComplianceEntries(
  region: Region,
  configuration: RegionalCompliance = siteCompliance,
): readonly ComplianceEntry[] {
  const current = configuration[region];
  const entries: ComplianceEntry[] = [];
  if (region === 'cn') {
    if (current.icp?.number.trim())
      entries.push({ label: current.icp.number.trim(), href: icpQueryUrl });
    const police = current.publicSecurity;
    if (police?.number.trim() && police.href.trim() && police.iconSrc.trim())
      entries.push({
        label: police.number.trim(),
        href: police.href,
        iconSrc: police.iconSrc,
      });
  }
  return [...entries, ...(current.additional ?? [])].filter(
    (entry) => entry.label.trim().length > 0,
  );
}

/** Presentation hint only; never represented as an approved compliance entry. */
export function showCompliancePreview(region: Region, dev: boolean, entries: readonly ComplianceEntry[]) {
  return dev && region === 'cn' && entries.length === 0;
}
