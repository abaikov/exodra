import { mount } from '@exodra/dom';
import type { ExodraSchema } from './schema';

export function mountExodra(
    container: HTMLElement,
    schema: ExodraSchema
): ReturnType<typeof mount> {
    return mount(schema, container);
}

export function unmountExodra(
    container: HTMLElement,
    mounted: ReturnType<typeof mount>
): void {
    mounted.dispose();
    container.innerHTML = '';
    if (container.parentNode) {
        container.parentNode.removeChild(container);
    }
}
