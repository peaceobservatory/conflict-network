/**
 * Leaflet location map: circle marker sizing for zoom level.
 * Pixel radius scales with zoom so dots stay small when zoomed out and remain
 * tappable when zoomed in (Leaflet hit-test uses radius + half stroke width).
 *
 * @param {number} zoom - Current map zoom level
 * @returns {number} Circle radius in CSS pixels
 */
export function getEventMarkerRadiusForZoom(zoom) {
    const zMin = 3;
    const zMax = 16;
    const rMin = 4;
    const rMax = 12;
    const t = Math.max(0, Math.min(1, (zoom - zMin) / (zMax - zMin)));
    return Math.round(rMin + t * (rMax - rMin));
  }
  
  /**
   * Wide, nearly invisible stroke so hit-testing extends well past the visible fill
   * (Leaflet uses radius + half stroke width). Scales slightly with zoom.
   *
   * @param {number} zoom - Current map zoom level
   * @returns {number} Stroke weight in pixels
   */
  export function getEventMarkerHitStrokeWeight(zoom) {
    const zMin = 3;
    const zMax = 16;
    const wMin = 12;
    const wMax = 20;
    const t = Math.max(0, Math.min(1, (zoom - zMin) / (zMax - zMin)));
    return Math.round(wMin + t * (wMax - wMin));
  }
  