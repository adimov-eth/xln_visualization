import React, { memo, useCallback, useMemo } from 'react';
import { NetworkLayer } from '../types/network.types';
import './LayerControls.css';

interface LayerControlsProps {
  visibleLayers: Set<NetworkLayer>;
  onLayerToggle: (layer: NetworkLayer) => void;
}

interface LayerInfo {
  layer: NetworkLayer;
  label: string;
  icon: string;
  description: string;
}

const layers: LayerInfo[] = [
  {
    layer: NetworkLayer.JURISDICTION,
    label: 'Jurisdictions',
    icon: '⚖️',
    description: 'Legal frameworks & dispute resolution'
  },
  {
    layer: NetworkLayer.DEPOSITARY,
    label: 'Depositaries',
    icon: '🏦',
    description: 'On-chain contracts & reserves'
  },
  {
    layer: NetworkLayer.ENTITY,
    label: 'Entities',
    icon: '🔷',
    description: 'Sovereign state machines'
  },
  {
    layer: NetworkLayer.CHANNEL,
    label: 'Channels',
    icon: '🔗',
    description: 'Payment channels & credit lines'
  },
  {
    layer: NetworkLayer.TRANSACTION,
    label: 'Transactions',
    icon: '💸',
    description: 'Live payment flows'
  }
];

export const LayerControls: React.FC<LayerControlsProps> = memo(({
  visibleLayers,
  onLayerToggle
}) => {
  // Memoized handlers to prevent recreation
  const handleShowAll = useCallback(() => {
    layers.forEach(({ layer }) => {
      if (!visibleLayers.has(layer) && layer !== NetworkLayer.TRANSACTION) {
        onLayerToggle(layer);
      }
    });
  }, [visibleLayers, onLayerToggle]);

  const handleEntitiesOnly = useCallback(() => {
    layers.forEach(({ layer }) => {
      const shouldBeVisible = layer === NetworkLayer.ENTITY || 
                            layer === NetworkLayer.CHANNEL;
      const isVisible = visibleLayers.has(layer);
      
      if (shouldBeVisible !== isVisible) {
        onLayerToggle(layer);
      }
    });
  }, [visibleLayers, onLayerToggle]);

  // Memoized layer button click handlers
  const createLayerToggleHandler = useCallback((layer: NetworkLayer) => () => {
    const isDisabled = layer === NetworkLayer.TRANSACTION;
    if (!isDisabled) {
      onLayerToggle(layer);
    }
  }, [onLayerToggle]);

  // Memoized layer button data
  const layerButtons = useMemo(() => {
    return layers.map(({ layer, label, icon, description }) => {
      const isVisible = visibleLayers.has(layer);
      const isDisabled = layer === NetworkLayer.TRANSACTION;
      const handleClick = createLayerToggleHandler(layer);
      
      return {
        key: layer,
        className: `layer-toggle ${isVisible ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`,
        onClick: handleClick,
        disabled: isDisabled,
        title: description,
        icon,
        label,
        isVisible
      };
    });
  }, [visibleLayers, createLayerToggleHandler]);

  return (
    <div className="layer-controls">
      <div className="layer-controls-header">
        <h3>Network Layers</h3>
      </div>
      
      <div className="layer-list">
        {layerButtons.map((buttonProps) => (
          <button
            key={buttonProps.key}
            className={buttonProps.className}
            onClick={buttonProps.onClick}
            disabled={buttonProps.disabled}
            title={buttonProps.title}
          >
            <span className="layer-icon">{buttonProps.icon}</span>
            <span className="layer-label">{buttonProps.label}</span>
            <span className="layer-checkbox">
              {buttonProps.isVisible ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
      
      <div className="layer-controls-footer">
        <button
          className="layer-preset"
          onClick={handleShowAll}
        >
          Show All
        </button>
        
        <button
          className="layer-preset"
          onClick={handleEntitiesOnly}
        >
          Entities Only
        </button>
      </div>
    </div>
  );
});