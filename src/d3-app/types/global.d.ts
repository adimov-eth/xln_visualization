// Global type declarations

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

// Webpack Hot Module Replacement
interface NodeModule {
  hot?: {
    accept(path: string, callback: () => void): void;
    accept(callback: () => void): void;
    dispose(callback: () => void): void;
  };
}

// Extend Window interface if needed
interface Window {
  __XLN_DEVTOOLS__?: any;
}