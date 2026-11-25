/**
 * Web fallback for `@capacitor/keyboard`.
 * The WebView resizes natively, so hiding the keyboard is a no-op.
 */
export const Keyboard = {
  hide(): void {},
};
