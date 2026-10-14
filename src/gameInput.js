export function isGameContextMenu(event, canvas, documentRef = globalThis.document) {
  if (!event || !canvas) return false;
  if (documentRef?.pointerLockElement === canvas) return true;
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  return event.target === canvas || path.includes(canvas);
}

export function installGameContextMenuGuard(canvas, documentRef = globalThis.document) {
  if (!canvas?.addEventListener || !documentRef?.addEventListener) return () => {};
  const preventRightMouseDefault = (event) => {
    if (event.button === 2) event.preventDefault();
  };
  const preventGameContextMenu = (event) => {
    if (!isGameContextMenu(event, canvas, documentRef)) return;
    event.preventDefault();
    event.stopPropagation();
  };
  // Embedded browsers can retarget contextmenu after a right-click interaction
  // or pointer lock, so guard both the canvas and the capture-phase document.
  canvas.addEventListener('mousedown', preventRightMouseDefault, { capture: true });
  canvas.addEventListener('contextmenu', preventGameContextMenu, { capture: true });
  documentRef.addEventListener('contextmenu', preventGameContextMenu, { capture: true });
  return () => {
    canvas.removeEventListener('mousedown', preventRightMouseDefault, { capture: true });
    canvas.removeEventListener('contextmenu', preventGameContextMenu, { capture: true });
    documentRef.removeEventListener('contextmenu', preventGameContextMenu, { capture: true });
  };
}
