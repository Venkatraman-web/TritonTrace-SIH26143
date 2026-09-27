/**
 * Extra backward-attribution reference images shown in the researcher
 * portal, per incident.
 */
import ow0008TimelineUrl from "./incidents/ow-0008/potential_source_region_timeline.png";
import ow0009TimelineUrl from "./incidents/ow-0009/potential_source_region_timeline.png";
import ow0008MultimemberUrl from "./incidents/ow-0008/07_multimember_static.png";
import ow0009MultimemberUrl from "./incidents/ow-0009/07_multimember_static.png";

// Backtracked potential source region, evolving over the 72h backtrack window.
export const sourceRegionTimelineImageUrlByIncident = {
  "ow-0008": ow0008TimelineUrl,
  "ow-0009": ow0009TimelineUrl,
};

// 10 real particles' backward trajectories under all 6 OpenOil forcing
// members — shows how consistent the backtrack is across the ensemble.
export const multimemberStaticImageUrlByIncident = {
  "ow-0008": ow0008MultimemberUrl,
  "ow-0009": ow0009MultimemberUrl,
};
