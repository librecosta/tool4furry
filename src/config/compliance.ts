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
// Empty configuration deliberately renders no compliance row or placeholder.
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
