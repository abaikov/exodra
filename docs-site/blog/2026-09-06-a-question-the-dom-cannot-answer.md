---
slug: a-question-the-dom-cannot-answer
title: A Question the DOM Cannot Answer
authors: [andrei]
tags: [performance, benchmarks, design-decisions]
---

# A Question the DOM Cannot Answer

A renderer that fills ports has two ways to spell a write.

**Resolve on every write.** The port carries an index, the plan carries a table of setters and a
table of node slots, and each write walks both:

```js
setters[index](nodes[elem[index]], value)
```

**Resolve once and keep the answer.** Hand out a closure that has already done the lookups, so the
write is a call:

```js
const write = setters[index];
const at = nodes[elem[index]];
return (value) => { write(at, value); };
```

The second looks obviously better — the lookup's answer cannot change for the life of the
instance, so paying for it repeatedly looks like waste. That reasoning is why a renderer grows a
second write path in the first place.

We measured it on the DOM. The measurement refuses to answer, and **the refusal is the result**.

<!-- truncate -->

## What the DOM run says

Three arms, each with a separately declared null twin: the shipped door, a bound writer built
inside the participant, and a floor — a straight-line program with no abstraction producing
byte-identical output. Mount and update timed separately; the ladder varies writes per port.

| | ns per write | grains | own resolution | verdict |
| --- | --- | --- | --- | --- |
| door − bound, 1 write per port | +33.33 | 1 | 66.67 | not resolved |
| door − bound, 16 writes per port | +6.25 | 2 | 4.17 | not resolved |
| hand-out (mount) | +41.67 ns/instance | 1 | 83.33 | not resolved |
| **door − floor, 16 writes per port** | **+20.83** | **5** | **4.17** | **resolved** |

Fifteen null pairs out of fifteen came back inside their own noise, so the instrument was steady
while it ran. Four of the run's six predictions failed. The one that held is the one that matters:
**the subject does not resolve at any rung, and the arithmetic said so before the run started.**

Not because of noise. Because of the clock. A grain — the smallest difference the timer can
express — is 66.67 ns per write at the bottom rung and 4.17 ns at the top. The disputed quantity is
four or five L1 loads and one predictable branch. **Every median is a multiple of something larger
than the answer.**

And underneath that sits the reason no instrument fixes it: every write in this measurement crosses
into the browser's binding layer. The disputed term is a fraction of one percent of the write it
rides on. There is no round count, and no scene size, that makes half a nanosecond visible against
a crossing that costs hundreds.

## Where the same question is eight times sharper

The server backend writes into a string. Same door, same port table, same plan — one indirection
fewer, and no browser crossing. The suite has measured that ladder for a long time:

```
floor        0.0575        a straight-line program
+reset       0.1850
+set         0.2100        → +0.025 ms per render
+try         0.2075
+stack       0.2175        → +0.010 ms per render
exodra·flat  0.2275        → +0.170 ms over the floor
```

One render is 1000 rows of five ports, and 40 renders fill a timed region, so a grain is **0.5
nanoseconds per port write** — against the DOM's 4.17. Read off it:

- the shipped door costs **5 ns per port write** over the rung below it;
- the connector pool costs **10 ns per instance**;
- the whole library sits **34 ns per write** above a hand-written program.

Those are resolvable, and they were resolvable before we went looking on the DOM.

## The mistake worth publishing

The bound writer's saving *is* the removal of `nodes[elem[index]]` per write. The server backend has
no such indirection. So the reasoning went: the mechanism only exists on the DOM, therefore measure
on the DOM.

The logic is sound and the conclusion is wrong, and the shape of the error generalises:

> **If a mechanism exists only where the instrument is blind, it is not measurable — and that is the
> finding, not a reason to go and measure it badly.**

A resolution advantage does not survive moving a question to a backend where the mechanism is
absent; and a mechanism does not become measurable by moving to a backend where the instrument
cannot see. Both directions are traps and we walked into the second one.

## When the measurement refuses, performance is not the tiebreaker

The temptation, having got a refusal, is to read it as a verdict against the thing that failed to
show a saving. That is wrong, and it is worth saying because we nearly shipped it.

**Both sides are unresolved.** The saving did not clear its resolution at any rung — and neither
did the cost: the hand-out came in at +41.67 ns per instance against a resolution of 83.33, one
grain of the four required. A refusal is symmetric. It does not quietly favour the incumbent.

So the question falls to whoever it was always going to fall to, and it is not the profiler. A
bound writer is spelled `write(value)`. The resolving door is spelled `c.set(PORT, value)` — a port
to carry to the call site, and a connector that has to be alive to receive it. **When the machine
cannot tell two spellings apart, the one that is nicer to write wins**, and that is a real
argument rather than a consolation.

## What we did about it, and why

The bound writer we shipped is deleted — **for correctness, not for speed**, and the distinction
matters because it decides what may be built next.

Its hand-out stamped the port as filled. That one line made "asking is filling" a rule the
documentation had to carry; it left an empty attribute standing whenever a wire asked for a writer
and never used it; and a port filled through both doors moved the fill counter twice, which could
open the end-of-wire gate while something else was still unfilled. Three defects, in the
bookkeeping, none of them about the write.

A bound writer that does not stamp is a different thing, and nothing here argues against it. What
this run does say is that it may not be sold as an optimisation — the saving is not there to be
had. It would be a convenience, placed separately, with its cost stated: one closure per driven
port per instance, paid at the mount, buying a shorter call.

## What these numbers do not say

The 20.83 ns figure is one resolved gap in a run whose ordering component, at the low rung, is as
large as the effect it is quoting — so it belongs in the same sentence as its resolution, always.
The server figures come from a different backend with one fewer indirection and no browser
crossing: they price the door, not the DOM write.

And a bound writer that inlined its write — specialised per port kind at hand-out, with no call
inside — is a different feature from the one deleted. Nothing here measures it, and nothing here
asks for it.
