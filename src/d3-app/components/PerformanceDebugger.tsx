import React, { useState, useEffect, useCallback, memo } from 'react';
import './PerformanceDebugger.css';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  memoryUsage: number;
  nodeCount: number;
  channelCount: number;
  reRenderCount: number;
}

interface PerformanceDebuggerProps {
  networkState: any;
  onToggle?: (enabled: boolean) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const PerformanceDebugger: React.FC<PerformanceDebuggerProps> = memo(({
  networkState,
  onToggle,
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    nodeCount: 0,
    channelCount: 0,
    reRenderCount: 0
  });

  const [renderCount, setRenderCount] = useState(0);

  // Track render count for re-render detection
  useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  // Performance monitoring
  useEffect(() => {
    if (!isVisible) return;

    let frameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const measurePerformance = () => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      
      if (deltaTime >= 1000) { // Update every second
        const fps = Math.round((frameCount * 1000) / deltaTime);
        const avgFrameTime = deltaTime / frameCount;
        
        // Get memory usage if available
        const memoryUsage = (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0;
        
        setMetrics(prev => ({
          ...prev,
          fps,
          frameTime: avgFrameTime,
          memoryUsage,
          nodeCount: networkState?.nodes?.length || 0,
          channelCount: networkState?.channels?.length || 0,
          reRenderCount: renderCount
        }));

        frameCount = 0;
        lastTime = now;
      }

      frameCount++;
      frameId = requestAnimationFrame(measurePerformance);
    };

    measurePerformance();

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isVisible, networkState, renderCount]);

  const toggleVisibility = useCallback(() => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    onToggle?.(newVisibility);
  }, [isVisible, onToggle]);

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'var(--color-success)';
    if (value <= thresholds.warning) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  return (
    <div className={`performance-debugger ${position}`}>
      <button 
        className="performance-toggle"
        onClick={toggleVisibility}
        title="Toggle Performance Debugger"
      >
        ⚡
      </button>
      
      {isVisible && (
        <div className="performance-panel">
          <div className="performance-header">
            <h3>Performance Metrics</h3>
            <button 
              className="close-btn"
              onClick={toggleVisibility}
              title="Close"
            >
              ×
            </button>
          </div>
          
          <div className="performance-metrics">
            <div className="metric-row">
              <span className="metric-label">FPS:</span>
              <span 
                className="metric-value"
                style={{ color: getPerformanceColor(60 - metrics.fps, { good: 10, warning: 30 }) }}
              >
                {metrics.fps}
              </span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Frame Time:</span>
              <span 
                className="metric-value"
                style={{ color: getPerformanceColor(metrics.frameTime, { good: 16.67, warning: 33.33 }) }}
              >
                {metrics.frameTime.toFixed(2)}ms
              </span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Memory:</span>
              <span 
                className="metric-value"
                style={{ color: getPerformanceColor(metrics.memoryUsage, { good: 100, warning: 500 }) }}
              >
                {formatMemory(metrics.memoryUsage)}
              </span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Nodes:</span>
              <span className="metric-value">{metrics.nodeCount}</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Channels:</span>
              <span className="metric-value">{metrics.channelCount}</span>
            </div>
            
            <div className="metric-row">
              <span className="metric-label">Re-renders:</span>
              <span 
                className="metric-value"
                style={{ color: metrics.reRenderCount > 100 ? 'var(--color-warning)' : 'var(--color-text-primary)' }}
              >
                {metrics.reRenderCount}
              </span>
            </div>
          </div>
          
          <div className="performance-actions">
            <button 
              className="action-btn"
              onClick={() => {
                setRenderCount(0);
                console.log('Performance metrics reset');
              }}
              title="Reset counters"
            >
              Reset
            </button>
            
            <button 
              className="action-btn"
              onClick={() => {
                console.log('Performance Metrics:', metrics);
                console.log('Network State:', networkState);
              }}
              title="Log to console"
            >
              Log
            </button>
          </div>
          
          <div className="performance-tips">
            {metrics.fps < 30 && (
              <div className="tip warning">
                Low FPS detected. Consider reducing node count or enabling WebGL rendering.
              </div>
            )}
            
            {metrics.memoryUsage > 200 && (
              <div className="tip warning">
                High memory usage. Check for memory leaks in D3.js event listeners.
              </div>
            )}
            
            {metrics.reRenderCount > 50 && (
              <div className="tip info">
                High re-render count. Verify React.memo usage and prop stability.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});