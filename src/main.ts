import { UI_HEIGHT, UI_WIDTH } from "./constants";
import {
  emit,
  once,
  on,
  showUI,
  saveSettingsAsync,
  loadSettingsAsync,
} from "@create-figma-plugin/utilities";

import * as CryptoJS from "crypto-js";

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
  iv: "",
  threshold: 0.16,
  isFigJam: figma.editorType === "figjam",
};

const ek = "daca82e5ac526e90e91ee3f5c11de204927c4cc4e6192544dc5ecbfbb514826b";
const encryptionKeyWordArray = CryptoJS.enc.Hex.parse(ek);

function generateRandomHex(size: number) {
  const characters = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < size; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export default function () {
  figma.on("selectionchange", () => {
    emit<SetSelectedNodes>(
      "SET_SELECTED_NODES",
      figma.currentPage.selection.length
    );
  });

  on<SaveApiKey>("SAVE_API_KEY", async function (apiKey: string) {
    let encryptedData;

    if (apiKey === "") {
      encryptedData = {
        apiKey: "",
        iv: "",
      };
    } else {
      const iv = CryptoJS.enc.Hex.parse(generateRandomHex((128 / 8) * 2));
      const encryptedApiKey = CryptoJS.AES.encrypt(
        apiKey,
        encryptionKeyWordArray,
        {
          iv: iv,
        }
      );
      encryptedData = {
        apiKey: encryptedApiKey.ciphertext.toString(CryptoJS.enc.Hex),
        iv: iv.toString(CryptoJS.enc.Hex),
      };
    }

    try {
      await saveSettingsAsync(encryptedData, SETTINGS_KEY);
      const updatedSettings = await loadSettingsAsync(
        defaultSettings,
        SETTINGS_KEY
      );

      emit<GetSettings>("GET_SETTINGS", updatedSettings);
    } catch (error: any) {
      emit<HandleError>("HANDLE_ERROR", error.message);
    }
  });

  once<SetUILoaded>("SET_UI_LOADED", async function () {
    const settings = await loadSettingsAsync(defaultSettings, SETTINGS_KEY);

    if (settings.apiKey && settings.iv) {
      const iv = CryptoJS.enc.Hex.parse(settings.iv);
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Hex.parse(settings.apiKey),
      });
      const decryptedApiKeyBytes = CryptoJS.AES.decrypt(
        cipherParams,
        encryptionKeyWordArray,
        { iv: iv }
      );
      const decryptedApiKey = CryptoJS.enc.Utf8.stringify(decryptedApiKeyBytes);

      emit<GetSettings>("GET_SETTINGS", {
        ...settings,
        apiKey: decryptedApiKey,
      });
    } else {
      emit<GetSettings>("GET_SETTINGS", settings);
    }
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
