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



// CoinMarketCap Content

interface Asset {
  id: number;
  name: string;
  symbol: string;
  slug: string;
}

interface Owner {
  nickname: string;
  avatar_url: string;
}

interface Currency {
  id: number;
  symbol: string;
  slug: string;
}


// Latest Articles type
export interface LatestArticle {
  assets: Asset[];
  cover: string;
  created_at: string;
  language: string;
  news_type: string;
  released_at: string;
  source_name: string;
  source_url: string;
  subtitle: string;
  title: string;
  type: string;
}

// Top Posts / Latest Posts type
export interface Post {
  comment_count: string;
  comments_url: string;
  currencies: Currency[];
  language_code: string;
  like_count: string;
  owner: Owner;
  photos: string[];
  post_id: string;
  post_time: string;
  text_content: string;
}
