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
  SetSelectedNodes,
  SetUILoaded,
  Settings,
} from "./types";
import StickyNotesAnimation from "./StickyNotesAnimation";

import styles from "./styles.css";

const urlRegex = /(https?:\/\/[^\s]+)/g;

const parseTextWithUrl = (text: string) => {
  const parts = text.split(urlRegex);

  return parts.map((part, index) =>
    urlRegex.test(part) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer">
        {part}
      </a>
    ) : (
      part
    )
  );
};

const thresholdValueMap = {
  Small: 0.135,
  Medium: 0.16,
  Large: 0.2,
} as const;

type ThresholdControlOption = keyof typeof thresholdValueMap;

function getButtonText({
  isFigJam,
  numNodesSelected = 0,
}: {
  isFigJam: boolean;
  numNodesSelected: number;
}) {
  if (isFigJam) {
    const pluralized = numNodesSelected === 1 ? "note" : "notes";
    return numNodesSelected > 0
      ? `Cluster ${numNodesSelected} selected sticky ${pluralized}`
      : "Cluster all sticky notes";
  }

  const pluralized = numNodesSelected === 1 ? "layer" : "layers";

  return numNodesSelected > 0
    ? `Cluster ${numNodesSelected} text ${pluralized}`
    : "Cluster all text layers";
}

export const ThresholdSelector = function ({
  onChange,
}: {
  onChange: (threshold: ThresholdControlOption) => void;
}) {
  const [threshold, setThreshold] = useState<ThresholdControlOption>("Medium");
  const options: Array<SegmentedControlOption> = [
    { value: "Small" },
    { value: "Medium" },
    { value: "Large" },
  ];
  function handleChange(event: JSX.TargetedEvent<HTMLInputElement>) {
    const newValue = event.currentTarget.value;
    onChange(newValue as ThresholdControlOption);
    setThreshold(newValue as ThresholdControlOption);
  }
  return (
    <SegmentedControl
      onChange={handleChange}
      options={options}
      value={threshold}
    />
  );
};

function Plugin({ defaultSettings }: { defaultSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const { apiKey, threshold: initialThreshold, isFigJam } = settings;
  const [numNodesSelected, setNumNodesSelected] = useState<number>(0);

  const [error, setError] = useState<string>("");
  const [showRequired, setShowRequired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [thresholdNum, setThresholdNum] = useState<number>(initialThreshold);

  useEffect(() => {
    emit<SetUILoaded>("SET_UI_LOADED");
  }, []);

  const handleClusterButtonClick = useCallback(
    function () {
      if (apiKey === "") {
        setShowRequired(true);
        return;
      }
      setError("");
      setShowRequired(false);
      emit<ClusterTextualNodes>("CLUSTER_TEXTUAL_NODES", {
        apiKey,
        threshold: thresholdNum,
        isFigJam,
      });
    },
    [apiKey, thresholdNum, error]
  );

  once<GetSettings>("GET_SETTINGS", setSettings);
  on<HandleError>("HANDLE_ERROR", setError);
  on<SetLoading>("SET_LOADING", setIsLoading);
  on<SetSelectedNodes>("SET_SELECTED_NODES", setNumNodesSelected);

  return (
    <div style={styles.outerContainer}>
      <VerticalSpace space="large" />

      <Container
        space="medium"
        style={{ pointerEvents: isLoading ? "none" : "all" }}
      >
        <Text>
          OpenAI API Key{" "}
          {showRequired && (
            <span style={{ marginLeft: 4, fontWeight: 600, color: "#E95324" }}>
              ← Required
            </span>
          )}
        </Text>

        <VerticalSpace space="small" />
        <Columns space="extraSmall">
          <Textbox
            onValueInput={(val: string) => {
              setSettings({ ...settings, apiKey: val.trim() });
              emit<SaveApiKey>("SAVE_API_KEY", val.trim());
            }}
            value={apiKey}
            onFocusCapture={() => {
              setError("");
              setShowRequired(false);
            }}
            password={true}
            variant="border"
          />
        </Columns>
        {error && <VerticalSpace space="small" />}

        {error && (
          <Banner
            className={styles.warningBanner}
            icon={<IconWarning32 />}
            variant="warning"
          >
            <span className={styles.warningBanner}>
              {parseTextWithUrl(error)}
            </span>
          </Banner>
        )}
        {/* <VerticalSpace space="small" />
        <ThresholdSelector
          onChange={(val) => setThresholdNum(thresholdValueMap[val])}
        /> */}
        <VerticalSpace space="small" />
        <Button
          loading={isLoading}
          fullWidth
          onClick={handleClusterButtonClick}
        >
          {getButtonText({ isFigJam, numNodesSelected })}
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
