import type { HashAlgorithm, HashFailure } from './core';
export type HashRequest = { id: string; algorithm: HashAlgorithm; file: File };
export type HashResponse = { id: string; algorithm: HashAlgorithm } & (
  { type: 'progress'; loaded: number; total: number } |
  { type: 'result'; digest: string } | { type: 'error'; code: HashFailure }
);
