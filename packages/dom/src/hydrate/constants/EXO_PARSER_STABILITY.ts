import { assertExoParserStableChild, assertExoParserStableText } from '@exodra/core';
import type { TExoParserStability } from '../../dom/types/TExoParserStability';

/** One object for the process: `compileExoDomSchema` reads it off the backend once per schema. */
export const EXO_PARSER_STABILITY: TExoParserStability = {
    child: assertExoParserStableChild,
    text: assertExoParserStableText,
};
