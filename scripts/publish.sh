#!/bin/bash

# Exodra Publishing Script
# Publishes all packages to NPM

set -e

echo "🚀 Publishing Exodra packages to NPM..."

# Provenance is set by the release workflow via NPM_CONFIG_PROVENANCE, which npm
# reads directly. It is rejected outside a supported CI, so it stays unset locally.
if [[ -n "${NPM_CONFIG_PROVENANCE:-}" ]]; then
    echo "🔏 Provenance attestation: ON"
fi

# Check if logged in to NPM
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You're not logged in to NPM"
    echo "Run: npm login"
    exit 1
fi

# Org visibility is a first-run convenience check, not a safety gate: a granular
# automation token (what CI uses) legitimately has publish rights WITHOUT org-read,
# so a hard failure here would block every CI release. Warn and continue — a real
# permissions problem still surfaces on the publish itself.
ORG_CHECK=$(npm org ls @exodra 2>/dev/null || echo "not-found")
if [[ "$ORG_CHECK" == "not-found" ]]; then
    echo "⚠️  Could not read the @exodra org (expected with a granular token)."
    echo "    Continuing — publish will fail loudly if the rights are actually missing."
fi

# Build all packages
echo "📦 Building packages..."
npm run build:all

# Dependencies first, worked out from the manifests. A hand-kept list drifts —
# this one held a package directory that had been renamed away months earlier,
# and was missing a package that had been added.
IFS=$'\n' read -r -d '' -a PACKAGES < <(node scripts/publish-order.mjs && printf '\0')

if [ ${#PACKAGES[@]} -eq 0 ]; then
    echo "❌ publish order came back empty — refusing to publish nothing."
    exit 1
fi

# Guard: whatever a package promises to ship has to actually be on disk. Without
# this a package whose build was skipped publishes an empty tarball, and the
# breakage lands on whoever installs it rather than on us.
for package in "${PACKAGES[@]}"; do
    while IFS= read -r entry; do
        [ -z "$entry" ] && continue
        # A files entry may be a glob; only plain paths are checked, which is
        # what every package here uses.
        case "$entry" in *"*"*) continue ;; esac
        if [ ! -e "$package/$entry" ]; then
            echo "❌ publish guard: $package promises '$entry' in package.json files, but it is not there. Build it first."
            exit 1
        fi
    done < <(node -p "(require('./$package/package.json').files || []).join('\n')")
done

# WHAT ACTUALLY WENT UP, and what did not. These two lists are the report at the end, and the
# reason they exist is that this script used to print "🎉 All packages published successfully!"
# and exit 0 after publishing NOTHING AT ALL: every package whose version was already on the
# registry was skipped with a warning nobody reads in a CI log, and a release that shipped zero
# bytes was indistinguishable from one that shipped everything.
PUBLISHED=()
SKIPPED=()

for package in "${PACKAGES[@]}"; do
    echo "📤 Publishing $package..."

    cd "$package"

    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        echo "⚠️  Skipping $package - no package.json found"
        SKIPPED+=("$package (no package.json)")
        cd - > /dev/null
        continue
    fi

    # Get package name and version
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")

    echo "Publishing $PACKAGE_NAME@$PACKAGE_VERSION"

    # Check if this version already published.
    #
    # A SKIP IS NOT A FAILURE and must not become one: a package nobody touched this cycle
    # legitimately keeps its version, and refusing to release because one of nineteen packages
    # is unchanged would make every partial release impossible. What it must not be either is
    # SILENT — so it is recorded, named at the end, and the run fails if it turns out that
    # EVERY package took this branch (see the summary below).
    if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" > /dev/null 2>&1; then
        echo "⏭️  SKIPPED — $PACKAGE_NAME@$PACKAGE_VERSION is already on the registry."
        echo "    Nothing was published for this package. Bump its version to ship a change."
        SKIPPED+=("$PACKAGE_NAME@$PACKAGE_VERSION")
    else
        # Publish with public access for scoped packages
        npm publish --access public
        echo "✅ Published $PACKAGE_NAME@$PACKAGE_VERSION"
        PUBLISHED+=("$PACKAGE_NAME@$PACKAGE_VERSION")
    fi

    cd - > /dev/null
    echo ""
done

echo "════════════════════════════════════════════════════════════"
echo "📋 Release summary: ${#PUBLISHED[@]} published, ${#SKIPPED[@]} skipped"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ ${#PUBLISHED[@]} -gt 0 ]; then
    echo "✅ PUBLISHED (${#PUBLISHED[@]}):"
    for entry in "${PUBLISHED[@]}"; do
        echo "  ✅ $entry"
    done
    echo ""
fi

if [ ${#SKIPPED[@]} -gt 0 ]; then
    echo "⏭️  SKIPPED — already on the registry, nothing shipped (${#SKIPPED[@]}):"
    for entry in "${SKIPPED[@]}"; do
        echo "  ⏭️  $entry"
    done
    echo ""
fi

# THE RELEASE THAT SHIPPED NOTHING. Every package was already published, which means this run
# changed nothing on the registry — and the only way that is not a mistake is if somebody
# deliberately re-ran a finished release. Either way it is not a success, and reporting it as
# one is how a version bump that never got committed reaches production as "released".
if [ ${#PUBLISHED[@]} -eq 0 ]; then
    echo "❌ NOTHING WAS PUBLISHED. All ${#SKIPPED[@]} packages were already on the registry."
    echo "   Either the versions were never bumped (run: npm run version:apply), or this"
    echo "   release has already been shipped. Failing rather than reporting success."
    exit 1
fi

echo "🎉 Release complete: ${#PUBLISHED[@]} package(s) published."
echo ""
echo "🔗 NPM Links:"
for entry in "${PUBLISHED[@]}"; do
    echo "  https://www.npmjs.com/package/${entry%@*}"
done