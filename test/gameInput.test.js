import assert from 'node:assert/strict';
import test from 'node:test';
import { installGameContextMenuGuard, isGameContextMenu } from '../src/gameInput.js';

test('game context-menu detection covers direct, composed-path, and pointer-locked events', () => {
  const canvas = {};
  assert.equal(isGameContextMenu({ target: canvas }, canvas, {}), true);
  assert.equal(isGameContextMenu({ target: {}, composedPath: () => [{}, canvas] }, canvas, {}), true);
  assert.equal(isGameContextMenu({ target: {} }, canvas, { pointerLockElement: canvas }), true);
  assert.equal(isGameContextMenu({ target: {} }, canvas, {}), false);
});

test('installed guard prevents right-mouse defaults and only game context menus', () => {
  const canvasListeners = new Map();
  const documentListeners = new Map();
  const canvas = {
    addEventListener: (type, handler) => canvasListeners.set(type, handler),
    removeEventListener: (type) => canvasListeners.delete(type),
  };
  const documentRef = {
    pointerLockElement: null,
    addEventListener: (type, handler) => documentListeners.set(type, handler),
    removeEventListener: (type) => documentListeners.delete(type),
  };
  const cleanup = installGameContextMenuGuard(canvas, documentRef);
  let prevented = 0;
  canvasListeners.get('mousedown')({ button: 2, preventDefault: () => prevented += 1 });
  documentListeners.get('contextmenu')({ target: canvas, preventDefault: () => prevented += 1, stopPropagation() {} });
  documentListeners.get('contextmenu')({ target: {}, preventDefault: () => prevented += 10, stopPropagation() {} });
  assert.equal(prevented, 2);
  cleanup();
  assert.equal(canvasListeners.size, 0);
  assert.equal(documentListeners.size, 0);
});
