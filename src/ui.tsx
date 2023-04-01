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
  SegmentedControl,
  SegmentedControlOption,
} from "@create-figma-plugin/ui";
import { emit, once, on } from "@create-figma-plugin/utilities";
import { h, JSX } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";

import {
  ClusterTextualNodes,
  GetSettings,
  HandleError,
  SaveApiKey,
  SetLoading,
  SetUILoaded,
  Settings,
} from "./types";
import StickyNotesAnimation from "./StickyNotesAnimation";

import styles from "./styles.css";

function Plugin({ defaultSettings }: { defaultSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { apiKey, threshold, isFigJam } = settings;

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
      emit<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES", {
        apiKey,
        threshold,
        isFigJam,
      });
    },
    [apiKey, threshold, error]
  );

  once<GetSettings>("GET_SETTINGS", setSettings);
  on<HandleError>("HANDLE_ERROR", setError);
  on<SetLoading>("SET_LOADING", setIsLoading);
  console.log("is figjam", isFigJam);

  return (
    <div style={styles.outerContainer}>
      <VerticalSpace space="large" />

      <Container space="medium">
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
        <VerticalSpace space="small" />

        <VerticalSpace space="small" />
        <Button
          loading={isLoading}
          fullWidth
          onClick={handleClusterButtonClick}
        >
          Cluster {isFigJam ? "sticky notes" : "text layers"}
        </Button>
        <VerticalSpace space="large" />
      </Container>

      <div
        className={`${styles.loadingContainer} ${
          isLoading && styles.isVisible
        }`}
      >
        <StickyNotesAnimation isPlaying={isLoading} />
      </div>
    </div>
  );
}

export default render(Plugin);
