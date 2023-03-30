import { getApiKey } from "./apiKey";
import { emit, once, showUI } from "@create-figma-plugin/utilities";

import { clusterTextualNodes } from "./clusterTextualNodes";

import { ClusterTextualNodes, HandleError, SaveApiKey } from "./types";
import { saveApiKey } from "./apiKey";

export default function () {
  once<SaveApiKey>("SAVE_API_KEY", async function (apiKey: string) {
    try {
      await saveApiKey(apiKey);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
  });

  once<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES", async function () {
    try {
      const apiKey = await getApiKey();
      await clusterTextualNodes(apiKey);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
    // figma.closePlugin();
  });

  showUI({
    height: 250,
    width: 240,
  });
}
