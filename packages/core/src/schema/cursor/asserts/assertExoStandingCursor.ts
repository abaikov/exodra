export function assertExoStandingCursor(standing: boolean, tag: string, declaredBy: string): void {
    if (standing) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: this cursor was handed to the callback for <${tag}>, and that ` +
              'callback has RETURNED' +
              ' — the cursor is ONE object that walks down into each element and back up ' +
              'again, so a reference kept past the callback it was handed to stands wherever ' +
              'the cursor is NOW, not where it was captured. The element or the port would be ' +
              'declared in some other element entirely, with no error anywhere. Declare ' +
              'everything inside the callback it belongs to, and call fork() where two ' +
              'positions are genuinely needed at once.'
            : `EXO0088 "${tag}"`
    );
}
