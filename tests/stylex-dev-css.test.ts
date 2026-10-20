import { beforeEach, describe, expect, it } from 'vitest';
import { createStylexCssRefresh } from '../src/styles/stylex-dev-css';

let original: HTMLLinkElement;
beforeEach(() => {
  document.head.innerHTML = '';
  original = document.createElement('link');
  original.rel = 'stylesheet';
  original.href = '/virtual:stylex.css';
  document.head.append(original);
});
const latest = () => document.head.querySelectorAll('link')[1]!;

describe('DEV StyleX stylesheet replacement', () => {
  it('retains the active blocking sheet until the replacement finishes loading', () => {
    const { refresh } = createStylexCssRefresh(original);
    refresh();
    const replacement = latest();
    expect(original.isConnected).toBe(true);
    expect(original.getAttribute('href')).toBe('/virtual:stylex.css');
    expect(replacement.href).toContain('/virtual:stylex.css?t=');
    replacement.dispatchEvent(new Event('load'));
    expect(original.isConnected).toBe(false);
    expect(replacement.isConnected).toBe(true);
    expect(document.head.querySelectorAll('link')).toHaveLength(1);
  });
  it('ignores superseded HMR responses without removing the active sheet', () => {
    const { refresh } = createStylexCssRefresh(original);
    refresh();
    const superseded = latest();
    refresh();
    const replacement = latest();
    superseded.dispatchEvent(new Event('load'));
    expect(superseded.isConnected).toBe(false);
    expect(original.isConnected).toBe(true);
    replacement.dispatchEvent(new Event('load'));
    expect(original.isConnected).toBe(false);
    expect(replacement.isConnected).toBe(true);
  });
  it('keeps the working sheet after a failed request and permits a retry', () => {
    const { refresh } = createStylexCssRefresh(original);
    refresh();
    latest().dispatchEvent(new Event('error'));
    expect(original.isConnected).toBe(true);
    expect(document.head.querySelectorAll('link')).toHaveLength(1);
    refresh();
    latest().dispatchEvent(new Event('load'));
    expect(original.isConnected).toBe(false);
    expect(document.head.querySelectorAll('link')).toHaveLength(1);
  });
  it('disposes pending work without removing the current stylesheet', () => {
    const { refresh, dispose } = createStylexCssRefresh(original);
    refresh();
    const pending = latest();
    dispose();
    pending.dispatchEvent(new Event('load'));
    expect(original.isConnected).toBe(true);
    expect(pending.isConnected).toBe(false);
  });
});
