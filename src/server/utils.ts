/**
 * Utility functions for the server
 */

/**
 * Convert BigInt values to strings for JSON serialization
 */
export function serializeNetworkState(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeNetworkState);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeNetworkState(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Convert string values back to BigInt where appropriate
 */
export function deserializeNetworkState(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(deserializeNetworkState);
  }
  
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Convert known BigInt fields
      if (
        (key === 'reserves' || key === 'tvl' || key === 'capacity' || 
         key === 'available' || key === 'creditLine' || key === 'balance' || 
         key === 'creditLimit' || key === 'totalTvl' || key === 'transactionVolume24h' || 
         key === 'amount') && 
        typeof value === 'string'
      ) {
        try {
          result[key] = BigInt(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = deserializeNetworkState(value);
      }
    }
    return result;
  }
  
  return obj;
}