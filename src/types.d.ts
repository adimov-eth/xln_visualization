/// <reference types="react" />
/// <reference types="react-dom" />

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

// Webpack Hot Module Replacement API
interface NodeModule {
  hot?: {
    accept(path?: string, callback?: () => void): void;
    decline(path?: string): void;
    dispose(callback: (data: any) => void): void;
    addDisposeHandler(callback: (data: any) => void): void;
    removeDisposeHandler(callback: (data: any) => void): void;
    invalidate(): void;
    addStatusHandler(callback: (status: string) => void): void;
    removeStatusHandler(callback: (status: string) => void): void;
    status(): string;
    check(autoApply: boolean): Promise<any>;
    apply(): Promise<any>;
    data?: any;
  };
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    WS_URL?: string;
  }
}