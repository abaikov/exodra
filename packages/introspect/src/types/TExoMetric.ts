export interface TExoMetric {
    name: string;
    value: number;
    unit: string;
    category: string;
    threshold?: {
        warning?: number;
        error?: number;
    };
}
