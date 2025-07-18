import React, { useMemo, useState, memo, useCallback } from 'react';
import { Channel, NetworkNode } from '../types/network.types';
import '../styles/ChannelInspector.css';

interface ChannelInspectorProps {
  channel: Channel;
  sourceNode: NetworkNode;
  targetNode: NetworkNode;
  onClose?: () => void;
}

interface PaymentHistory {
  id: string;
  amount: number;
  direction: 'sent' | 'received';
  timestamp: number;
  status: 'completed' | 'pending' | 'failed';
}

export const ChannelInspector: React.FC<ChannelInspectorProps> = memo(({
  channel,
  sourceNode,
  targetNode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'rebalance'>('overview');

  // Memoized tab handlers
  const handleOverviewTab = useCallback(() => setActiveTab('overview'), []);
  const handleHistoryTab = useCallback(() => setActiveTab('history'), []);
  const handleRebalanceTab = useCallback(() => setActiveTab('rebalance'), []);

  // Calculate channel metrics
  const metrics = useMemo(() => {
    const capacity = Number(channel.capacity);
    const available = Number(channel.available);
    const used = capacity - available;
    const utilizationRate = capacity > 0 ? (used / capacity) * 100 : 0;
    const creditLine = Number(channel.creditLine);
    const creditUtilization = creditLine > 0 ? (used / creditLine) * 100 : 0;

    return {
      capacity,
      available,
      used,
      utilizationRate,
      creditLine,
      creditUtilization
    };
  }, [channel]);

  // Generate mock payment history
  const paymentHistory = useMemo<PaymentHistory[]>(() => {
    const history: PaymentHistory[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 20; i++) {
      history.push({
        id: `payment-${i}`,
        amount: Math.floor(Math.random() * 10000) + 100,
        direction: Math.random() > 0.5 ? 'sent' : 'received',
        timestamp: now - (i * 3600000), // 1 hour intervals
        status: i === 0 && Math.random() > 0.8 ? 'pending' : 'completed'
      });
    }
    
    return history;
  }, []);

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(0);
  };

  // Format timestamp
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'var(--accent-secondary)';
      case 'pending': return 'var(--accent-warning)';
      case 'failed': return 'var(--accent-danger)';
      default: return 'var(--text-tertiary)';
    }
  };

  return (
    <div className="channel-inspector">
      <div className="inspector-header">
        <h2>Channel Inspector</h2>
        {onClose && (
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="channel-nodes">
        <div className="node-info">
          <span className="node-label">From</span>
          <span className="node-name">{sourceNode.name}</span>
        </div>
        <div className="channel-flow-indicator">
          <div className="flow-line" />
          <span className="flow-icon">⇄</span>
          <div className="flow-line" />
        </div>
        <div className="node-info">
          <span className="node-label">To</span>
          <span className="node-name">{targetNode.name}</span>
        </div>
      </div>

      <div className="inspector-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={handleOverviewTab}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={handleHistoryTab}
        >
          Payment History
        </button>
        <button 
          className={`tab ${activeTab === 'rebalance' ? 'active' : ''}`}
          onClick={handleRebalanceTab}
        >
          Rebalance
        </button>
      </div>

      <div className="inspector-content">
        {activeTab === 'overview' && (
          <>
            {/* Channel Status */}
            <section className="inspector-section">
              <h3>Channel Status</h3>
              <div className="status-indicator">
                <div className={`status-dot ${channel.isActive ? 'active' : 'inactive'}`} />
                <span>{channel.isActive ? 'Active' : 'Inactive'}</span>
                <span className="last-update">
                  Last update: {formatTime(channel.lastUpdate)}
                </span>
              </div>
            </section>

            {/* Capacity Visualization */}
            <section className="inspector-section">
              <h3>Capacity & Utilization</h3>
              <div className="capacity-visual">
                <div className="capacity-bar">
                  <div 
                    className="capacity-used"
                    style={{ width: `${metrics.utilizationRate}%` }}
                  />
                  <div className="capacity-labels">
                    <span>Used: ${formatNumber(metrics.used)}</span>
                    <span>Available: ${formatNumber(metrics.available)}</span>
                  </div>
                </div>
                <div className="capacity-stats">
                  <div className="stat">
                    <label>Total Capacity</label>
                    <span>${formatNumber(metrics.capacity)}</span>
                  </div>
                  <div className="stat">
                    <label>Utilization</label>
                    <span>{metrics.utilizationRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Credit Line */}
            <section className="inspector-section">
              <h3>Credit Line</h3>
              <div className="credit-visual">
                <div className="credit-bar">
                  <div 
                    className="credit-used"
                    style={{ width: `${metrics.creditUtilization}%` }}
                  />
                </div>
                <div className="credit-stats">
                  <div className="stat">
                    <label>Credit Limit</label>
                    <span>${formatNumber(metrics.creditLine)}</span>
                  </div>
                  <div className="stat">
                    <label>Credit Utilization</label>
                    <span>{metrics.creditUtilization.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Channel Details */}
            <section className="inspector-section">
              <h3>Channel Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Channel ID</label>
                  <span className="monospace">{channel.id}</span>
                </div>
                <div className="detail-item">
                  <label>Created</label>
                  <span>{new Date(channel.lastUpdate - 86400000 * 30).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Fee Rate</label>
                  <span>0.1%</span>
                </div>
                <div className="detail-item">
                  <label>Base Fee</label>
                  <span>1 sat</span>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'history' && (
          <section className="inspector-section">
            <h3>Recent Payments</h3>
            <div className="payment-history">
              {paymentHistory.map(payment => (
                <div key={payment.id} className="payment-item">
                  <div className="payment-direction">
                    <span className={`direction-icon ${payment.direction}`}>
                      {payment.direction === 'sent' ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="payment-details">
                    <span className="payment-amount">
                      ${formatNumber(payment.amount)}
                    </span>
                    <span className="payment-time">
                      {formatTime(payment.timestamp)}
                    </span>
                  </div>
                  <div 
                    className="payment-status"
                    style={{ color: getStatusColor(payment.status) }}
                  >
                    {payment.status}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'rebalance' && (
          <section className="inspector-section">
            <h3>Rebalancing Tools</h3>
            <div className="rebalance-tools">
              <div className="rebalance-info">
                <p>Current channel balance is {metrics.utilizationRate > 70 ? 'high' : metrics.utilizationRate < 30 ? 'low' : 'optimal'}.</p>
                {metrics.utilizationRate > 70 && (
                  <p className="warning">Consider rebalancing to improve liquidity.</p>
                )}
              </div>
              
              <div className="rebalance-options">
                <div className="option">
                  <h4>Auto-Rebalance</h4>
                  <p>Automatically maintain optimal channel balance</p>
                  <label className="toggle">
                    <input type="checkbox" />
                    <span className="toggle-slider" />
                  </label>
                </div>
                
                <div className="option">
                  <h4>Manual Rebalance</h4>
                  <p>Manually adjust channel balance</p>
                  <div className="manual-controls">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      defaultValue={metrics.utilizationRate}
                      className="balance-slider"
                    />
                    <button className="rebalance-btn">Rebalance Now</button>
                  </div>
                </div>
                
                <div className="option">
                  <h4>Rebalance Settings</h4>
                  <div className="settings-grid">
                    <div className="setting">
                      <label>Target Balance</label>
                      <input type="number" defaultValue="50" min="0" max="100" />
                      <span>%</span>
                    </div>
                    <div className="setting">
                      <label>Max Fee</label>
                      <input type="number" defaultValue="0.5" step="0.1" />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
});