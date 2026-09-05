import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('manticore', {
  platform: process.platform
});

