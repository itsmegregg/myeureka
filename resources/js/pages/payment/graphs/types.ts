export interface MergedPaymentData {
    date: string;
    concept: string;
    branch: string;
    cash: number;
    gcash: number;
    card: number;
    other: number; // For other payment types not explicitly listed
    total: number;
    [key: string]: string | number; // Allow for dynamic payment methods
}
