import { Signal } from "@prisma/client"

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
  alignment_posts_for_meta_signals: number,
  timeframe_for_meta_signals: number,
}


export interface OHLC {
    time: Date;
    open: number;
    high: number;
    low: number;
    close: number;
}