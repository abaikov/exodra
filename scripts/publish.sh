#!/bin/bash

# Exodra Publishing Script
# Publishes all packages to NPM

set -e

echo "🚀 Publishing Exodra packages to NPM..."

# Check if logged in to NPM
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You're not logged in to NPM"
    echo "Run: npm login"
    exit 1
fi

# Check if @exodra organization exists
ORG_CHECK=$(npm org ls @exodra 2>/dev/null || echo "not-found")
if [[ "$ORG_CHECK" == "not-found" ]]; then
    echo "❌ @exodra organization not found on NPM"
    echo "Create it first: https://www.npmjs.com/org/create"
    echo "Or update package.json to use different scope"
    exit 1
fi

# Build all packages
echo "📦 Building packages..."
npm run build:all

# Packages to publish in dependency order (dependencies first)
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