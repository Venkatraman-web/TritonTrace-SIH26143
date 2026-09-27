/**
 * P&I underwriter liability estimate: converts a spill's slick area into an
 * oil mass (ITOPF-style), classifies it into an ITOPF size tier, then scales
 * a baseline cleanup cost by a risk multiplier based on whether a specific
 * vessel's route intersects a sensitive zone (port/terminal or MPA/reef).
 */
import * as turf from "@turf/turf";
import geofencesData from "../utils/regional_alert_geofences.json";

// Assumed average oil film thickness across the slick, in the ITOPF
// "discontinuous true oil colour" appearance band (50-200µm) — a reasonable
// default for a detected slick that's more than a bare sheen. Real spills
// vary by oil type/weathering; this is a fixed simulation assumption.
const ASSUMED_FILM_THICKNESS_M = 0.0001; // 0.1 mm
const ASSUMED_OIL_DENSITY_KG_PER_M3 = 850; // medium crude
const CLEANUP_COST_PER_KG_USD = 50;

/** Slick area (km²) -> estimated oil mass (kg), per the assumptions above. */
export const computeSlickMassKg = (areaSqKm) => {
  const areaM2 = areaSqKm * 1_000_000;
  const volumeM3 = areaM2 * ASSUMED_FILM_THICKNESS_M;
  return volumeM3 * ASSUMED_OIL_DENSITY_KG_PER_M3;
};

/** ITOPF spill-size categories, by tonnes of oil (mass_kg / 1000). */
export const classifyItopfTier = (massKg) => {
  const tonnes = massKg / 1000;
  if (tonnes < 7) return { tier: "Tier 1", label: "Minor" };
  if (tonnes <= 700) return { tier: "Tier 2", label: "Medium" };
  return { tier: "Tier 3", label: "Major" };
};

// Fixed risk multipliers by threatened-asset category and alert level —
// independent of each geofence's own liability_multiplier field (that one
// drives the unrelated Watch/Critical map styling elsewhere in the app).
const MULTIPLIERS = {
  port: { critical: 2.5, watch: 1.5 },
  mpa: { critical: 4.0, watch: 2.5 },
};

const categoryForZoneType = (type) => (type === "MPA" ? "mpa" : "port");

/**
 * Finds the highest-risk geofence a vessel's route intersects, if any.
 * When a route intersects multiple zones, the one with the highest
 * multiplier wins (most conservative estimate) — a vessel that grazes a
 * port watch zone but strikes an MPA's critical core is scored on the MPA.
 */
const findHotspotMatch = (trajectory, geofencesData) => {
  if (!trajectory || trajectory.length < 2 || !geofencesData?.features) return null;
  const routeLine = turf.lineString(trajectory);

  let best = null;
  geofencesData.features.forEach((zone) => {
    if (!turf.booleanIntersects(routeLine, zone)) return;
    const category = categoryForZoneType(zone.properties.type);
    const level = zone.properties.zone_level === "Critical Strike Zone" ? "critical" : "watch";
    const multiplier = MULTIPLIERS[category][level];
    if (!best || multiplier > best.multiplier) {
      best = { multiplier, category, level, assetName: zone.properties.name };
    }
  });
  return best;
};

/**
 * Full liability estimate for one vessel against one incident's slick.
 * `trajectory` is the vessel's own track ([lon, lat] pairs); `slickAreaSqKm`
 * is the incident's detected slick area. Mass is a property of the spill
 * (same for every vessel implicated in it) — only the hotspot multiplier
 * varies per vessel, based on that vessel's own route.
 */
export const computeVesselLiability = (trajectory, slickAreaSqKm) => {
  const massKg = computeSlickMassKg(slickAreaSqKm);
  const itopfTier = classifyItopfTier(massKg);
  const baselineLiabilityUsd = massKg * CLEANUP_COST_PER_KG_USD;

  const hotspot = findHotspotMatch(trajectory, geofencesData);
  const hotspotMultiplier = hotspot?.multiplier ?? 1.0;
  const threatenedAsset = hotspot?.assetName ?? "Open Sea (no geofence intersection)";

  const totalLiabilityUsd = baselineLiabilityUsd * hotspotMultiplier;

  return {
    massKg,
    itopfTier,
    baselineLiabilityUsd,
    hotspotMultiplier,
    threatenedAsset,
    totalLiabilityUsd,
  };
};

/** Compact USD display: "$19.98M" above a million, "$4,200" below it. */
export const formatUsdCompact = (usd) =>
  usd >= 1_000_000 ? `$${(usd / 1_000_000).toFixed(2)}M` : `$${Math.round(usd).toLocaleString()}`;
