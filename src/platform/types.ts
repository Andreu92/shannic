/**
 * Shared types for the platform abstraction layer.
 *
 * Every module under `src/platform` mirrors a native capability
 * (network, filesystem, haptics, ...) and provides a web fallback so the
 * app keeps working before/without the native Tauri implementation.
 * During Phase 3 the fallbacks are swapped for Tauri commands/plugins.
 */

export interface ListenerHandle {
  remove(): Promise<void> | void;
}

export type ListenerCallback = (
  // Native APIs deliver loosely-typed payloads; consumers narrow via `as`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
) => void;
