import { useEffect, useState } from 'react';
import { useDebouncedValue } from './use-debounced-value';

/**
 * State for a text box whose value is only committed once typing pauses. `value` is the
 * committed value (e.g. from the URL); `onCommit` saves a new one.
 */
export function useDebouncedInput(
  value: string,
  onCommit: (next: string) => void,
  delayMs: number,
) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, delayMs);

  // Follow changes made elsewhere, such as "Clear all".
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) {
      onCommit(debounced);
    }
    // Only a newly settled text should commit; `value` and `onCommit` changing must not.
  }, [debounced]);

  return { text, setText, isPending: text !== debounced };
}
