import { BLOCK } from './blocks.js';

export const WAYVAULT_STORAGE_KEY = 'wayvault:personal';
export const WAYVAULT_CAPACITY = 27;

export const isWayvault = (id) => id === BLOCK.WAYVAULT_CHEST;
export const isWayvaultStorageKey = (key) => key === WAYVAULT_STORAGE_KEY;

