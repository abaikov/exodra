import type { TExoControlValue } from '../types/TExoControlValue';

// By `localName`, not `instanceof`: a control from another realm (an iframe) fails `instanceof`.
export function readExoControlValue(
    target: EventTarget | null | undefined
): TExoControlValue | undefined {
    if (target === null || target === undefined) return undefined;
    switch ((target as Element).localName) {
        case 'input': {
            const input = target as HTMLInputElement;
            switch (input.type) {
                case 'checkbox':
                    return input.checked;
                case 'radio':
                    return input.checked ? input.value : undefined;
                case 'number':
                case 'range':
                    return input.valueAsNumber;
                case 'file':
                    return input.files ?? undefined;
                default:
                    return input.value;
            }
        }
        case 'select': {
            const select = target as HTMLSelectElement;
            if (!select.multiple) return select.value;
            const options = select.selectedOptions;
            const chosen = new Array<string>(options.length);
            for (let i = 0; i < options.length; i++) chosen[i] = options[i].value;
            return chosen;
        }
        case 'textarea':
            return (target as HTMLTextAreaElement).value;
        default:
            return undefined;
    }
}
