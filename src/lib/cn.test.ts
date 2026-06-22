import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins truthy class parts and drops falsy ones', () => {
    expect(cn('a', false, 'b', null, undefined, 'c')).toBe('a b c');
  });
});
