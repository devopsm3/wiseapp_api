export interface SourceType {
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

export interface SourcePostAnalysis {
  type: "Signal" | "directSignal" | "conditionalSignal" | "Irrelevant";
  token: string,
  currency: string | null,
  direction: "LONG" | "SHORT" | null,
  entry_price: number | null,
  exit_price: number | null,
  target: number[] | null,
  // stop_loss: number | null,
  // leverage: number[] | null,
}