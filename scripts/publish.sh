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

for package in "${PACKAGES[@]}"; do
    echo "📤 Publishing $package..."
    
    cd "$package"
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        echo "⚠️  Skipping $package - no package.json found"
        cd - > /dev/null
        continue
    fi
    
    # Get package name and version
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    
    echo "Publishing $PACKAGE_NAME@$PACKAGE_VERSION"
    
    # Check if this version already published
    if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" > /dev/null 2>&1; then
        echo "⚠️  $PACKAGE_NAME@$PACKAGE_VERSION already published, skipping"
    else
        # Publish with public access for scoped packages
        npm publish --access public
        echo "✅ Published $PACKAGE_NAME@$PACKAGE_VERSION"
    fi
    
    cd - > /dev/null
    echo ""
done

echo "🎉 All packages published successfully!"
echo ""
echo "📋 Published packages:"
for package in "${PACKAGES[@]}"; do
    if [[ -f "$package/package.json" ]]; then
        PACKAGE_NAME=$(cd "$package" && node -p "require('./package.json').name")
        PACKAGE_VERSION=$(cd "$package" && node -p "require('./package.json').version") 
        echo "  ✅ $PACKAGE_NAME@$PACKAGE_VERSION"
    fi
done

echo ""
echo "🔗 NPM Links:"
for package in "${PACKAGES[@]}"; do
    if [[ -f "$package/package.json" ]]; then
        PACKAGE_NAME=$(cd "$package" && node -p "require('./package.json').name")
        echo "  https://www.npmjs.com/package/$PACKAGE_NAME"
    fi
done