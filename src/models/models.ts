import { Signal } from "@prisma/client"

export enum PlatformName {
  X = "X",
  TELEGRAM = "TELEGRAM",
}

export enum SourcePrice {
  MONTHLY = "monthly",
  LIFETIME = "lifetime",
  FREE = "free",
}

export interface ChannelInfo {
  platform_logo: string;
  platform_user_picture: string;
  user_name_source: string;
  user_username_source: string;
  user_id_source: string;
  user_verified: boolean;
  user_creation_date: number;
  followers_count: number;
  metadata: {
    title?: string;
    username?: string;
    broadcast?: boolean;
    megagroup?: boolean;
    [key: string]: any;
  };
}

// export interface SourcePostAnalysis {
//   type: "Signal" | "directSignal" | "conditionalSignal" | "Irrelevant";
//   token: string;
//   condition: string;
//   direction: "bullish" | "bearish";
//   target: number;
//   unit: string;
//   timeframe: "Swing" | "Intraday" | "Scalping";
// }
export interface SourcePostAnalysis {
  type: "Signal" | "directSignal" | "conditionalSignal" | "Irrelevant";
  token: string,
  currency: string | null,
  direction: "bullish" | "bearish" | null,
  entry_price: number | null,
  exit_price: number | null,
  target: number[] | null,
  stop_loss: number | null,
  leverage: number[] | null,
}


export type signalFront = Partial<Signal> & {
  currency_logo: string;
  pnlAbsolute: number | null;
  pnlPercent: number | null;
  timeFromNow: string;
  readableDate: string;
};

export interface MetaSignalSetup {
  BTC: boolean,
  ETH: boolean,
  SOL: boolean,
  ALTS: boolean,
  LONG: boolean,
  SHORT: boolean,
}
