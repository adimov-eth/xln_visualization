import React, { createContext, useContext } from 'react';
import { NetworkState, ViewState } from '../types/network.types';
import { WebSocketService } from '../services/websocket.service';

interface NetworkContextValue {
  networkState: NetworkState;
  viewState: ViewState;
  wsService: WebSocketService | null;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

export const NetworkProvider: React.FC<{
  children: React.ReactNode;
  value: NetworkContextValue;
}> = ({ children, value }) => {
  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};