import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { NumberStepper } from '../src/ui/NumberStepper';

it('supports direct decimal input, buttons, keyboard stepping, and limits without a visible native number input', async () => {
  const user = userEvent.setup();
  function Field() {
    const [value, setValue] = useState(1.65);
    return <NumberStepper label="Line height" decreaseLabel="Decrease line height" increaseLabel="Increase line height"
      value={value} min={1} max={2.6} step={0.05} fractionDigits={2} locale="en" onValueChange={setValue} />;
  }
  render(<Field />);
  const input = screen.getByRole<HTMLInputElement>('spinbutton', { name: 'Line height' });
  expect(input.type).toBe('text');
  const increase = screen.getByRole('button', { name: 'Increase line height' });
  await user.click(increase);
  expect(input.value).toBe('1.7');
  await user.click(input);
  await user.keyboard('{ArrowDown}');
  expect(input.value).toBe('1.65');
  await user.clear(input);
  expect(input.value).toBe('');
  await user.keyboard('{Enter}');
  expect(input.value).toBe('1.65');
  await user.clear(input);
  await user.type(input, '2.75{Enter}');
  expect(input.value).toBe('2.6');
  await user.click(increase);
  expect(input.value).toBe('2.6');
  await user.click(screen.getByRole('button', { name: 'Decrease line height' }));
  expect(input.value).toBe('2.55');
});
