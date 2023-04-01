import { EventHandler } from "@create-figma-plugin/utilities";

export type Settings = {
  apiKey: string;
  threshold: number;
  isFigJam: boolean;
};

export interface ClusterProps extends Settings {}

export interface GetSettings extends EventHandler {
  name: "GET_SETTINGS";
  handler: (settings: Settings) => void;
}

export interface ClusterTextualNodes extends EventHandler {
  name: "CLUSTER_TEXTUAL_NODES";
  handler: ({ apiKey, threshold }: ClusterProps) => void;
}

export interface HandleError extends EventHandler {
  name: "HANDLE_ERROR";
  handler: (error: string) => void;
}

export interface SetLoading extends EventHandler {
  name: "SET_LOADING";
  handler: (isLoading: boolean) => void;
}

export interface SetUILoaded extends EventHandler {
  name: "SET_UI_LOADED";
  handler: () => void;
}

export interface SaveApiKey extends EventHandler {
  name: "SAVE_API_KEY";
  handler: (apiKey: string) => void;
}
