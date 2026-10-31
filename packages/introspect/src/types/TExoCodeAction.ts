import type { TExoTextEdit } from './TExoTextEdit.js';

export interface TExoCodeAction {
    title: string;
    description: string;
    edit: TExoTextEdit;
}
