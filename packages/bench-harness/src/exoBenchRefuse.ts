/** A REFUSAL: a gate that failed, a region under the clock's grain, or a verdict against adopting
 * whatever the table just ranked. It is printed rather than thrown so the rest of the run survives. */
export function exoBenchRefuse(text: string): void {
    console.log(`❌ ${text}`);
}
