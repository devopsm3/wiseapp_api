export enum PlatformName {
  X = "X",
  TELEGRAM = "TELEGRAM"
}

export enum SourcePrice {
  MONTHLY = "monthly",
  LIFETIME = "lifetime",
  FREE = "free"
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
  }
}