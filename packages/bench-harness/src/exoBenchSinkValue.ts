// Consumed by every driver and printed at the end, so no accumulator can be optimised away.
import { EXO_BENCH_SINK } from './constants/EXO_BENCH_SINK';

export function exoBenchSinkValue(): number {
    return EXO_BENCH_SINK.total;
}
