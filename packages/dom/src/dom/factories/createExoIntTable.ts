// Pushed, not `new Array(count).fill(value)`: V8 keeps a pushed array PACKED, a pre-sized one stays HOLEY.
export function createExoIntTable(count: number, value: number): number[] {
    const table: number[] = [];
    for (let i = 0; i < count; i++) table.push(value);
    return table;
}
