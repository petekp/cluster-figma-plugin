import { EventHandler } from "@create-figma-plugin/utilities";

export interface ClusterTextualNodes extends EventHandler {
  name: "CLUSTER_TEXTUAL_NODES";
  handler: () => void;
}

export interface HandleError extends EventHandler {
  name: "HANDLE_ERROR";
  handler: (error: string) => void;
}

export interface SetLoading extends EventHandler {
  name: "SET_LOADING";
  handler: (isLoading: boolean) => void;
}

export interface SaveApiKey extends EventHandler {
  name: "SAVE_API_KEY";
  handler: (apiKey: string) => void;
}