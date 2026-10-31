import { EXO_REACT_RENDER } from '../constants/EXO_REACT_RENDER';

let scheduled = false;

function runPassiveEffects(): void {
    scheduled = false;
    const passive = EXO_REACT_RENDER.passiveEffects;
    if (passive.length === 0) return;
    EXO_REACT_RENDER.passiveEffects = [];
    for (let i = 0; i < passive.length; i++) passive[i]();
}

export function schedulePassiveExoReactEffects(now: boolean): void {
    if (now) {
        runPassiveEffects();
        return;
    }
    if (scheduled || EXO_REACT_RENDER.passiveEffects.length === 0) return;
    scheduled = true;
    if (typeof MessageChannel === 'function') {
        const channel = new MessageChannel();
        channel.port1.onmessage = (): void => {
            channel.port1.close();
            runPassiveEffects();
        };
        channel.port2.postMessage(null);
        return;
    }
    setTimeout(runPassiveEffects, 0);
}
