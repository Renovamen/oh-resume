import { watch } from "vue";
import { useMagicKeys } from "@vueuse/core";
import { isMac } from "@ohmycv/utils";

/**
 * Handle keyboard shortcuts, dealing ctrl/meta key for Windows/Mac automatically.
 *
 * @param keys Keyboard shortcuts, split by `+`, e.g. `ctrl+shift+e`.
 * @param cb Callback function to be called when the shortcuts are triggered.
 */
export const useShortcuts = (keys: string, cb: () => void) => {
  const adjustedKeys = keys.replace("ctrl", isMac ? "meta" : "ctrl").split("+");

  const magic = useMagicKeys({
    passive: false,
    onEventFired: (e) => {
      if (e.type !== "keydown") return;

      const isKeyActive = (key: string) => {
        switch (key) {
          case "ctrl":
            return e.ctrlKey;
          case "meta":
            return e.metaKey;
          case "shift":
            return e.shiftKey;
          default:
            return e.key === key;
        }
      };

      if (adjustedKeys.every(isKeyActive)) e.preventDefault();
    }
  });

  const shortcuts = magic[adjustedKeys.join("+")];
  const { current } = magic;

  watch(shortcuts, (v) => {
    if (v && current.size === adjustedKeys.length) cb();
  });
};

export default useShortcuts;
