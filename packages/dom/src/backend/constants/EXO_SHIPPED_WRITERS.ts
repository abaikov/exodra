import { createExoAttrWrite } from '../../dom/factories/createExoAttrWrite';
import { markupCarriesExoValue } from '../../dom/markupCarriesExoValue';
import { setExoText } from '../../dom/setExoText';
import type { TExoWritersApi } from '../types/TExoWritersApi';

// `markupCarries` is not "the setter writes the attribute" under another name: the two disagree
// about `checked` on an `<input>`, where the fill goes through the property and a parsed
// ` checked=""` still ticks the box. What `text` is for: ../README.md § Writers as a plugin.
export const EXO_SHIPPED_WRITERS: TExoWritersApi = {
    name: '@exodra/dom',
    attr: createExoAttrWrite,
    markupCarries: markupCarriesExoValue,
    text: () => setExoText,
};
