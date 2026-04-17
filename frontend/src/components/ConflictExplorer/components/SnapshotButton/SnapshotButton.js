import React, { useCallback, useState } from "react";
import IconButton from "@mui/material/IconButton";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import { toJpeg } from "html-to-image";

/** Element ids omitted from snapshot exports (overlay controls). */
const SNAPSHOT_EXCLUDE_ELEMENT_IDS = new Set([
  "peor-snapshot-button",
  "peor-fullscreen-button",
  "peor-force-toggle-button",
  "peor-graph-reset-button",
]);

/**
 * Reusable camera snapshot button.
 *
 * @param {Object}  props
 * @param {React.RefObject} props.targetRef - ref to the DOM element to capture
 * @param {string}  [props.label="snapshot"] - used in the download filename
 */
export default function SnapshotButton({ targetRef, label = "snapshot", filename, sx = {} }) {
  const [busy, setBusy] = useState(false);

  const handleSnapshot = useCallback(async () => {
    if (!targetRef?.current || busy) return;
    setBusy(true);

    try {
      const dataUrl = await toJpeg(targetRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        cacheBust: true,
        // Leaflet tiles are cross-origin; skip them gracefully
        filter: (node) => {
          if (node.id && SNAPSHOT_EXCLUDE_ELEMENT_IDS.has(node.id)) {
            return false;
          }
          if (node.classList && node.classList.contains("leaflet-control-container")) {
            return false;
          }
          
          // Exclude nodes that might cause CORS issues but keep everything else
          if (node.tagName === "IMG" && node.crossOrigin === undefined) {
            return true;
          }
          return true;
        },
      });

      const link = document.createElement("a");
      if (filename) {
        link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
      } else {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, 19);
        link.download = `peace-observatory-${label}-${timestamp}.jpg`;
      }
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Snapshot failed:", err);
    } finally {
      setBusy(false);
    }
  }, [targetRef, label, busy, filename]);

  return (
    <Tooltip title={`Download ${label} as image`} placement="left">
      <IconButton
        id="peor-snapshot-button"
        onClick={handleSnapshot}
        disabled={busy}
        size="small"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 900,
          backgroundColor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(4px)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          "&:hover": {
            backgroundColor: "rgba(255,255,255,1)",
          },
          ...sx,
        }}
      >
        {busy ? (
          <CircularProgress size={20} />
        ) : (
          <CameraAltIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
