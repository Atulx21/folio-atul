import type { Object3D } from 'three';

/** DOM elements that own a pointer event (R3F listens on document.body, so rays also hit 3D behind the UI). */
export const UI_SELECTOR = 'a,button,input,textarea,select,[role="button"],[data-ui]';

export const isUiTarget = (e: { nativeEvent: Event }) => {
  const t = e.nativeEvent.target;
  return t instanceof Element && !!t.closest(UI_SELECTOR);
};

/** Pass as `raycast` on decorative meshes / lines / text so only the intended meshes get pointer events. */
export const noRaycast = () => null;

type TroikaLike = Object3D & { textRenderInfo?: { blockBounds: number[] } };

/** Text onSync helper: shrinks text uniformly to fit inside maxW x maxH (never enlarges). */
export const fitBox = (maxW: number, maxH = Infinity) => (obj: unknown) => {
  const m = obj as TroikaLike;
  const b = m.textRenderInfo?.blockBounds;
  if (!b) return;
  const w = Math.max(b[2] - b[0], 1e-6);
  const h = Math.max(b[3] - b[1], 1e-6);
  m.scale.setScalar(Math.min(1, maxW / w, maxH / h));
};