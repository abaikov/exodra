// The door a mounted app hands its round operation out through: the round's third step writes state
// that lives inside a component, and `flip` and `card-driver.ts` need that same function from
// outside. Filled by the app component while it renders; the mount refuses to proceed if it is
// still null. Why it is a slot and not a return value: `apps/solid.md`.
//
// A FILE OF ITS OWN BECAUSE TWO PARTICIPANTS SHARE IT. Declared inside either one, the other would
// either duplicate it or be charged for that participant's whole app by the line count.
export interface TSlot<T> {
    value: T | null;
}
