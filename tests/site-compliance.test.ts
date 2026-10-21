import { describe, expect, it } from 'vitest';
import {
  getComplianceEntries,
  icpQueryUrl,
  siteCompliance,
  type RegionalCompliance,
} from '../src/config/compliance';

// Deliberately synthetic records, never imported by production source.
const records: RegionalCompliance = {
  cn: {
    icp: { number: ' 测试ICP备00000000号-1 ' },
    publicSecurity: {
      number: '测试公网安备00000000000000号',
      href: 'https://example.invalid/approved-record',
      iconSrc: '/test-only-approved-icon.svg',
    },
    additional: [{ label: 'TEST_ONLY_LICENSE' }],
  },
  global: { additional: [{ label: 'GLOBAL_ONLY_NOTICE' }] },
};

describe('static regional compliance configuration', () => {
  it('ships no records, placeholders or invented registrations', () => {
    expect(siteCompliance).toEqual({ cn: {}, global: {} });
    expect(getComplianceEntries('cn')).toEqual([]);
    expect(getComplianceEntries('global')).toEqual([]);
  });

  it('uses only the official ICP query entry and the supplied approved police link/icon', () => {
    expect(getComplianceEntries('cn', records)).toEqual([
      { label: '测试ICP备00000000号-1', href: icpQueryUrl },
      {
        label: '测试公网安备00000000000000号',
        href: 'https://example.invalid/approved-record',
        iconSrc: '/test-only-approved-icon.svg',
      },
      { label: 'TEST_ONLY_LICENSE' },
    ]);
    expect(icpQueryUrl).toBe('https://beian.miit.gov.cn/');
  });

  it('does not inherit CN records into Global', () => {
    expect(getComplianceEntries('global', records)).toEqual([
      { label: 'GLOBAL_ONLY_NOTICE' },
    ]);
    // Even an accidental shared CN object must not expose its ICP/police fields.
    expect(getComplianceEntries('global', { cn: {}, global: records.cn })).toEqual([
      { label: 'TEST_ONLY_LICENSE' },
    ]);
  });

  it('omits empty numbers and incomplete police metadata without guessing a link/icon', () => {
    expect(getComplianceEntries('cn', {
      cn: {
        icp: { number: '  ' },
        publicSecurity: { number: '测试记录', href: '', iconSrc: '' },
        additional: [{ label: '' }],
      },
      global: {},
    })).toEqual([]);
  });
});
