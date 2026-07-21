/**
 * Babel plugin that compiles JSX directly to optimized h() calls
 * Bypasses jsx-runtime completely for maximum performance
 */

module.exports = function (babel) {
    const { types: t } = babel;

    return {
        name: 'babel-plugin-jsx',
        visitor: {
            JSXElement(path) {
                const openingElement = path.node.openingElement;
                const tagName = getTagName(openingElement.name);
                
                // Handle Fragment
                if (tagName === 'Fragment' || tagName === null) {
                    const children = transformChildren(path.node.children, t);
                    path.replaceWith(children);
                    return;
                }
                
                // Collect props
                const props = collectProps(openingElement.attributes, t);
                const children = transformChildren(path.node.children, t);
                
                // Add children to props if present
                if (children) {
                    if (!props.constants) {
                        props.constants = t.objectExpression([]);
                    }
                    props.constants.properties.push(
                        t.objectProperty(t.identifier('children'), children)
                    );
                }
                
                // Generate h() call
                const hCall = generateHCall(tagName, props, t);
                path.replaceWith(hCall);
            },
            
            JSXFragment(path) {
                const children = transformChildren(path.node.children, t);
                path.replaceWith(children);
            }
        }
    };
    
    function getTagName(node) {
        if (t.isJSXIdentifier(node)) {
            // Check for Fragment
            if (node.name === 'Fragment') return null;
            // Lowercase = HTML element
            if (node.name[0] === node.name[0].toLowerCase()) {
                return t.stringLiteral(node.name);
            }
            // Uppercase = Component
            return t.identifier(node.name);
        }
        if (t.isJSXMemberExpression(node)) {
            // Handle Component.SubComponent
            return node;
        }
        return null;
    }
    
    function collectProps(attributes, t) {
        const props = {
            constants: null,
            bindables: null,
            bindableLists: null
        };
        
        const constants = [];
        
        for (const attr of attributes) {
            if (t.isJSXAttribute(attr)) {
                const name = attr.name.name;
                const value = attr.value;
                
                // Special Exodra props
                if (name === 'bindables' || name === 'bindableLists') {
                    if (t.isJSXExpressionContainer(value)) {
                        props[name] = value.expression;
                    }
                    continue;
                }
                
                // Regular props go to constants
                let propValue;
                if (value === null) {
                    // Boolean true attribute (e.g., <input disabled />)
                    propValue = t.booleanLiteral(true);
                } else if (t.isJSXExpressionContainer(value)) {
                    propValue = value.expression;
                } else if (t.isStringLiteral(value)) {
                    propValue = value;
                }
                
                if (propValue) {
                    constants.push(t.objectProperty(
                        t.identifier(name),
                        propValue
                    ));
                }
            } else if (t.isJSXSpreadAttribute(attr)) {
                // Handle {...props}
                // This is complex - for now, fall back to runtime
                return null;
            }
        }
        
        if (constants.length > 0) {
            props.constants = t.objectExpression(constants);
        }
        
        return props;
    }
    
    function transformChildren(children, t) {
        const transformed = [];
        
        for (const child of children) {
            if (t.isJSXText(child)) {
                const text = child.value.trim();
                if (text) {
                    transformed.push(t.stringLiteral(text));
                }
            } else if (t.isJSXExpressionContainer(child)) {
                if (!t.isJSXEmptyExpression(child.expression)) {
                    transformed.push(child.expression);
                }
            } else if (t.isJSXElement(child) || t.isJSXFragment(child)) {
                // These will be transformed by the visitor
                transformed.push(child);
            }
        }
        
        if (transformed.length === 0) {
            return null;
        }
        if (transformed.length === 1) {
            return transformed[0];
        }
        return t.arrayExpression(transformed);
    }
    
    function generateHCall(tagName, props, t) {
        const args = [tagName];
        
        // Build props object
        if (props.constants || props.bindables || props.bindableLists) {
            const propsObj = [];
            
            if (props.constants) {
                propsObj.push(t.objectProperty(
                    t.identifier('constants'),
                    props.constants
                ));
            }
            
            if (props.bindables) {
                propsObj.push(t.objectProperty(
                    t.identifier('bindables'),
                    props.bindables
                ));
            }
            
            if (props.bindableLists) {
                propsObj.push(t.objectProperty(
                    t.identifier('bindableLists'),
                    props.bindableLists
                ));
            }
            
            args.push(t.objectExpression(propsObj));
        } else {
            args.push(t.identifier('undefined'));
        }
        
        return t.callExpression(
            t.identifier('h'),
            args
        );
    }
};