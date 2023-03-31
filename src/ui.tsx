import {
  Banner,
  Button,
  Columns,
  Container,
  IconWarning32,
  render,
  Text,
  Textbox,
  VerticalSpace,
} from "@create-figma-plugin/ui";
import { emit, once, on } from "@create-figma-plugin/utilities";
import { h } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

import {
  ClusterTextualNodes,
  GetSettings,
  HandleError,
  SaveApiKey,
  SetIsFigJam,
  SetLoading,
  SetUILoaded,
  Settings,
} from "./types";

function Plugin() {
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    threshold: 0.5,
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFigJam, setIsFigJam] = useState<boolean>(true);

  const { apiKey, threshold } = settings;

  useEffect(() => {
    emit<SetUILoaded>("SET_UI_LOADED");
  }, []);

  const handleClusterButtonClick = useCallback(
    function () {
      console.log("CLUSTER_TEXTUAL_NODES");
      if (apiKey === "") {
        setError("API Key is required");
        return;
      }
      setError("");
      emit<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES");
    },
    [apiKey, threshold, error]
  );

  const handleSaveApiKey = useCallback(
    function () {
      emit<SaveApiKey>("SAVE_API_KEY", apiKey);
    },
    [apiKey]
  );

  once<SetIsFigJam>("SET_IS_FIGJAM", setIsFigJam);
  once<GetSettings>("GET_SETTINGS", setSettings);
  on<HandleError>("HANDLE_ERROR", setError);
  on<SetLoading>("SET_LOADING", setIsLoading);

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>OpenAI API Key</Text>
      <VerticalSpace space="small" />
      <Columns space="extraSmall">
        <Textbox
          onValueInput={(val: string) => {
            setSettings({ ...settings, apiKey: val.trim() });
            emit<SaveApiKey>("SAVE_API_KEY", val.trim());
            setError("");
          }}
          value={apiKey}
          password={true}
          variant="border"
        />
      </Columns>
      {error && <VerticalSpace space="small" />}

      {error && (
        <Banner
          style={{
            wordBreak: "break-all",
            maxWidth: "100%",
            overflow: "hidden",
            userSelect: "auto",
          }}
          icon={<IconWarning32 />}
          variant="warning"
        >
          {error}
        </Banner>
      )}
      <VerticalSpace space="extraSmall" />

      <Button loading={isLoading} fullWidth onClick={handleClusterButtonClick}>
        Cluster {isFigJam ? "sticky notes" : "text layers"}
      </Button>

      <VerticalSpace space="small" />
    </Container>
  );
}

export default render(Plugin);
