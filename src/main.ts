import {
  emit,
  once,
  on,
  showUI,
  saveSettingsAsync,
  loadSettingsAsync,
} from "@create-figma-plugin/utilities";

import { clusterTextualNodes } from "./clusterTextualNodes";
import {
  ClusterTextualNodes,
  GetSettings,
  HandleError,
  SaveApiKey,
  SetIsFigJam,
  SetLoading,
  SetUILoaded,
} from "./types";

const SETTINGS_KEY = "autocluster-settings";

export const defaultSettings = {
  apiKey: "",
  // threshold: 0.155,
  threshold: 0.16,
};

export default function () {
  on<SaveApiKey>("SAVE_API_KEY", async function (apiKey: string) {
    try {
      await saveSettingsAsync({ apiKey }, SETTINGS_KEY);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
  });

  once<SetUILoaded>("SET_UI_LOADED", async function () {
    emit<SetIsFigJam>("SET_IS_FIGJAM", figma.editorType === "figjam");
    const settings = await loadSettingsAsync(defaultSettings, SETTINGS_KEY);
    console.log("loaded settings", settings);
    emit<GetSettings>("GET_SETTINGS", settings);
  });

  on<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES", async function () {
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
  });

  showUI({
    height: 200,
    width: 280,
  });
}
