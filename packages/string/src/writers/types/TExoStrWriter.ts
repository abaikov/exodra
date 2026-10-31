// What one port does to a value, decided once at compile time. AN ATTRIBUTE WRITER RETURNS THE
// WHOLE ATTRIBUTE, empty where the DOM backend removes it: `disabled=""` is a disabled control.
export type TExoStrWriter = (value: unknown) => string;
