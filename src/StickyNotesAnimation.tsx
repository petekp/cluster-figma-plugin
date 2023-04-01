import { useCallback, useEffect, useState, useRef } from "preact/hooks";
import { h } from "preact";
import { UI_HEIGHT, UI_WIDTH } from "./constants";

interface StickyNotesAnimationProps {
  isPlaying: boolean;
}

interface StickyNote {
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

const NUM_NOTES = 35;
const STICKY_SIZE = 30;

const isCloseEnough = (value: number, target: number, threshold: number) => {
  return Math.abs(value - target) < threshold;
};

export default function StickyNotesAnimation({
  isPlaying,
}: StickyNotesAnimationProps) {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [moveToInitial, setMoveToInitial] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    createClusters(3, 3);
  }, []);

  const createClusters = (numColumns: number, numRows: number) => {
    const padding = (UI_WIDTH / 2 + UI_HEIGHT / 2) / 10;
    const containerWidth = UI_WIDTH - padding * 2;
    const containerHeight = UI_HEIGHT - padding * 2;
    const columnWidth = containerWidth / numColumns;
    const rowHeight = containerHeight / numRows;

    if (notes.length === 0) {
      const newNotes: StickyNote[] = Array.from(
        { length: NUM_NOTES },
        (_, i) => {
          const x = Math.random() * UI_WIDTH - STICKY_SIZE / 2;
          const y = Math.random() * UI_HEIGHT - STICKY_SIZE / 2;
          const targetCluster = Math.floor(Math.random() * numColumns);
          const targetRow = Math.floor(Math.random() * numRows);
          return {
            id: i,
            x: x,
            y: y,
            initialX: x,
            initialY: y,
            targetX:
              columnWidth * targetCluster +
              columnWidth / 2 -
              STICKY_SIZE / 2 +
              padding,
            targetY:
              rowHeight * targetRow + rowHeight / 2 - STICKY_SIZE / 2 + padding,
            rotation: Math.random() * 360,
            vx: 0,
            vy: 0,
          };
        }
      );
      setNotes(newNotes);
    } else {
      setNotes((prevNotes) =>
        prevNotes.map((note) => {
          const x = Math.random() * UI_WIDTH - STICKY_SIZE / 2;
          const y = Math.random() * UI_HEIGHT - STICKY_SIZE / 2;
          const targetCluster = Math.floor(Math.random() * numColumns);
          const targetRow = Math.floor(Math.random() * numRows);
          return {
            ...note,
            initialX: x,
            initialY: y,
            targetX:
              columnWidth * targetCluster +
              columnWidth / 2 -
              STICKY_SIZE / 2 +
              padding,
            targetY:
              rowHeight * targetRow + rowHeight / 2 - STICKY_SIZE / 2 + padding,
          };
        })
      );
    }
  };

  useEffect(() => {
    const springConstant = 0.1;
    const damping = 0.55;

    if (isPlaying) {
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
              rotation: moveToInitial
                ? note.rotation + Math.random() * 4 - 2
                : 0,
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
              const numColumns = Math.floor(Math.random() * 6) + 1;
              const numRows = Math.floor(Math.random() * 4) + 1;
              createClusters(numColumns, numRows);
            }
            return newState;
          });
        }
      }, 16);

      return () => {
        clearInterval(interval);
      };
    }
  }, [moveToInitial, isPlaying]);

  return (
    <svg viewBox={`0 0 ${UI_WIDTH} ${UI_HEIGHT}`}>
      <defs>
        <linearGradient
          id="stickyNoteGradient"
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" style={{ stopColor: "#FFD967", stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: "rgba(255, 194, 137, 1)", stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
      {notes.map((note) => (
        <rect
          key={note.id}
          x={note.x}
          y={note.y}
          width={STICKY_SIZE}
          height={STICKY_SIZE}
          fill="url(#stickyNoteGradient)"
          stroke="rgba(190, 122, 46, 1)"
          strokeWidth="1"
          style={{
            filter: moveToInitial
              ? "drop-shadow(0px 3px 3px rgba(190, 122, 46, 0.35)"
              : "none",
          }}
          transform={`rotate(${note.rotation}, ${note.x + STICKY_SIZE / 2}, ${
            note.y + STICKY_SIZE / 2
          })`}
        />
      ))}
    </svg>
  );
}
