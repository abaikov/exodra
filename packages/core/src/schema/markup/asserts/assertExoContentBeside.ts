/** REFUSAL: a content port stands for EVERYTHING inside its element, so static children beside it
 * vanish from the tree while keeping the indices this schema addresses by — every setter after
 * them is then built against the wrong element. */
export function assertExoContentBeside(tag: string): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `<${tag}> has both a content port and static children` +
              ' — a port stands for EVERYTHING inside its element, so the children ' +
              'vanish from the tree while their ports keep the indices this schema ' +
              'addresses by, and every setter after them is built against the wrong ' +
              'element. Move the static children into the wiring, or drop the port.'
            : 'EXO0039'
    );
}
