import { useRef, useCallback } from 'react';

/**
 * Long-press for touch (mobile): after delay ms, call callback(clientX, clientY).
 * Use with onTouchStart, onTouchEnd, onTouchCancel to open context menu on mobile.
 */
export function useLongPress(callback, delay = 500) {
  const timer = useRef(null);
  const touchPos = useRef({ x: 0, y: 0 });
  const didLongPress = useRef(false);

  const onTouchStart = useCallback(
    (e) => {
      if (e.touches.length !== 1) return;
      didLongPress.current = false;
      touchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      timer.current = setTimeout(() => {
        didLongPress.current = true;
        callback(touchPos.current.x, touchPos.current.y);
        timer.current = null;
      }, delay);
    },
    [callback, delay]
  );

  const onTouchEnd = useCallback((e) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (didLongPress.current) {
      e.preventDefault();
      didLongPress.current = false;
    }
  }, []);

  const onTouchCancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
