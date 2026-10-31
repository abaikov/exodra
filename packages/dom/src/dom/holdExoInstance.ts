import { mountExoLiveChild } from './factories/createExoDomChildFactory';
import type { TExoDomChild } from './types/TExoDomChild';

// The last line of all SIX paths that wire into a child — `materialiseExoChild`,
// `buildIntoExoChild` and the four hydration adopts — in one place, because a child finished on
// five of them and forgotten on the sixth is a lifecycle leak nothing makes visible.
// The hook is replaced ONLY where the wire filled the live slot, so every other child keeps
// `EXO_NO_MOUNT` and the `child.mount !== EXO_NO_MOUNT` test goes on answering `false` for them.
export function holdExoInstance(child: TExoDomChild): void {
    if (child.live !== null) child.mount = mountExoLiveChild;
}
