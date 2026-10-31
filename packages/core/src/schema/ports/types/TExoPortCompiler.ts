import type { TExoAttrPort } from './TExoAttrPort';
import type { TExoChildrenPort } from './TExoChildrenPort';
import type { TExoEventPort } from './TExoEventPort';
import type { TExoTextPort } from './TExoTextPort';
import type { TExoRefPort } from './TExoRefPort';

export interface TExoPortCompiler<TWriter> {
    attribute(port: TExoAttrPort): TWriter;
    text(port: TExoTextPort): TWriter;
    children(port: TExoChildrenPort): TWriter;
    event(port: TExoEventPort): TWriter;
    ref(port: TExoRefPort): TWriter;
}
