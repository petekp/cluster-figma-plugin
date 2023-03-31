import {
  emit,
  once,
  showUI,
  saveSettingsAsync,
  loadSettingsAsync,
} from "@create-figma-plugin/utilities";

import { clusterTextualNodes } from "./clusterTextualNodes";
import {
  ClusterTextualNodes,
  HandleError,
  SaveApiKey,
  SetLoading,
} from "./types";

const SETTINGS_KEY = "autocluster-settings";

const defaultSettings = {
  apiKey: "",
  threshold: 0.155,
};

export default function () {
  once<SaveApiKey>("SAVE_API_KEY", async function (apiKey: string) {
    try {
      await saveSettingsAsync({ apiKey }, SETTINGS_KEY);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
  });

  once<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES", async function () {
    try {
      emit<SetLoading>("SET_LOADING", true);
      const { apiKey, threshold } = await loadSettingsAsync(
        defaultSettings,
        SETTINGS_KEY
      );
      console.log({ apiKey, threshold });
      await clusterTextualNodes({ apiKey, threshold });
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    } finally {
      emit<SetLoading>("SET_LOADING", false);
    }
    // figma.closePlugin();
  });

  showUI({
    height: 300,
    width: 280,
  });
}
