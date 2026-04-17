// LocationMap.jsx or .tsx

import "./LocationMap.scss";
import { useRef, useState, useEffect, useCallback, memo } from "react";
import styles from "../../styles/global_variables.scss";
import { getCentroidByGW, getMapOverlay } from "../../utils/queryBackend";
import MapLegend from "../MapLegend/MapLegend";
import ActorCard from "../ActorCard/ActorCard";
import LocationEventPopup from "../LocationEventPopup/LocationEventPopup";
import SnapshotButton from "../SnapshotButton/SnapshotButton";
import mapboxAccess from "../../utils/mapboxAccess";
import addNoise from "../../utils/addNoise";
import {
  getEventMarkerRadiusForZoom,
  getEventMarkerHitStrokeWeight,
} from "../../utils/eventMarkerMapStyle";
import useIsBelowMd from "../../../../hooks/useIsBelowMd";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const CanvasCircleMarkers = ({
  events,
  setSelectedEvent,
  getColourForEvent,
  
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !Array.isArray(events)) return;
    // Circle markers default to the map's canvas renderer when preferCanvas is true.
    // Cursor styling is applied to the whole canvas via JS and is unreliable; use SVG
    // so each path gets a proper hover target and cursor: pointer from CSS.
    const eventMarkerSvgRenderer = L.svg({ padding: 2 });
    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: function (cluster) {
        const children = cluster.getAllChildMarkers();
        const count = children.length;

        // --- Tally colours from child markers ---
        const colorCounts = {};
        children.forEach(function (m) {
          const c = m.options.fillColor || '#9c64a6';
          colorCounts[c] = (colorCounts[c] || 0) + 1;
        });

        // --- Determine icon size ---
        let px = 40;
        if (count >= 100) px = 56;
        else if (count >= 10) px = 48;
        const r = px / 2;           // outer radius
        const strokeWidth = 6;      // ring thickness
        const innerR = r - strokeWidth;

        // --- Build SVG arc segments (donut ring) ---
        function polarToCart(cx, cy, radius, angleDeg) {
          var rad = (angleDeg - 90) * Math.PI / 180;
          return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
        }
        function arcPath(cx, cy, radius, startAngle, endAngle) {
          var s = polarToCart(cx, cy, radius, startAngle);
          var e = polarToCart(cx, cy, radius, endAngle);
          var large = endAngle - startAngle > 180 ? 1 : 0;
          return 'M ' + s.x + ' ' + s.y + ' A ' + radius + ' ' + radius + ' 0 ' + large + ' 1 ' + e.x + ' ' + e.y;
        }

        var arcs = '';
        var angle = 0;
        var colors = Object.keys(colorCounts);
        if (colors.length === 1) {
          // Full ring, single colour
          arcs = '<circle cx="' + r + '" cy="' + r + '" r="' + (r - strokeWidth / 2) + '" fill="none" stroke="' + colors[0] + '" stroke-width="' + strokeWidth + '"/>';
        } else {
          var midR = r - strokeWidth / 2;
          colors.forEach(function (color) {
            var slice = (colorCounts[color] / count) * 360;
            // Avoid a full 360 arc (SVG can't render it); cap at 359.99
            var endAngle = angle + Math.min(slice, 359.99);
            arcs += '<path d="' + arcPath(r, r, midR, angle, endAngle) + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '"/>';
            angle = endAngle;
          });
        }

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" style="cursor:pointer;display:block;pointer-events:auto">'
          + '<circle cx="' + r + '" cy="' + r + '" r="' + innerR + '" fill="rgba(23,52,78,0.8)"/>'
          + arcs
          + '<text x="' + r + '" y="' + r + '" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="' + (px < 48 ? 11 : 13) + '" font-weight="700">' + count + '</text>'
          + '</svg>';

        return L.divIcon({
          html: svg,
          className: 'peor-cluster-pie',
          iconSize: L.point(px, px),
        });
      },
    });
    const visibleEvents = events.filter((event) => {
      const { fillOpacity } = getColourForEvent(event);
      return fillOpacity > 0;
    });

    const mapEl = map.getContainer();
    let eventMarkerPointerDepth = 0;
    const setEventMarkerPointer = () => {
      eventMarkerPointerDepth += 1;
      mapEl.style.cursor = "pointer";
    };
    const clearEventMarkerPointer = () => {
      eventMarkerPointerDepth = Math.max(0, eventMarkerPointerDepth - 1);
      if (eventMarkerPointerDepth === 0) {
        mapEl.style.cursor = "";
      }
    };

    const stopMapGestureCapture = (e) => {
      const dom = e.originalEvent ?? e;
      if (dom && typeof dom.stopPropagation === "function") {
        dom.stopPropagation();
      }
    };

    for (let event of visibleEvents) {
      const lat = addNoise(event.latitude);
      const lng = addNoise(event.longitude);
      const { fillColor, fillOpacity } = getColourForEvent(event);
      const z = map.getZoom();
      const marker = L.circleMarker([lat, lng], {
        radius: getEventMarkerRadiusForZoom(z),
        // Hairline from getColourForEvent is too thin for hit-testing; use a wide
        // low-alpha stroke so clicks match hover without a bulky visible ring.
        color: "rgba(255,255,255,0.04)",
        weight: getEventMarkerHitStrokeWeight(z),
        fillColor,
        fillOpacity,
        interactive: true,
        bubblingMouseEvents: false,
        renderer: eventMarkerSvgRenderer,
        className: "peor-map-event-marker",
      });

      marker.on("mouseover", setEventMarkerPointer);
      marker.on("mouseout", clearEventMarkerPointer);

      marker.on("mousedown", stopMapGestureCapture);
      marker.on("touchstart", stopMapGestureCapture);

      marker.on("click", () => {
        setSelectedEvent(event);
      
      });
      clusterGroup.addLayer(marker);
    }

    const syncEventMarkerStyles = () => {
      const zoomLevel = map.getZoom();
      const r = getEventMarkerRadiusForZoom(zoomLevel);
      const w = getEventMarkerHitStrokeWeight(zoomLevel);
      clusterGroup.eachLayer((layer) => {
        if (layer instanceof L.CircleMarker) {
          layer.setStyle({ radius: r, weight: w });
        }
      });
    };

    clusterGroup.addTo(map);
    syncEventMarkerStyles();
    map.on("zoomend", syncEventMarkerStyles);

    return () => {
      map.off("zoomend", syncEventMarkerStyles);
      mapEl.style.cursor = "";
      eventMarkerPointerDepth = 0;
      map.removeLayer(clusterGroup);
    };
  }, [map, events, setSelectedEvent, getColourForEvent]);

  return null
};



const initialPosition = [-2.619071, 26.11886];
const zoom = 6;

const RecenterAutomatically = memo(({ centerPosition }) => {
  const map = useMap();
  useEffect(() => {
    if (centerPosition) {
      map.setView(centerPosition);
    }
  }, [centerPosition, map]);
  return null;
});



const TrackMapBounds = memo(({ setMapBounds }) => {
  useMapEvents({
    moveend: (e) => setMapBounds(e.target.getBounds()),
    zoomend: (e) => setMapBounds(e.target.getBounds()),
  });
  return null;
});


export default function LocationMap({
  gw_number,
  start,
  end,
  events,
  actors,
  actorNames,
  eventTypeColours,
  countryName,
}) {
  const mapRef = useRef(null);
  const mapWrapperRef = useRef(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [openCard, setOpenCard] = useState(false);
  const [selectedActor, setSelectedActor] = useState("");
  const [colourSettings, setColourSettings] = useState(null);
  const [typeSelection, setTypeSelection] = useState(null);
  const [position, setPosition] = useState(null);
  const [overlayData, setOverlayData] = useState(null);
  const [needFetching, setNeedFetching] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);

  useEffect(() => {
    if (gw_number && !needFetching) {
      setNeedFetching(true);
    }
  }, [gw_number, needFetching]);

  useEffect(() => {
    const fetchData = async () => {
      if (!gw_number || !needFetching) return;

      try {
        const [centroidData, overlayDataRaw] = await Promise.all([
          getCentroidByGW({ gw_number }),
          getMapOverlay({ gw_number }),
        ]);
        setPosition([centroidData.latitude, centroidData.longitude]);
        try {
          setOverlayData(JSON.parse(overlayDataRaw));
        } catch {
          setOverlayData(overlayDataRaw);
        }
      } catch (err) {
        setOverlayData(null);
      }
    };
    fetchData();
  }, [needFetching, gw_number]);

  useEffect(() => {
    setColourSettings(eventTypeColours);
  }, [eventTypeColours]);

  const resizeMap = useCallback(() => {
    if (!mapRef.current) return;
    const container = document.getElementById("mapcontainer");
    if (container) {
      const observer = new ResizeObserver(() =>
        mapRef.current.invalidateSize()
      );
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, []);

  const showActorCard = useCallback((actor) => {
    setSelectedActor(actor.trim());
    setOpenCard(true);
  }, []);

  const hideActorCard = useCallback(() => setOpenCard(false), []);

  const getColourForEvent = useCallback(
    (event) => {
      const baseColor = colourSettings?.[event.event_type] || "#9c64a6";
      const opacity = typeSelection && !typeSelection[event.event_type] ? 0 : 1;
      return {
        color: "#ffffff",
        fillColor: baseColor,
        fill: true,
        fillOpacity: opacity,
        weight: 0.1,
      };
    },
    [colourSettings, typeSelection]
  );

  const getActor = useCallback(
    (name) => actors.find((actor) => actor.getName() === name.trim()) || null,
    [actors]
  );

  const setEventTypeFilter = useCallback((filter) => {
    setTypeSelection(filter);
  }, []);

  const onClosePopup = useCallback(() => setSelectedEvent(null), []);

  return (
    <div className="location-map-wrapper" ref={mapWrapperRef} style={{ position: "relative" }}>
      <SnapshotButton 
        targetRef={mapWrapperRef} 
        label="map" 
        filename={`ConflictNetwork_Map_${countryName}_${new Date().toISOString().split('T')[0]}`}
      />
      <div className="location-map-view">
        {getActor(selectedActor) && (
          <ActorCard
            gw_number={gw_number}
            open={openCard}
            onClose={hideActorCard}
            actor={getActor(selectedActor)}
            actorName={selectedActor}
            start={start}
            end={end}
            actors={actors}
            fullPeriod={false}
            eventTypeColours={eventTypeColours}
          />
        )}

        <MapContainer
          ref={mapRef}
          id="mapcontainer"
          className="map-container"
          center={initialPosition}
          zoom={zoom}
          minZoom={2}
          scrollWheelZoom={false}
          whenReady={resizeMap}
          worldCopyJump={true}
          preferCanvas={true}
        >
          {overlayData && (
            <GeoJSON
              key="overlay-geojson"
              data={overlayData}
              style={(feature) => ({
                fillColor: styles.neutralLight,
                color: styles.neutralLight,
                fillOpacity: 0.5,
                interactive: false,
              })}
            />
          )}

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={`https://api.mapbox.com/styles/v1/peaceobservatory-dev/cllfq4h4s012e01pi2mml622q/tiles/256/{z}/{x}/{y}?access_token=${mapboxAccess}`}
            tileSize={256}
            updateWhenIdle={true}
            updateWhenZooming={false}
            keepBuffer={2}
            detectRetina={true}
            minZoom={3}
            maxZoom={16}
            noWrap={true}
          />
          <TrackMapBounds setMapBounds={setMapBounds} />
          <CanvasCircleMarkers
            events={events}
            setSelectedEvent={setSelectedEvent}
            getColourForEvent={getColourForEvent}
            showActorCard={showActorCard}
            actors={actors}
            actorNames={actorNames}
            markerColour={getColourForEvent(events).fillColor}
            eventTypeColours={eventTypeColours}
            onClose={onClosePopup}
          >
          </CanvasCircleMarkers>
          <MapLegend
            eventTypeColours={eventTypeColours}
            setEventTypeFilter={setEventTypeFilter}
          />
          {position && <RecenterAutomatically centerPosition={position} />}
        </MapContainer>

        {selectedEvent && (
          <LocationEventPopup
            event={selectedEvent}
            showActorCard={showActorCard}
            actors={actors}
            actorNames={actorNames}
            markerColour={getColourForEvent(selectedEvent).fillColor}
            eventTypeColours={eventTypeColours}
            onClose={onClosePopup}
          />
        )} 
      </div>
    </div>
  );
}
