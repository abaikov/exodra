import type { TExoAttrPort } from '../ports/types/TExoAttrPort';
import type { TExoChildrenPort } from '../ports/types/TExoChildrenPort';
import type { TExoEventPort } from '../ports/types/TExoEventPort';
import type { TExoPortName } from '../ports/types/TExoPortName';
import type { TExoRefPort } from '../ports/types/TExoRefPort';
import type { TExoTextPort } from '../ports/types/TExoTextPort';

export interface TExoEmitter<TPorts = unknown> {
    el(
        tag: string,
        attrs?: Readonly<Record<string, unknown>> | null,
        fn?: (emitter: TExoEmitter<TPorts>) => void
    ): TExoEmitter<TPorts>;

    text(value: unknown): TExoEmitter<TPorts>;

    attrPort(port: TExoAttrPort, name: string): TExoAttrPort;
    attrPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;

    stringPort(port: TExoAttrPort, name: string): TExoAttrPort;
    stringPort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;

    togglePort(port: TExoAttrPort, name: string): TExoAttrPort;
    togglePort(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;

    eventPort(port: TExoEventPort, name: string): TExoEventPort;
    eventPort(name: string, portName?: TExoPortName<TPorts, TExoEventPort>): TExoEventPort;

    textPort(port: TExoTextPort): TExoTextPort;
    textPort(portName?: TExoPortName<TPorts, TExoTextPort>): TExoTextPort;

    childrenPort(port: TExoChildrenPort): TExoChildrenPort;
    childrenPort(portName?: TExoPortName<TPorts, TExoChildrenPort>): TExoChildrenPort;

    refPort(port: TExoRefPort): TExoRefPort;
    refPort(portName?: TExoPortName<TPorts, TExoRefPort>): TExoRefPort;

    port(name: string, portName?: TExoPortName<TPorts, TExoAttrPort>): TExoAttrPort;
}
