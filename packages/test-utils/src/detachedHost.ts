// It does NOT silence jsdom's "Not implemented: navigation" notice — jsdom gates that on
// `localName !== "a" && !isConnected`, so an anchor activates detached or not. See README.
export const detachedHost = (): HTMLElement => document.createElement('div');
