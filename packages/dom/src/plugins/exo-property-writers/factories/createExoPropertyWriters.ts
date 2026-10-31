import { EXO_SHIPPED_WRITERS } from '../../../backend/constants/EXO_SHIPPED_WRITERS';
import { writeExoProperty } from '../../../dom/writers/writeExoProperty';
import type { TExoAttrWrite } from '../../../dom/types/TExoAttrWrite';
import type { TExoWritersApi } from '../../../backend/types/TExoWritersApi';
import { takesOverExoProperty } from '../takesOverExoProperty';

// `@exodra/string` is NOT composed, so the server still prints ` series="[object Object]"` for a
// taken-over port: byte parity is given up knowingly. See `src/plugins/README.md`.
export function createExoPropertyWriters(
    // TEXT only. The attribute members reach `EXO_SHIPPED_WRITERS` by module import instead, because
    // two property packs falling through to each other is not a shape either was written to survive.
    next: TExoWritersApi = EXO_SHIPPED_WRITERS,
    // Called at COMPILE time and must be PURE in (name, proto): `attr` and `markupCarries` agree
    // only by both asking it.
    takesOver: (name: string, proto: Element) => boolean = takesOverExoProperty
): TExoWritersApi {
    return {
        name: '@exodra/dom/exo-property-writers',
        // ONE BODY FOR ALL THREE ATTRIBUTE KINDS, because a property assignment has no absence to
        // express and no value to coerce: `kind` travels on to the shipped writers when this pack
        // declines the port, and decides nothing when it takes it.
        attr: (name, proto, kind, at): TExoAttrWrite => {
            if (!takesOver(name, proto)) return EXO_SHIPPED_WRITERS.attr(name, proto, kind, at);
            // The author's spelling and not the markup's: a name reaches markup lowercased, while
            // the property keeps `chartData`.
            return { write: writeExoProperty, data: name };
        },
        markupCarries: (name, proto) => {
            if (name === null) return next.markupCarries(name, proto);
            if (takesOver(name, proto)) return false;
            return EXO_SHIPPED_WRITERS.markupCarries(name, proto);
        },
        text: (proto) => next.text(proto),
    };
}
