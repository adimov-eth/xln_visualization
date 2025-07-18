import React, { memo } from 'react';
import { NetworkMetrics } from '../types/network.types';
import { formatNumber } from '../utils/visualization';
import './MetricsPanel.css';

interface MetricsPanelProps {
  metrics: NetworkMetrics;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}

const MetricCard: React.FC<MetricCardProps> = memo(({ 
  label, 
  value, 
  unit, 
  trend,
  color = 'primary' 
}) => {
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && <span className="metric-unit">{unit}</span>}
        {trend && (
          <span className={`metric-trend metric-trend--${trend}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
    </div>
  );
});

export const MetricsPanel: React.FC<MetricsPanelProps> = memo(({ metrics }) => {
  const healthColor = metrics.networkHealth >= 90 ? 'success' : 
                     metrics.networkHealth >= 70 ? 'warning' : 'danger';
  
  const channelUtilization = metrics.totalChannels > 0 
    ? ((metrics.activeChannels / metrics.totalChannels) * 100).toFixed(1)
    : '0';

  return (
    <div className="metrics-panel">
      <h2 className="metrics-title">Network Metrics</h2>
      
      <div className="metrics-grid">
        <MetricCard 
          label="Total Value Locked"
          value={formatNumber(metrics.totalTvl)}
          unit="ETH"
          color="primary"
        />
        
        <MetricCard 
          label="Network Health"
          value={metrics.networkHealth}
          unit="%"
          color={healthColor}
          trend={metrics.networkHealth >= 90 ? 'up' : 'down'}
        />
        
        <MetricCard 
          label="Active Entities"
          value={metrics.totalEntities}
          color="primary"
        />
        
        <MetricCard 
          label="Total Channels"
          value={`${metrics.activeChannels}/${metrics.totalChannels}`}
          color={metrics.activeChannels === metrics.totalChannels ? 'success' : 'warning'}
        />
        
        <MetricCard 
          label="24h Volume"
          value={formatNumber(metrics.transactionVolume24h)}
          unit="ETH"
          trend="up"
        />
        
        <MetricCard 
          label="Avg TPS"
          value={metrics.averageTps.toFixed(1)}
          unit="tx/s"
        />
        
        <MetricCard 
          label="Total Accounts"
          value={metrics.totalAccounts}
        />
        
        <MetricCard 
          label="Channel Utilization"
          value={channelUtilization}
          unit="%"
          color={Number(channelUtilization) > 80 ? 'success' : 'primary'}
        />
      </div>
      
      <div className="metrics-footer">
        <div className="update-indicator">
          <span className="update-dot"></span>
          Live Updates
        </div>
      </div>
    </div>
  );
});