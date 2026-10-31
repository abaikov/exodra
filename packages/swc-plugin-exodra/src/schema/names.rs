//! EVERY IDENTIFIER THIS COMPILER WRITES INTO A FILE, resolved ONCE per file, and
//! what one file accumulates while it is compiled.
//!
//! The names are bare and short (`_b1`, `_s0`) because generated code is read by people
//! debugging their own component, and a uid-per-name output is unreadable. A name only
//! steps aside when the source file already binds something that starts with it — see
//! `pick_name`.

use std::collections::HashSet;

pub(crate) struct GeneratedNames {
    /// `_b` — a cursor parameter, suffixed by DEPTH so siblings share one name.
    pub(crate) cursor: String,
    /// `_s` — the module-scope const one schema lands in.
    pub(crate) schema: String,
    /// The local name of the imported schema factory.
    pub(crate) schema_factory: String,
}

/// A generated name keeps its short readable form unless the file could collide with
/// it, and grows an underscore until it cannot.
///
/// COLLISION IS CHECKED BY PREFIX, not by equality, because most of these names are
/// numbered: `_s` is only safe if nothing in the file is called `_s0` or `_s7` either,
/// and the numbers do not exist yet when the base has to be chosen.
pub(crate) fn pick_name(taken: &HashSet<String>, base: &str) -> String {
    let mut candidate = base.to_string();
    loop {
        if !taken.iter().any(|name| name.starts_with(&candidate)) {
            return candidate;
        }
        candidate.push('_');
    }
}

impl GeneratedNames {
    pub(crate) fn new(bound: &HashSet<String>, schema_import: &str) -> Self {
        let mut taken = bound.clone();
        let cursor = pick_name(&taken, "_b");
        taken.insert(cursor.clone());
        let schema = pick_name(&taken, "_s");
        taken.insert(schema.clone());
        let schema_factory = pick_name(&taken, schema_import);
        Self {
            cursor,
            schema,
            schema_factory,
        }
    }
}

#[derive(Default)]
pub(crate) struct FileState {
    /// How many schemas this file has hoisted so far.
    pub(crate) schemas: u32,
    /// Whether anything was compiled at all — no declaration, no import.
    pub(crate) compiled: bool,
}
