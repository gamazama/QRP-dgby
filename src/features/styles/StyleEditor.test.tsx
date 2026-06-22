import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SUNFLOWER_STYLE } from '@/engine/presets';
import { StyleEditor } from './StyleEditor';

describe('StyleEditor', () => {
  it('emits an updated config when a control changes', () => {
    const onChange = vi.fn();
    render(<StyleEditor config={SUNFLOWER_STYLE} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Show frame'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as typeof SUNFLOWER_STYLE;
    expect(next.showFrame).toBe(false);
    // unrelated fields are preserved
    expect(next.lobeCount).toBe(SUNFLOWER_STYLE.lobeCount);
  });
});
