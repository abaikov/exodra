// Marko batches updates on its own queue; `run()` drains it synchronously — the
// Marko equivalent of react's flushSync / svelte's flushSync / voby's tick, so an
// update commits INSIDE the measured region instead of after it.
import { run } from 'marko/dom';

export const markoFlush = (): void => run();
