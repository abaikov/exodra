import type { TExoTermRegion } from './types/TExoTermChild';
import type { TExoTermListener, TExoTermElement } from './types/TExoTermElement';
import type { TExoTermProtoElement } from './types/TExoTermProtoElement';

// Filling `slots` and `regions` here is what leaves every connector call at two array loads and no
// walk. THE STATIC TEXT KIDS ARE SHARED WITH THE PROTOTYPE: nothing ever writes one, and a copy
// would allocate an object per static string per row. It RECURSES, where the browser clones a
// parsed prototype in one call — one allocation per element per instance, plus one per attribute
// record and one per listener. Not competitive with `cloneNode(true)` and not trying to be.
export function instantiateExoTermProto(
    proto: TExoTermProtoElement,
    slots: TExoTermElement[],
    regions: (TExoTermRegion | null)[]
): TExoTermElement {
    // Copied by hand rather than with `Object.assign`, which would hand back an intersection with
    // the prototype's `Readonly<…>` and cost a spread's worth of shape work per element.
    const attrs: Record<string, string> = Object.create(null) as Record<string, string>;
    const declared = proto.attrs;
    for (const name in declared) attrs[name] = declared[name];

    const node: TExoTermElement = {
        tag: proto.tag,
        attrs,
        text: proto.hasContent ? '' : null,
        kids: [],
        listeners: Object.create(null) as Record<string, TExoTermListener>,
    };

    const ports = proto.ports;
    for (let i = 0; i < ports.length; i++) slots[ports[i]] = node;

    const kids = proto.kids;
    for (let i = 0; i < kids.length; i++) {
        const kid = kids[i];
        if ('tag' in kid) {
            node.kids.push(instantiateExoTermProto(kid, slots, regions));
            continue;
        }
        if ('text' in kid) {
            node.kids.push(kid);
            continue;
        }
        const region: TExoTermRegion = { children: [] };
        regions[kid.port] = region;
        node.kids.push(region);
    }

    return node;
}
