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
    metasignal_correlation_weight: number // 0-1
    metasignal_profitability_weight: number // 0-1

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