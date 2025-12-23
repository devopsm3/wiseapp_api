export interface GlobalSettings {
    // Sources Configuration
    source_monitoring_interval: number // minutes
    source_correlation_threshold: number // 0-1
    source_min_profitability: number // %
    source_suspension_days: number
    source_reactivation_threshold: number // %

    // Metasignals Configuration  
    metasignal_quorum_min: number // sources minimum
    metasignal_time_window: number // hours

    metasignal_filter_btc: boolean
    metasignal_filter_eth: boolean
    metasignal_filter_sol: boolean
    metasignal_filter_alts: boolean
    metasignal_filter_bullish: boolean
    metasignal_filter_bearish: boolean
    metasignal_filter_binance_only: boolean

    // Trading Configuration
    take_profit_percentage: number // %
    stop_loss_percentage: number // %
    max_position_size: number // % of portfolio
    reverse_signal_multiplier: number // multiplier for reverse signals
    trading_enabled: boolean
    auto_trading_enabled: boolean

    // System Configuration
    price_update_interval: number // minutes
    fear_greed_update_interval: number // minutes
    profitability_calculation_time: string // HH:MM format
    signal_expiry_hours: number
    id: number;
}

export interface SourceSetup {
  source_setup_filter_btc: boolean
  source_setup_filter_eth: boolean
  source_setup_filter_sol: boolean
  source_setup_filter_alts: boolean
  source_setup_filter_bullish: boolean
  source_setup_filter_bearish: boolean
  source_setup_filter_binance_only: boolean
}

export interface SourceSetupData {
  id: number
  source_image_url: string
  platform: string
  source_name: string
  is_verified: boolean
  source_id: string
  source_url: string
  setup: SourceSetup & { id: number; userSourceId: number } // includes extra IDs inside setup
}

export interface SourcesSetupsResponse {
  status: boolean
  data: SourceSetupData[]
}