export interface CfgiIndex {
  token: string;              // "BTC"
  nombre: string;             // "Bitcoin"
  image: string;              // URL
  date: string;               // "YYYY-MM-DD HH:mm:ss"
  price: string;              // comes as string from API
  ultimo: boolean;            // latest data flag

  cfgi: number;               // Fear & Greed index (0–100)

  data_price: number;
  data_volatility: number;
  data_volume: number;
  data_impulse: number;
  data_dominance: number;
  data_technical: number;
  data_trends: number;
  data_whales: number;
  data_social: number;
  data_orders: number;
}
