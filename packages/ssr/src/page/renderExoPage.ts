import { exoContextFrame } from '@exodra/context';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrMachine } from '@exodra/string';
import { EXO_SSR_RESPONSE } from '../constants/EXO_SSR_RESPONSE';
import { ExoSsrResponse } from '../context/ExoSsrResponse';
import type { TExoSsrDocumentOptions } from '../types/TExoSsrDocumentOptions';
import type { TExoSsrPage } from '../types/TExoSsrPage';
import type { TExoSsrPageOptions } from '../types/TExoSsrPageOptions';
// Composed once: a backend built per request keys a fresh schema cache and recompiles every schema,
// markup parse included, on every request.
const EXO_UNCOMPOSED_STR_BACKEND = /*#__PURE__*/ new ExoStrBackend();

// The frame handed to `render` is the same `exoContextFrame` an exonode's `provide` makes — one
// level above the frame the root instance receives — so a page reads the request through the
// ordinary `c.inject(EXO_SSR_RESPONSE)`: no second rule.
export function renderExoPage(
    machine: TExoStrMachine,
    options: TExoSsrPageOptions = {}
): TExoSsrPage {
    const response = new ExoSsrResponse(options);

    const html = (options.backend ?? EXO_UNCOMPOSED_STR_BACKEND).render(
        machine,
        exoContextFrame(options.context ?? null, EXO_SSR_RESPONSE, response),
        options.params
    );
    response.setBody(html);

    return {
        html,
        status: response.getStatus(),
        headers: response.getHeaders(),
        head: response.renderHead(),
        stateScript: response.renderStateScript(),
        state: response.getStateSnapshot(),
        renderDocument: (documentOptions?: TExoSsrDocumentOptions) =>
            response.renderDocument(documentOptions),
    };
}
