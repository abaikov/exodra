export function readExoReactEventName(name: string, tag: string): string {
    let event = name.slice(2);
    if (event.endsWith('Capture')) event = event.slice(0, -7);
    if (event === 'DoubleClick') return 'dblclick';
    if (event === 'Focus') return 'focusin';
    if (event === 'Blur') return 'focusout';
    if (event === 'Change' && (tag === 'input' || tag === 'textarea')) return 'input';
    return event.toLowerCase();
}
