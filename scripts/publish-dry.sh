#!/bin/bash

# Dry run for Exodra publishing - shows what would be published

set -e

echo "🧪 Dry run - Exodra NPM publishing check"
echo "==========================================="

# Check if logged in to NPM
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You're not logged in to NPM"
    echo "Run: npm login"
    exit 1
fi

# Packages to check (dependency order)
PACKAGES=(
    "packages/core"
    "packages/reactivity-types"
    "packages/reactivity"
    "packages/string"
    "packages/dom"
    "packages/ssr"
    "packages/router"
    "packages/jsx"
    "packages/forms"
    "packages/babel-plugin-jsx"
    "packages/vite-plugin-exodra"
    "packages/profiler"
    "packages/react"
    "packages/introspect"
    "packages/create-exodra"
)

echo "📋 Packages to publish:"
echo ""

for package in "${PACKAGES[@]}"; do
    if [[ -f "$package/package.json" ]]; then
        cd "$package"
        
        PACKAGE_NAME=$(node -p "require('./package.json').name")
        PACKAGE_VERSION=$(node -p "require('./package.json').version")
        
        # Check if this version already exists
        if npm view "$PACKAGE_NAME@$PACKAGE_VERSION" > /dev/null 2>&1; then
            echo "  ⚠️  $PACKAGE_NAME@$PACKAGE_VERSION - Already published"
        else
            echo "  ✅ $PACKAGE_NAME@$PACKAGE_VERSION - Ready to publish"
        fi
        
        cd - > /dev/null
    else
        echo "  ❌ $package - No package.json found"
    fi
done

echo ""
echo "📦 Build check:"

# Check if built files exist
for package in "${PACKAGES[@]}"; do
    if [[ -f "$package/package.json" ]]; then
        PACKAGE_NAME=$(cd "$package" && node -p "require('./package.json').name")
        
        # Check for dist directory or built files
        if [[ -d "$package/dist" ]] || [[ -f "$package/index.js" ]]; then
            echo "  ✅ $PACKAGE_NAME - Built"
        else
            echo "  ⚠️  $PACKAGE_NAME - Not built (run npm run build:all)"
        fi
    fi
done

echo ""
echo "🔐 NPM Organization check:"

# Check @exodra organization
ORG_CHECK=$(npm org ls @exodra 2>/dev/null || echo "not-found")
if [[ "$ORG_CHECK" == "not-found" ]]; then
    echo "  ❌ @exodra organization not found on NPM"
    echo "     Create it: https://www.npmjs.com/org/create"
else
    echo "  ✅ @exodra organization exists"
fi

echo ""
echo "🚀 To actually publish, run:"
echo "   npm run publish:all"