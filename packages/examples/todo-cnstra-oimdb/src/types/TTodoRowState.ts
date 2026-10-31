export type TTodoRowState = {
    id: string | null;
    title: string | null;
    done: boolean | null;
    editing: boolean;
    className: string | undefined;
};
