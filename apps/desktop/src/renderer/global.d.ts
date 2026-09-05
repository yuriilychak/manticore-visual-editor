import type { WindowControls } from './types';

export {};

declare global {
  interface Window {
    manticore?: {
      platform: string;
      windowControls: WindowControls;
    };
  }
}
