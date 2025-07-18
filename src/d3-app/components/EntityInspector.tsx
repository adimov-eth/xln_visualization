import React, { useMemo } from 'react';
import { EntityNode, Channel, NetworkNode, NodeType } from '../types/network.types';
import '../styles/EntityInspector.css';

interface EntityInspectorProps {
  entity: EntityNode;
  channels: Channel[];
  allNodes: NetworkNode[];
  onClose?: () => void;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({
  entity,
  channels,
  allNodes,
  onClose
}) => {
  // Calculate entity statistics
  const stats = useMemo(() => {
    const entityChannels = channels.filter(
      ch => ch.source === entity.id || ch.target === entity.id
    );
    
    const totalCapacity = entityChannels.reduce(
      (sum, ch) => sum + Number(ch.capacity), 0
    );
    
    const totalAvailable = entityChannels.reduce(
      (sum, ch) => sum + Number(ch.available), 0
    );
    
    const utilizationRate = totalCapacity > 0 
      ? ((totalCapacity - totalAvailable) / totalCapacity) * 100 
      : 0;
    
    const activeChannels = entityChannels.filter(ch => ch.isActive).length;
    
    return {
      totalChannels: entityChannels.length,
      activeChannels,
      totalCapacity,
      totalAvailable,
      utilizationRate
    };
  }, [entity, channels]);

  // Format large numbers
  const formatNumber = (num: number | bigint): string => {
    const value = Number(num);
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(0);
  };

  // Get health status color
  const getHealthColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'var(--accent-secondary)';
      case 'degraded': return 'var(--accent-warning)';
      case 'unhealthy': return 'var(--accent-danger)';
      default: return 'var(--text-tertiary)';
    }
  };

  // Get connected entities
  const connectedEntities = useMemo(() => {
    const entityChannels = channels.filter(
      ch => ch.source === entity.id || ch.target === entity.id
    );
    
    const connectedIds = new Set<string>();
    entityChannels.forEach(ch => {
      connectedIds.add(ch.source === entity.id ? ch.target : ch.source);
    });
    
    return allNodes.filter(node => connectedIds.has(node.id));
  }, [entity, channels, allNodes]);

  return (
    <div className="entity-inspector">
      <div className="inspector-header">
        <h2>Entity Deep Dive</h2>
        {onClose && (
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>

      <div className="inspector-content">
        {/* Basic Information */}
        <section className="inspector-section">
          <h3>Basic Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>{entity.name}</span>
            </div>
            <div className="info-item">
              <label>ID</label>
              <span className="monospace">{entity.id}</span>
            </div>
            <div className="info-item">
              <label>Consensus Type</label>
              <span className="consensus-type">{entity.consensusType.replace('_', ' ')}</span>
            </div>
            <div className="info-item">
              <label>Depositary</label>
              <span className="monospace">{entity.depositaryId}</span>
            </div>
          </div>
        </section>

        {/* Health Metrics */}
        <section className="inspector-section">
          <h3>Health Metrics</h3>
          <div className="health-status">
            <div 
              className="health-indicator"
              style={{ backgroundColor: getHealthColor(entity.health.status) }}
            />
            <span>{entity.health.status.toUpperCase()}</span>
          </div>
          <div className="metrics-grid">
            <div className="metric-item">
              <label>Uptime</label>
              <div className="metric-value">{entity.health.uptime.toFixed(1)}%</div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill"
                  style={{ width: `${entity.health.uptime}%` }}
                />
              </div>
            </div>
            <div className="metric-item">
              <label>Consensus Participation</label>
              <div className="metric-value">{entity.health.consensusParticipation.toFixed(1)}%</div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill"
                  style={{ width: `${entity.health.consensusParticipation}%` }}
                />
              </div>
            </div>
            <div className="metric-item">
              <label>Latency</label>
              <div className="metric-value">{entity.health.latency}ms</div>
            </div>
            <div className="metric-item">
              <label>Error Rate</label>
              <div className="metric-value">{entity.health.errorRate.toFixed(2)}%</div>
            </div>
          </div>
        </section>

        {/* Financial Metrics */}
        <section className="inspector-section">
          <h3>Financial Metrics</h3>
          <div className="financial-grid">
            <div className="financial-item">
              <label>Total Value Locked</label>
              <div className="financial-value">${formatNumber(entity.tvl)}</div>
            </div>
            <div className="financial-item">
              <label>Transaction Rate</label>
              <div className="financial-value">{entity.transactionRate} TPS</div>
            </div>
            <div className="financial-item">
              <label>Channel Utilization</label>
              <div className="financial-value">{stats.utilizationRate.toFixed(1)}%</div>
            </div>
          </div>
        </section>

        {/* Validators */}
        <section className="inspector-section">
          <h3>Validators ({entity.validators.length})</h3>
          <div className="validators-list">
            {entity.validators.map((validator, index) => (
              <div key={validator} className="validator-item">
                <span className="validator-index">#{index + 1}</span>
                <span className="validator-address">{validator}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Channel Overview */}
        <section className="inspector-section">
          <h3>Channel Overview</h3>
          <div className="channel-stats">
            <div className="stat-item">
              <label>Total Channels</label>
              <span>{stats.totalChannels}</span>
            </div>
            <div className="stat-item">
              <label>Active Channels</label>
              <span className="active">{stats.activeChannels}</span>
            </div>
            <div className="stat-item">
              <label>Total Capacity</label>
              <span>${formatNumber(stats.totalCapacity)}</span>
            </div>
            <div className="stat-item">
              <label>Available Liquidity</label>
              <span>${formatNumber(stats.totalAvailable)}</span>
            </div>
          </div>
        </section>

        {/* Connected Entities */}
        <section className="inspector-section">
          <h3>Connected Entities</h3>
          <div className="connected-entities">
            {connectedEntities.map(node => (
              <div key={node.id} className="connected-entity">
                <div 
                  className="entity-type-indicator"
                  style={{ 
                    backgroundColor: 
                      node.type === NodeType.ENTITY ? 'var(--node-entity)' :
                      node.type === NodeType.DEPOSITARY ? 'var(--node-depositary)' :
                      node.type === NodeType.ACCOUNT ? 'var(--node-account)' :
                      'var(--node-jurisdiction)'
                  }}
                />
                <span className="entity-name">{node.name}</span>
                <span className="entity-type">{node.type}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Governance Configuration */}
        <section className="inspector-section">
          <h3>Governance Configuration</h3>
          <div className="governance-config">
            <div className="config-item">
              <label>Consensus Type</label>
              <p>{entity.consensusType === 'proposer_based' 
                ? 'Proposer-Based Consensus (Fast finality, leader-based)'
                : 'Gossip-Based Consensus (Leaderless, high throughput)'
              }</p>
            </div>
            <div className="config-item">
              <label>Validator Count</label>
              <p>{entity.validators.length} validators maintaining consensus</p>
            </div>
            <div className="config-item">
              <label>Depositary Contract</label>
              <p className="monospace">{entity.depositaryId}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};