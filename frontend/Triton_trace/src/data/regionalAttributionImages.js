/**
 * Extra backward-attribution reference images shown in the researcher
 * portal, per incident.
 */
import ow0008TimelineUrl from "./incidents/ow-0008/potential_source_region_timeline.png";
import ow0009TimelineUrl from "./incidents/ow-0009/potential_source_region_timeline.png";
import ow0008MultimemberAnimationUrl from "./incidents/ow-0008/08_multimember_animation.mp4";
import ow0009MultimemberAnimationUrl from "./incidents/ow-0009/08_multimember_animation.mp4";

// Backtracked potential source region, evolving over the 72h backtrack window.
export const sourceRegionTimelineImageUrlByIncident = {
  "ow-0008": ow0008TimelineUrl,
  "ow-0009": ow0009TimelineUrl,
};

// 10 real particles' backward trajectories under all 6 OpenOil forcing
// members, animated — shows how consistent the backtrack is across the
// ensemble over the 3-day window.
export const multimemberAnimationUrlByIncident = {
  "ow-0008": ow0008MultimemberAnimationUrl,
  "ow-0009": ow0009MultimemberAnimationUrl,
};
