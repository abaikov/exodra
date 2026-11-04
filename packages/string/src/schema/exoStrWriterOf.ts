import { EXO_STR_WRITERS } from '../writers/EXO_STR_WRITERS';
import type { TExoStrWriter } from '../writers/types/TExoStrWriter';
import type { TExoStrWriterDeclaration } from './types/TExoStrWriterDeclaration';

export function exoStrWriterOf(declared: TExoStrWriterDeclaration): TExoStrWriter {
    switch (declared.writer) {
        case 'attribute':
            return EXO_STR_WRITERS.attribute(declared.name, declared.tag);
        case 'stringAttr':
            return EXO_STR_WRITERS.stringAttr(declared.name);
        case 'toggleAttr':
            return EXO_STR_WRITERS.toggleAttr(declared.name);
        case 'text':
            return EXO_STR_WRITERS.text(declared.eatsLeadingNewline);
        case 'children':
            return EXO_STR_WRITERS.children(declared.ownsElement, declared.eatsLeadingNewline);
        case 'event':
            return EXO_STR_WRITERS.event();
        case 'ref':
            return EXO_STR_WRITERS.ref();
    }
}
