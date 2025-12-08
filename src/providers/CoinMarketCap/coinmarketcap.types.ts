export interface CoinMarketCapOHLC {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    pivot: number;
}

export interface PivotCalculationMeta {
    pivotData: CoinMarketCapOHLC[];
    signalSuccess: boolean | null; // null if not enough data yet
    maxPivot: number;
    maxPivotDate: Date | null;
    minPivot: number;
    minPivotDate: Date | null;
}

export interface PivotCalculationResult {
    priceAtStart: number;
    validDays: number;
    isComplete: boolean; // true if 21 days have passed
    theoreticalProfitAbsolute: number; // dollar amount profit
    theoreticalProfitPercent: number; // percentage profit
    bestPrice: number; // Best price reached (max for LONG, min for SHORT)
    meta: PivotCalculationMeta
}

//
export interface CoinMapResponse {
    data: Array<{
        id: number;
        name: string;
        symbol: string;
        slug: string;
    }>;
}

export interface CoinInfoResponse {
    data: {
        [key: string]: Array<{
            id: number;
            name: string;
            symbol: string;
            slug: string;
            logo: string;
            description: string;
            urls: {
                website: string[];
                twitter: string[];
                technical_doc: string[];
            };
        }>;
    };
}



