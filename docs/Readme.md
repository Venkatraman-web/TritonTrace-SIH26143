# TritonTrace — Maritime Oil-Spill Forensic Intelligence

> An end-to-end platform that fuses **Sentinel-1 SAR slick detection**, **backward/forward Lagrangian drift modelling**, and **AIS vessel history** to trace chronic marine oil pollution back to its most plausible origin, rank suspect vessels, and warn coastal hotspots before the slick arrives.

**Live demo:** [triton-trace.vercel.app](https://triton-trace.vercel.app/)
**Built for:** Smart India Hackathon (SIH) 2026 · Eastern Mediterranean case study

---

## Table of contents

1. [Problem](#problem)
2. [What it does](#what-it-does)
3. [Role-based portals](#role-based-portals)
4. [System architecture](#system-architecture)
5. [Scientific method](#scientific-method)
6. [Data sources](#data-sources)
7. [Demo case study](#demo-case-study)
8. [Tech stack](#tech-stack)
9. [Validation philosophy](#validation-philosophy)
10. [Status and limitations](#status-and-limitations)
11. [References](#references)

---

## Problem

Bilge dumping and unreported discharges are quick, deliberate, and almost impossible to trace to a single vessel after the fact. Evidence is scattered across satellite archives, ocean models, and vessel-tracking feeds, and attribution can take investigators weeks.

TritonTrace turns a **single satellite detection** into an evidentiary starting point:

- **Authorities** get a ranked shortlist of suspect vessels and early warning for at-risk coastlines.
- **Fleet operators and P&I clubs** get a verifiable *alibi* for their own vessels, which supports faster insurance and liability handling and reduces the risk of wrongful detention.

## What it does

| Capability | Description |
|---|---|
| **SAR slick detection and validation** | Slicks are isolated from Sentinel-1 C-SAR backscatter, converted to vector polygons, and checked against the raw scene before anything downstream runs. |
| **In-browser SAR classifier** | A model trained on the real **DARTIS 2019** oil-slick / look-alike dataset (Sentinel-1, Eastern Mediterranean) classifies uploaded SAR patches entirely client-side. |
| **Backward drift hindcast** | A weighted, multi-member Monte Carlo particle ensemble is driven backward from the slick to produce a density surface of candidate origin zones. |
| **Candidate generation and screening** | KD-tree + KDE support maps propose candidate origins at each historical timestamp; each is forward-simulated and scored against the observed slick. |
| **AIS vessel attribution** | Candidate origins are cross-referenced with historical AIS tracks. Vessels are scored on path proximity and timing, producing a ranked top-15 shortlist. |
| **Forward trajectory and hotspot alerts** | A 72-hour hourly forward simulation checks every particle against 11 regional hotspot geofences, escalating each independently to **Watch** (100 km) or **Critical** (40 km). |
| **Alibi Generator and P&I Risk Assessor** | Enterprise tools to clear a vessel by MMSI, or to see which insured vessels are flagged as probable sources, with an estimated-liability tier. |
| **Incident reporting and manual mapping** | Field incident submission (location, severity, photo evidence) and a draw-polygon tool that scans an area for incidents. |

## Role-based portals

The web app uses a role-gated gateway (client-side sandbox authentication for the demo) with separate workspaces:

- **Researchers** (`/portal/normal`) — historical incident feed, SAR classifier, incident reporting, manual polygon mapping, and toggleable telemetry layers (SAR slick polygons, regional alert geofences).
- **Commercial Operator** (`/portal/commercial`) — **Alibi Generator** (select a spill, enter a vessel MMSI, view the backtracked density cluster and AIS route) and **P&I Risk Assessor** (select a club and a spill to see flagged vessels with AIS score, rank, closest encounter, close-encounter count, and estimated liability).
- **Authority / Admin** (`/portal/admin`) — enforcement-facing workspace for investigators, port authorities, and coast guards.

## System architecture

```text
Sentinel-1 SAR scene
        │
        ▼
SAR slick detection ──► polygon validation ──► observation particles
                                                       │
                                                       ▼
                           Stage III: weighted backward Monte Carlo transport
                           (CMEMS currents, surrogate forcing ensemble)
                                                       │
                                                       ▼
                           Phase 2: candidate generation
                           KD-tree → density + weight + pixel-diversity
                           → KDE support map → peaks / cores
                                                       │
                                                       ▼
                           Forward validation of every candidate
                           N_forward = min(X, Y), coherent forcing members
                           → compare predicted slick vs observed slick
                                                       │
                                                       ▼
                           Forward-screened candidate set
                                    │                      │
                                    ▼                      ▼
                        AIS vessel attribution     Forward trajectory (72 h)
                        (ranked top-15)            + hotspot Watch/Critical alerts
                                    │                      │
                                    └────────┬─────────────┘
                                             ▼
                            Web portals (Researcher · Commercial · Authority)
```

## Scientific method

### Stage III — weighted backward Monte Carlo transport

For every observed receptor pixel `j` and forcing member `e`, multiple particles are propagated **backward** from the satellite observation time `t_obs`.

- **Drift velocity:** `U = (uo, vo)` from CMEMS surface currents (windage excluded in Stage III v1).
- **Backward SDE step (Euler–Maruyama):**
  `X_new = X_old + (−U + ∇K)·dt + √(2K·dt)·ξ`, with `ξ ~ N(0, I₂)`.
- **Particle weights:** flow/Jacobian-type correction `log w_new = log w_old − div(U)·dt`.
- **Transport estimate:** `ĉ*_{j,e}(x,t) = (|A_j| / N_j) · Σ_p w_p(t) · K_b(x − X_p*(t))`, with the kernel evaluated in metres.
- **Surrogate forcing ensemble (~50 members):** coherent perturbations built from coarse-grid noise, Ornstein–Uhlenbeck temporal evolution, Gaussian spatial smoothing, and bilinear interpolation.
- **Boundaries:** particles that hit land or leave the data domain are marked invalid at an exact death time, with position and reason recorded.
- **Reuse:** particle-level interpolation between checkpoints answers any historical query without re-running transport.
- **Window:** 48 h prototype, 168 h production target.

### Phase 2 — candidate generation and forward-accuracy filtering

1. **KD-tree neighbourhoods** over distance-safe projected coordinates at each historical timestamp.
2. **Three support signals:** particle density `D`, weighted support `W`, and cross-pixel diversity `V` (distinct observation pixels represented).
3. **KDE / support heat map** → local maxima with near-duplicate suppression → high-support candidate **cores**.
4. **Core sampling:** `N_forward = min(X, Y)` particles, weighted selection without replacement when the core has enough particles, reproducible seed.
5. **Forward propagation** `t_s → t_obs` under coherent forcing members: `X_new = X_old + U_e·dt + √(2K·dt)·ξ`.
6. **Scoring:** predicted slick footprint vs. observed slick footprint (overlap, coverage, false-positive area, spatial distance), averaged across valid members.
7. **Primary filter and ranking:** forward accuracy decides which candidates survive. Backward support explains *why a candidate was proposed*, and forward agreement decides *whether it survives*.

### Forward propagation and hotspot alerting

- **Initial state:** 548 observed slick elements at 2019-04-28 20:35 UTC, propagated 72 hours with 73 hourly states recorded.
- **Physics (OpenOil/OpenDrift surface-drift concept):** `u_oil = uo + 0.03·u10`, `v_oil = vo + 0.03·v10`, Euler advection. No weathering, Stokes drift, or vertical mixing in v1.
- **Exact-time interpolation** between forcing records (particle clock 20:35 vs. CMEMS 20:30/21:30 and ERA5 20:00/21:00).
- **Land-safe NaN handling:** CMEMS masked cells are never zero-filled. A particle on water with NaNs in its stencil uses inverse-distance-weighted valid ocean neighbours (3×3, then 5×5, minimum 4 cells). A particle on land strands permanently. Every lookup is tagged `DIRECT`, `NEIGHBOR_FALLBACK`, `INVALID_ENVIRONMENT`, or `LAND_STRANDED`.
- **Hotspot alerts:** each of the 11 hotspots is evaluated independently at every hourly state using the supplied polygon geometries (22 polygons: a 100 km Watch zone and a 40 km Critical zone per hotspot).

  ```text
  any particle inside 40 km polygon  → CRITICAL (red)
  elif any particle inside 100 km    → WATCH    (yellow)
  else                               → CLEAR
  ```

  Per hotspot and hour, the system records status, minimum particle distance, particle counts per zone, and first Watch / first Critical times.
- **Animation:** a 72-hour slick animation with coastline, all geofences, live hotspot state, and a timestamp on every frame. Any density layer is visualisation only and never changes alert decisions.

**Monitored hotspots:** Port Said (Suez Canal) · Alexandria Port · Vasiliko Oil Terminal · Beirut Port · Ceyhan Oil Terminal · Haifa Port · Akamas Peninsula (Turtle Nesting) · Palm Islands Nature Reserve · Rosh HaNikra Marine Reserve · Nile Delta Coastal Lagoons · Cape Greco MPA

## Data sources

| Data | Purpose | Provider |
|---|---|---|
| Sentinel-1 C-SAR (GRD) | Slick detection and polygon extraction | ESA / Copernicus Open Data |
| DARTIS 2019 | Oil-slick vs. look-alike classifier training | Sentinel-1, Eastern Mediterranean |
| CMEMS physical ocean analysis | Surface currents for backward/forward drift | Copernicus Marine Service |
| ERA5 10 m winds | Wind forcing in the forward drift module | ECMWF / Copernicus |
| Historical AIS tracks | Correlating vessel paths with origin candidates | Marine Cadastre AIS archive |
| Regional alert geofences | Watch / Critical zone polygons | Internal geofence definitions |

## Demo case study

The deployed demo is seeded with two SAR-detected slicks from the Eastern Mediterranean:

| ID | Detected | Estimated area |
|---|---|---|
| `ow-0008` | 14 Jun 2019 | 4.7 km² |
| `ow-0009` | 28 Apr 2019 | 58.6 km² |

For `ow-0009`, the Commercial portal surfaces vessels flagged as probable sources, each with an **AIS score**, a **rank out of 15**, **closest-encounter distance**, **close-encounter count**, and a **tiered liability estimate** that applies a hotspot multiplier.

## Tech stack

- **Frontend:** React single-page app (Vite build), Mapbox GL JS (`dark-v11`), Lucide icons, deployed on **Vercel**
- **In-browser ML:** client-side SAR patch classifier (no server round-trip)
- **Scientific core:** Python, NumPy/SciPy-style numerics, KD-tree spatial indexing, KDE, NetCDF forcing (CMEMS, ERA5), GeoJSON geofences, Jupyter notebooks for validation
- **Reference model:** OpenDrift / OpenOil for forward-drift comparison

## Validation philosophy

Every scientific milestone is checked with:

1. numerical assertions in implementation scripts,
2. controlled synthetic cases with known behaviour,
3. human-inspectable notebooks and artifacts, and
4. an explicit separation between controlled validation and real-data sanity checks.

The pipeline deliberately keeps these quantities distinct and never presents one as another:

```text
backward KDE support  ≠  forward consistency  ≠  formal likelihood  ≠  posterior probability
```

## Status and limitations

- TritonTrace is a **demonstration analytical platform**. Trajectory backcasts and AIS correlation scores are simulated models for operational intelligence and **do not constitute legal determinations of culpability**.
- Stage III forcing-ensemble parameters (≈20 km spatial correlation, 1-day temporal correlation, σ_u = 0.05 m/s, ≈50 members) are **prototype values, not validated** physical constants.
- Phase 2 forward transport is a prototype assumption and is intentionally separate from the frozen Stage III backward mathematics.
- Weathering (evaporation, emulsification, dissolution, biodegradation) and Stokes drift are not modelled in v1.
- Portal authentication is a client-side sandbox mock for demonstration.
- Source claims are conditional on the source age being within the backward window `T_w`.

## References

- [OpenDrift tutorial](https://opendrift.github.io/tutorial.html)
- [OpenOil model reference](https://opendrift.github.io/autoapi/opendrift/models/openoil/openoil/index.html)
- [OpenDrift coastline options](https://opendrift.github.io/gallery/example_coastline_options.html)
- [OpenOil sample output](https://opendrift.github.io/gallery/example_openoil_sample_output.html)
- Copernicus Marine Service (CMEMS) · ESA Copernicus Open Access Hub · ECMWF ERA5 · NOAA Marine Cadastre
