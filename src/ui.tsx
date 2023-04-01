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
import { useCallback, useEffect, useState, useRef } from "preact/hooks";

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

interface Note {
  id: number;
  x: number;
  y: number;
  initialX: number;
  initialY: number;
  targetX: number;
  targetY: number;
  rotation: number;
  vx: number;
  vy: number;
}

const NUM_NOTES = 45;

const isCloseEnough = (value: number, target: number, threshold: number) => {
  return Math.abs(value - target) < threshold;
};

const StickyNotesAnimation = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [moveToInitial, setMoveToInitial] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    createClusters(3, 3);
  }, []);

  const createClusters = (numColumns: number, numRows: number) => {
    const padding = 24;
    const containerWidth = 280 - padding * 2;
    const containerHeight = 200 - padding * 2;
    const columnWidth = containerWidth / numColumns;
    const rowHeight = containerHeight / numRows;

    if (notes.length === 0) {
      const newNotes: Note[] = Array.from({ length: NUM_NOTES }, (_, i) => {
        const x = Math.random() * 280 - 15;
        const y = Math.random() * 200 - 15;
        const targetCluster = Math.floor(Math.random() * numColumns);
        const targetRow = Math.floor(Math.random() * numRows);
        return {
          id: i,
          x: x,
          y: y,
          initialX: x,
          initialY: y,
          targetX: columnWidth * targetCluster + columnWidth / 2 - 15 + padding,
          targetY: rowHeight * targetRow + rowHeight / 2 - 15 + padding,
          rotation: Math.random() * 360,
          vx: 0,
          vy: 0,
        };
      });
      setNotes(newNotes);
    } else {
      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          const targetCluster = Math.floor(Math.random() * numColumns);
          const targetRow = Math.floor(Math.random() * numRows);
          return {
            ...note,
            targetX:
              columnWidth * targetCluster + columnWidth / 2 - 15 + padding,
            targetY: rowHeight * targetRow + rowHeight / 2 - 15 + padding,
          };
        })
      );
    }
  };

  useEffect(() => {
    const springConstant = 0.04;
    const damping = 0.7;

    const interval = setInterval(() => {
      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          const targetX = moveToInitial ? note.initialX : note.targetX;
          const targetY = moveToInitial ? note.initialY : note.targetY;

          const dx = targetX - note.x;
          const dy = targetY - note.y;

          const ax = dx * springConstant;
          const ay = dy * springConstant;

          const newVx = (note.vx + ax) * damping;
          const newVy = (note.vy + ay) * damping;

          return {
            ...note,
            x: note.x + newVx,
            y: note.y + newVy,
            rotation: moveToInitial ? note.rotation + Math.random() * 4 - 2 : 0,
            vx: newVx,
            vy: newVy,
          };
        })
      );

      const allNotesAtTarget = notesRef.current.every((note) => {
        const targetX = moveToInitial ? note.initialX : note.targetX;
        const targetY = moveToInitial ? note.initialY : note.targetY;
        return (
          isCloseEnough(note.x, targetX, 0.1) &&
          isCloseEnough(note.y, targetY, 0.1)
        );
      });

      if (allNotesAtTarget) {
        setMoveToInitial((prevState) => {
          const newState = !prevState;
          if (!newState) {
            const numColumns = Math.floor(Math.random() * 6) + 3;
            const numRows = numColumns > 5 ? 2 : 1;
            createClusters(numColumns, numRows);
          }
          return newState;
        });
      }
    }, 16);

    return () => {
      clearInterval(interval);
    };
  }, [moveToInitial]);

  return (
    <svg viewBox="0 0 280 200">
      <defs>
        <linearGradient
          id="stickyNoteGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: "#FFD700", stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: "#FFC289", stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
      {notes.map((note) => (
        <rect
          key={note.id}
          x={note.x}
          y={note.y}
          width="30"
          height="30"
          fill="url(#stickyNoteGradient)"
          stroke="#BE7A2E"
          strokeWidth="1"
          transform={`rotate(${note.rotation}, ${note.x + 15}, ${note.y + 15})`}
        />
      ))}
    </svg>
  );
};

function loadScript(url: string, callback?: () => void) {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = url;
  if (typeof callback === "function") {
    script.onload = callback;
  }

  document.head.appendChild(script);
}

function Plugin() {
  const [settings, setSettings] = useState<Settings>({
    apiKey: "",
    threshold: 0.5,
  });
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFigJam, setIsFigJam] = useState<boolean>(true);
  const [isScriptLoaded, setScriptLoaded] = useState<boolean>(false);

  const { apiKey, threshold } = settings;

  useEffect(() => {
    emit<SetUILoaded>("SET_UI_LOADED");
    loadScript(
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
      () => setScriptLoaded(true)
    );
  }, []);

  useEffect(() => {
    if (isScriptLoaded) {
      console.log("three.js loaded!");
    }
  }, [isScriptLoaded]);

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

  once<SetIsFigJam>("SET_IS_FIGJAM", setIsFigJam);
  once<GetSettings>("GET_SETTINGS", setSettings);
  on<HandleError>("HANDLE_ERROR", setError);
  on<SetLoading>("SET_LOADING", setIsLoading);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
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

        <Button
          loading={isLoading}
          fullWidth
          onClick={handleClusterButtonClick}
        >
          Cluster {isFigJam ? "sticky notes" : "text layers"}
        </Button>
      </Container>
      {!isLoading && (
        <div
          style={{
            position: "absolute",
            zIndex: 2,
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(10px)",
          }}
        >
          <StickyNotesAnimation />
        </div>
      )}
    </div>
  );
}

export default render(Plugin);
