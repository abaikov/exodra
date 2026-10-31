import { isAbsoluteUrl } from '../path/isAbsoluteUrl';

// A ROUTER MAY ONLY INTERCEPT A PLAIN LEFT CLICK ON AN INTERNAL DESTINATION — every other case here
// is something the user meant, and swallowing it is a bug they cannot work around. The origin test
// is the only one that asks the environment, and answers "external" outside a browser.
export function shouldIgnoreExoLinkClick(
    event: MouseEvent,
    // The RESOLVED href, not the `to` as written — that is what the origin test is about.
    href: string,
    target?: string,
    download?: unknown
): boolean {
    return (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.altKey ||
        event.ctrlKey ||
        event.shiftKey ||
        download !== undefined ||
        (Boolean(target) && target !== '_self') ||
        isExternalUrl(href)
    );
}

function isExternalUrl(url: string): boolean {
    if (!isAbsoluteUrl(url)) {
        return false;
    }

    const browserWindow = globalThis.window;
    if (!browserWindow) {
        return true;
    }

    try {
        return new URL(url, browserWindow.location.href).origin !== browserWindow.location.origin;
    } catch {
        return true;
    }
}
