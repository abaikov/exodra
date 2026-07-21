import { ExoNodeSsr } from '@exodra/ssr';
import { App } from './app';

// ExoNodeSsr renders the body and can carry serializable state in an embedded
// <script id="__EXODRA_STATE__"> for the client to read on hydration.
export function render() {
    const ssr = new ExoNodeSsr(App());
    return { appHtml: ssr.renderBody(), stateScript: ssr.renderStateScript() };
}
