import type { ExoNodeDom } from '../ExoNodeDom';

export type TExoDomMountResult = {
    node: ExoNodeDom;
    element: Element | Text;
    dispose(): void;
};
