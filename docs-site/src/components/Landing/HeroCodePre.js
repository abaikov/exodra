import { Highlight, themes } from 'prism-react-renderer';

export default function HeroCodePre({ children }) {
    const code = String(children.props.children).replace(/\n$/, '');
    const language = (children.props.className ?? '').replace('language-', '') || 'tsx';
    return (
        <Highlight code={code} language={language} theme={themes.dracula}>
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre className={className} style={{ ...style, background: 'transparent' }}>
                    {tokens.map((line, lineAt) => (
                        <div key={lineAt} {...getLineProps({ line })}>
                            {line.map((token, tokenAt) => (
                                <span key={tokenAt} {...getTokenProps({ token })} />
                            ))}
                        </div>
                    ))}
                </pre>
            )}
        </Highlight>
    );
}
