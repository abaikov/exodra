import { describe, expect, it } from 'vitest';
import { exoDoubleEscapeArmedAt } from '../asserts/exoDoubleEscapeArmedAt';
import { createExoSchema } from '../../factories/createExoSchema';
import { withExoSchemaAsserts } from '../../cursor/withExoSchemaAsserts';

/**
 * THE STATE MACHINE IS CALLED DIRECTLY HERE, and it has to be. Three of its transitions cannot be
 * reached through `assertExoIntactRawTextBoundary` at all: any run that exercises `</script` plus a
 * terminator contains a whole closing sequence, and `closingSequenceAt` refuses it before the
 * machine runs. A transition that can only be checked by reading it is the situation this file's
 * subject spent three revisions calling "not verifiable", so `exoDoubleEscapeArmedAt` is exported for
 * this test — and only for it; `index.ts` does not re-export it.
 *
 * WHAT THE RETURNED NUMBER MEANS: the offset of the `<` of the `<script` that armed the state the
 * run ENDS in, or `-1` when the run does not end inside the double-escaped family. It is an offset
 * rather than a boolean because the message has to name the characters the author must break.
 */

/** See `check-misplaced-property-port.test.ts` for what this simulates and what it cannot. */
function underProduction<T>(fn: () => T): T {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
        return fn();
    } finally {
        if (before === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = before;
    }
}

/** The one shape every end-to-end case here uses: a `<script>` holding one static run. */
function script(...chunks: ReadonlyArray<string>): () => unknown {
    return () =>
        createExoSchema((b) => {
            b.el('script', null, (s) => {
                for (const chunk of chunks) s.text(chunk);
            });
            return {};
        }, withExoSchemaAsserts);
}

describe('exoDoubleEscapeArmedAt — script data → script data escaped, on `<!--`', () => {
    it('does NOT arm on `<script>` when no `<!--` precedes it', () => {
        // In SCRIPT DATA a `<` goes to script data less-than sign, where a letter is neither `!`
        // nor `/`: the characters are emitted and the tokenizer reconsumes in script data. The
        // double-escape start state is only reachable from ESCAPED, which is what `<!--` buys.
        expect(exoDoubleEscapeArmedAt('var t = "<script>";')).toBe(-1);
    });

    it('arms once `<!--` has moved it to escaped', () => {
        expect(exoDoubleEscapeArmedAt('<!--<script>')).toBe(4);
    });

    it('reconsumes `<` in script data, so `<<!--` still opens the comment on the second one', () => {
        // Script data less-than sign, "anything else": emit `<` and RECONSUME. A machine that
        // consumed the character instead would swallow the second `<` and never reach `!`.
        expect(exoDoubleEscapeArmedAt('<<!--<script>')).toBe(5);
    });

    it('needs all four characters of `<!--`', () => {
        expect(exoDoubleEscapeArmedAt('<!-<script>')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!<script>')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<-<script>')).toBe(-1);
    });
});

describe('exoDoubleEscapeArmedAt — escaped → DOUBLE escaped, on `<script` + a terminator', () => {
    for (const [name, terminator] of [
        ['>', '>'],
        ['space', ' '],
        ['solidus', '/'],
        ['tab', '\t'],
        ['LF', '\n'],
        ['FF', '\f'],
        ['CR', '\r'],
    ] as ReadonlyArray<readonly [string, string]>) {
        it(`arms on ${name}, the same list an end tag terminates on`, () => {
            expect(exoDoubleEscapeArmedAt(`<!--<script${terminator}`)).toBe(4);
        });
    }

    it('does NOT arm when the buffered name is not exactly `script`', () => {
        // Double escape start buffers ASCII alpha and compares the whole buffer on the terminator.
        // `scriptx` is not `script`, so it drops back to ESCAPED — where `</script>` still closes.
        expect(exoDoubleEscapeArmedAt('<!--<scriptx>')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!--<scrip>')).toBe(-1);
    });

    it('does NOT arm when the character after `<` is not ASCII alpha', () => {
        expect(exoDoubleEscapeArmedAt('<!--< script>')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!--<1script>')).toBe(-1);
    });

    it('is case-insensitive, because the tokenizer lowercases the buffered name', () => {
        expect(exoDoubleEscapeArmedAt('<!--<SCRIPT>')).toBe(4);
    });

    it('reports the offset of the LAST arming when a run arms, leaves and arms again', () => {
        // `-->` disarms; the second `<script>` arms again and is the one the author must break.
        expect(exoDoubleEscapeArmedAt('<!--<script>a--><!--<script>')).toBe(20);
    });
});

describe('exoDoubleEscapeArmedAt — DOUBLE escaped → escaped, on `</script` + a terminator', () => {
    it('leaves the family on a matching `</script>`, emitting NO end tag', () => {
        // The transition the whole file is about: in double escaped, `</script` + terminator is
        // the double escape END state, which walks back one level and emits nothing. Unreachable
        // through the cursor — `closingSequenceAt` refuses the run first — which is why this
        // drives the unit.
        expect(exoDoubleEscapeArmedAt('<!--<script>x</script>')).toBe(-1);
    });

    it('stays in the family when the buffered name is not `script`', () => {
        expect(exoDoubleEscapeArmedAt('<!--<script>x</scriptx>')).toBe(4);
    });

    it('stays in the family on `</script` with no terminator after it', () => {
        // `</script<` is characters in double escaped exactly as it is in script data. The run
        // still ends inside the family, so the element still never closes.
        expect(exoDoubleEscapeArmedAt('<!--<script>x</script<')).toBe(4);
    });

    it('needs the solidus: `<script` inside the family does not leave it', () => {
        expect(exoDoubleEscapeArmedAt('<!--<script>x<script>')).toBe(4);
    });
});

describe('exoDoubleEscapeArmedAt — escaped → script data, on `-->`', () => {
    it('returns to script data, where a later `<script>` cannot arm', () => {
        // The discriminating shape: if `-->` had left the tokenizer in ESCAPED, the second
        // `<script>` would arm. It does not, so the run ends in script data.
        expect(exoDoubleEscapeArmedAt('<!--x--><script>')).toBe(-1);
    });

    it('accepts `<!-->`, because `<!--` already lands in escaped DASH DASH', () => {
        expect(exoDoubleEscapeArmedAt('<!--><script>')).toBe(-1);
    });

    it('accepts `--->`, because the dash dash state stays on a further dash', () => {
        expect(exoDoubleEscapeArmedAt('<!---><script>')).toBe(-1);
    });

    it('does not close on `>` alone, nor on dashes broken by another character', () => {
        // Still ESCAPED at the `<script>`, so it arms — at offset 6 and 9 respectively, which is
        // where the `<` of that `<script` stands.
        expect(exoDoubleEscapeArmedAt('<!--x><script>')).toBe(6);
        expect(exoDoubleEscapeArmedAt('<!--x-a-><script>')).toBe(9);
    });
});

describe('exoDoubleEscapeArmedAt — DOUBLE escaped → script data, on `-->`', () => {
    it('goes all the way back to script data, not one level to escaped', () => {
        // The spec’s script data double escaped dash dash state sends `>` to SCRIPT DATA. If it
        // only went to escaped, the second `<script>` here would arm and this would be a false
        // refusal on a working program.
        expect(exoDoubleEscapeArmedAt('<!--<script>x--><script>')).toBe(-1);
    });

    it('disarms even with nothing after it', () => {
        expect(exoDoubleEscapeArmedAt('<!--<script>x-->')).toBe(-1);
    });

    it('does not disarm on `>` that is not preceded by two dashes', () => {
        expect(exoDoubleEscapeArmedAt('<!--<script>x>')).toBe(4);
        expect(exoDoubleEscapeArmedAt('<!--<script>--a>')).toBe(4);
    });
});

describe('exoDoubleEscapeArmedAt — which end states are a refusal', () => {
    for (const [name, run] of [
        ['double escaped', '<!--<script>x'],
        ['double escaped dash', '<!--<script>x-'],
        ['double escaped dash dash', '<!--<script>x--'],
        ['double escaped less-than sign', '<!--<script>x<'],
        ['double escape end', '<!--<script>x</scr'],
    ] as ReadonlyArray<readonly [string, string]>) {
        it(`refuses a run ending in ${name}`, () => {
            expect(exoDoubleEscapeArmedAt(run)).toBe(4);
        });
    }

    it('does NOT refuse a run ending in double escape START, which the end tag rescues', () => {
        // `<!--<script` has no terminator yet, and the next character is the `<` of the element's
        // own `</script>` — neither alpha nor a terminator, so double escape start takes its
        // "anything else" branch and reconsumes in ESCAPED, where `</script>` emits a real end
        // tag. Refusing this would refuse a program that renders correctly, which is the failure
        // mode this rule was held back for years to avoid.
        expect(exoDoubleEscapeArmedAt('<!--<script')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!--<scr')).toBe(-1);
    });

    it('does NOT refuse a run ending in the plain ESCAPED states', () => {
        // `<!--` alone arms nothing: in script data escaped, `</script>` still emits an end tag.
        expect(exoDoubleEscapeArmedAt('<!-- todo')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!-- todo -')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!-- todo --')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('<!-- todo <')).toBe(-1);
    });

    it('says nothing about an empty run or ordinary source', () => {
        expect(exoDoubleEscapeArmedAt('')).toBe(-1);
        expect(exoDoubleEscapeArmedAt('if (a < b && c > d) f();')).toBe(-1);
    });
});

describe('the dangerous shape is REFUSED — script data double escaped', () => {
    it('names the characters it found and where, not merely that it threw', () => {
        let message = '';
        try {
            script('var t = "<!--<script>";')();
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('<script>');
        expect(message).toContain('offset 13');
        expect(message).toContain('the run ENDS inside that state');
        expect(message).toContain('the static text inside <script>');
    });

    it('refuses it when the pair is SPLIT across two text() calls', () => {
        // The run is the unit here exactly as it is for the closing sequence: both compilers merge
        // adjacent static text before emitting it.
        expect(script('var t = "<!--<scr', 'ipt>";')).toThrow(/SCRIPT DATA DOUBLE ESCAPED/);
    });

    it('refuses a run that ends mid `</script` inside the family', () => {
        // No terminator after `</script`, so the whole-sequence rule does not fire; the state
        // machine does, because double escape end is still inside the family.
        expect(script('var t = "<!--<script>x</script')).toThrow(/SCRIPT DATA DOUBLE ESCAPED/);
    });

    it('drops the whole sentence in production and keeps it in dev', () => {
        const message = (): string => {
            try {
                script('var t = "<!--<script>";')();
            } catch (e) {
                return (e as Error).message;
            }
            return '';
        };
        const short = underProduction(message);
        const long = message();
        expect(short).toBe('EXO0011');
        expect(long.length).toBeGreaterThan(short.length);
        expect(long).toContain('SCRIPT DATA DOUBLE ESCAPED');
        expect(long).toContain('offset 13');
        expect(long).toContain('whole-page takeover');
        expect(long).not.toContain('EXO0011');
    });
});

describe('the rule is <script> only', () => {
    it('accepts `<!--<script>` inside a <style>, where the escape states do not exist', () => {
        // RAWTEXT has no escape states at all: these are eleven characters of CSS, and a
        // `</style>` after them closes the element exactly where it is written.
        const schema = createExoSchema((b) => {
            b.el('style', null, (s) => {
                s.text('.a { content: "<!--<script>" }');
            });
            return {};
        }, withExoSchemaAsserts);
        expect(schema.portList).toHaveLength(0);
    });

    it('accepts it inside <noscript> and <iframe> for the same reason', () => {
        for (const tag of ['noscript', 'iframe']) {
            const schema = createExoSchema((b) => {
                b.el(tag, null, (e) => {
                    e.text('<!--<script>');
                });
                return {};
            }, withExoSchemaAsserts);
            expect(schema.portList).toHaveLength(0);
        }
    });
});

describe('the working programs the older rules refused, and the one they still do', () => {
    it('accepts `</scriptable` split so the run ends on `</script`', () => {
        // AN END-OF-RUN BRANCH WOULD REFUSE THIS IN EVERY BUILD, at the FIRST call, before the
        // second one arrives to make it harmless. `a` is not a terminator, so `</scriptable` is
        // character data and the element closes where the compiler wrote it.
        const schema = createExoSchema((b) => {
            b.el('script', null, (s) => {
                s.text('var a = "</script');
                s.text('able";');
            });
            return {};
        }, withExoSchemaAsserts);
        expect(schema.portList).toHaveLength(0);
    });

    it('still refuses the same run once the NEXT chunk supplies a terminator', () => {
        // The merge is what makes this work: the second call re-asks the whole-sequence question
        // of the joined string, where `</script ` now has its space.
        expect(script('var a = "</script', ' x";')).toThrow(/closing sequence/);
    });

    it('STILL REFUSES the balanced double-escaped pair, and the older rule is why', () => {
        // NOT SMOOTHED OVER. `var t = "<!--<script>x</script>-->"` is a working program: the state
        // machine walks it back to script data and returns -1. It is refused anyway, by the
        // whole-sequence rule, which sees a genuine `</script>` — and what changed is that the
        // rule now knows the sequence stands in the double-escaped state and says so instead of
        // asserting the element ends there. The refusal is the same; the sentence is not.
        expect(exoDoubleEscapeArmedAt('var t = "<!--<script>x</script>-->";')).toBe(-1);
        expect(script('var t = "<!--<script>x</script>-->";')).toThrow(/closing sequence/);
    });

    it('says the sequence closes NOTHING there, because "ends the element" would be false', () => {
        // THE DEFECT ITS OWN AUTHOR NAMED, UNSMOOTHED: when both rules applied, the older message
        // won and its wording was false in the double-escaped case. A refusal that names a cause
        // is a refusal an author acts on — they would go and break a `</script>` that was never
        // closing anything — so the message now states which of the two cases this is.
        let message = '';
        try {
            script('var t = "<!--<script>x</script>-->";')();
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('closes NOTHING');
        expect(message).toContain('CONSERVATIVE refusal');
        expect(message).not.toContain('ends the element where it stands');
        // And the way out it offers is the one that is SAFE. Breaking the `<script` instead would
        // disarm the family and leave this same `</script>` in the merely escaped state, where it
        // really does end the element — a "fix" that turns a working run into an injection.
        expect(message).toContain("'<' + '/script>'");
    });

    it('still says the element ENDS here when the sequence stands in the escaped state', () => {
        // THE NEIGHBOUR THAT KEEPS THE SENTENCE HONEST. `<!--` alone arms nothing: from script
        // data ESCAPED, `</script` plus a terminator still emits an end tag, which is why the
        // thirty-year-old `<script><!-- … //--></script>` closes exactly where it is written. The
        // accurate message is the one that is printed, and it is printed only where it is accurate.
        let message = '';
        try {
            script('var a = "<!-- x </script> -->";')();
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('ends the element where it stands');
        expect(message).not.toContain('closes NOTHING');
    });
});

describe('when both rules apply, the one that is TRUE answers', () => {
    it('gives the state rule the run that ends armed, though a sequence stands in the middle', () => {
        // BOTH RULES FIRE ON THIS RUN AND THEY DISAGREE ABOUT WHAT IT IS. The `</script>` in the
        // middle walks one level out of the family and closes nothing; the second `<script>` arms
        // it again, so the run ENDS double-escaped and the element's own end tag emits no end tag
        // at all — every byte after it is script source. Answering with the sequence in the middle
        // would name a non-event and hide a whole-page takeover, so the state rule speaks.
        const run = 'var t = "<!--<script>a</script>b<script>c";';
        expect(exoDoubleEscapeArmedAt(run)).toBeGreaterThanOrEqual(0);
        expect(script(run)).toThrow(/SCRIPT DATA DOUBLE ESCAPED/);
    });
});

describe('<plaintext>, the one tag on the list that nothing closes', () => {
    /** The same one-static shape as `script()`, for the tag whose end tag is not an end tag. */
    function plaintext(text: string): () => unknown {
        return () =>
            createExoSchema((b) => {
                b.el('plaintext', null, (p) => {
                    p.text(text);
                });
                return {};
            }, withExoSchemaAsserts);
    }

    it('is not refused with the reason that is false for it', () => {
        // OVER-REFUSED AND PRE-EXISTING: `</plaintext>` closes nothing — the tokenizer's PLAINTEXT
        // state has no way out and the element runs to the end of the file — so the general
        // sentence, "this text ends the element where it stands", named a cause that does not
        // exist. It is still refused, because the string is the one place an author states in the
        // program that they expect the element to close; the sentence is the true one now.
        let message = '';
        try {
            plaintext('</plaintext>')();
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('NOTHING closes a <plaintext>');
        expect(message).toContain('END OF THE FILE');
        expect(message).toContain('offset 0');
        expect(message).not.toContain('ends the element where it stands');
    });

    it('leaves the other seven tags on the ordinary sentence', () => {
        // The special case is one tag and not the obsolete pair: `</xmp>` closes an `<xmp>` exactly
        // as `</style>` closes a `<style>`, so nothing about that message changes.
        let message = '';
        try {
            createExoSchema((b) => {
                b.el('xmp', null, (x) => {
                    x.text('</xmp>');
                });
                return {};
            }, withExoSchemaAsserts);
        } catch (e) {
            message = (e as Error).message;
        }
        expect(message).toContain('ends the element where it stands');
        expect(message).not.toContain('END OF THE FILE');
    });

    it('ships: production gets the code for this refusal and dev gets its own sentence', () => {
        let short = '';
        underProduction(() => {
            try {
                plaintext('</plaintext>')();
            } catch (e) {
                short = (e as Error).message;
            }
        });
        let long = '';
        try {
            plaintext('</plaintext>')();
        } catch (e) {
            long = (e as Error).message;
        }
        expect(short).toBe('EXO0008');
        expect(long).toContain('<plaintext>');
        expect(long).toContain('NOTHING closes a <plaintext>');
        expect(long).toContain('Use <pre>');
        expect(long).not.toContain('EXO0008');
    });
});
