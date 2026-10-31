import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';

export function startTransition(run: () => void): void {
    const render = EXO_REACT_RENDER;
    const outer = render.transition;
    render.transition = true;
    try {
        run();
    } finally {
        render.transition = outer;
    }
}
