import { UI_HEIGHT, UI_WIDTH } from "./constants";
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
  ClusterProps,
  ClusterTextualNodes,
  GetSettings,
  HandleError,
  SaveApiKey,
  SetLoading,
  SetSelectedNodes,
  SetUILoaded,
} from "./types";

const SETTINGS_KEY = "cluster-plugin";

const defaultSettings = {
  apiKey: "",
  // threshold: 0.155,
  threshold: 0.16,
  isFigJam: figma.editorType === "figjam",
};

export default function () {
  figma.on("selectionchange", () => {
    emit<SetSelectedNodes>(
      "SET_SELECTED_NODES",
      figma.currentPage.selection.length
    );
  });

  on<SaveApiKey>("SAVE_API_KEY", async function (apiKey: string) {
    try {
      await saveSettingsAsync({ apiKey }, SETTINGS_KEY);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
  });

  once<SetUILoaded>("SET_UI_LOADED", async function () {
    const settings = await loadSettingsAsync(defaultSettings, SETTINGS_KEY);
    emit<GetSettings>("GET_SETTINGS", settings);
  });

  on<ClusterTextualNodes>(
    "CLUSTER_TEXTUAL_NODES",
    async function ({ apiKey, threshold, isFigJam }: ClusterProps) {
      try {
        emit<SetLoading>("SET_LOADING", true);
        await clusterTextualNodes({ apiKey, threshold, isFigJam });
      } catch (error: any) {
        emit<HandleError>("HANDLE_ERROR", error.message);
      } finally {
        emit<SetLoading>("SET_LOADING", false);
      }
    }
  );

  showUI(
    {
      height: UI_HEIGHT,
      width: UI_WIDTH,
    },
    { defaultSettings }
  );
}
