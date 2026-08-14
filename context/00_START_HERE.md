# Bird Flock Project: Complete Handoff Package

## EN — Start Here

This package contains everything needed to continue the hand-drawn bird flock animation project and the Bird Motion Mapper tool. The two held client-approved directions are duplicated in `approved/`; the full creative history, source contours, renderers, packaging commands, and browser inspection scripts live in `animation_workspace/birds_exact_pixels/`.

> **Creative state:** Keep the calm symmetric flock and the dramatic dive-curl flock. The next video must be a page-specific “wow” treatment driven by a Bird Motion Mapper brief, not a revision of either held asset.

| Priority | Folder | Status | Purpose |
| --- | --- | --- | --- |
| 1 | `approved/held_symmetric/` | Held | Calm, balanced symmetric flock. |
| 2 | `approved/dive_curl/` | Held | High-motion dive, curl, and upward pullout flock. |
| 3 | `animation_workspace/birds_exact_pixels/` | Production source | Full art, code, scripts, reviews, and exploration history. |
| 4 | `mapper_project/` | Working tool | Static React Bird Motion Mapper and live-page bookmarklet overlay. |
| 5 | `context/` | Operating brief | Prompts, decisions, asset status, target-page details, and continuation rules. |

## ES — Comenzar Aquí

Este paquete contiene todo lo necesario para continuar el proyecto de animación de aves dibujadas a mano y la herramienta Bird Motion Mapper. Las dos direcciones aprobadas por el cliente están duplicadas en `approved/`; el historial creativo completo, los contornos fuente, renderizadores, comandos de empaquetado e inspección en navegador están en `animation_workspace/birds_exact_pixels/`.

> **Estado creativo:** Conservar la bandada simétrica calma y la bandada dramática de picada y rizo. El próximo video debe ser un tratamiento “wow” específico para una página, guiado por un brief de Bird Motion Mapper, sin modificar estos dos activos.

## Non-Negotiable Rules / Reglas No Negociables

| Requirement | Required behavior |
| --- | --- |
| Artist style | Use C/A/B/D extracted artist contours only. Never replace them with realistic, filled, cartoon, or generated birds. |
| Direction | Birds face and fly leftward unless a future page brief explicitly changes it. |
| Wings | **Every visible bird flaps.** Use the center-notch rig in `flock_rig.py`; never use a door-hinge swing. |
| Flock | One coordinated group around a continuous route, not independent crossings or static target shapes. |
| Transparency | Web: VP9 WebM alpha. Editing: ProRes 4444 alpha. Review: white-background MP4. |
| Loop | Empty alpha at beginning and end. |
| Inspection | Chromium full playback and close-interval full-wing proof are mandatory before delivery. |

## Held Deliverables / Entregables Retenidos

| Treatment | Website file | Editing master | Review |
| --- | --- | --- | --- |
| Symmetric | `approved/held_symmetric/symmetric_murmuration_final_transparent.webm` | `..._prores4444.mov` | `..._review.mp4` |
| Dive Curl | `approved/dive_curl/dive_curl_murmuration_transparent.webm` | `..._prores4444.mov` | `..._review.mp4` |

## Do Not Deliver / No Entregar

Do **not** deliver `murmuration_flash_*`, `murmuration_split_*`, or the prior static `murmuration_ribbon_*` outputs. They produced static or near-static formations and failed the visible flight/full-wing requirements. They remain only as historical experiments inside the animation workspace.

## Reproduce or Continue / Reproducir o Continuar

```bash
cd animation_workspace/birds_exact_pixels

# Held calm baseline
python3 render_symmetric_murmuration.py

# Held high-motion dive/curl treatment
python3 render_dive_curl_murmuration.py
```

For a new page-specific treatment, start from the existing moving/flapping rig above, not from `murmuration_engine.py` static formation experiments.

## Mandatory Inspection / Inspección Obligatoria

```bash
cd animation_workspace/birds_exact_pixels
node capture_murmuration_playback.cjs dive_curl_murmuration
python3 make_murmuration_contact_sheet.py dive_curl_murmuration
node capture_flap_proof.cjs dive_curl_murmuration
python3 make_flap_proof_sheet.py dive_curl_murmuration
```

Reject any render where the entire flock does not travel, small birds become static, only the first few birds flap, wings hinge at one side, a fake ring forms, or the movement covers page cards and CTAs.

## Bird Motion Mapper / Mapper de Movimiento

```bash
cd mapper_project
pnpm install
pnpm check
pnpm dev
node test-mapper-workflow.mjs
```

The mapper records normalized anchors and drawn flock paths. Use its exported JSON and visual map as the spatial source of truth for a site-specific animation. It was tested on the PPM target page described in `context/PPM_TEST_TARGET.md`.

## Directory Map / Mapa de Directorios

```text
Bird_Flock_Project_Handoff_2026-08-13/
├── 00_START_HERE.md
├── approved/                     # Held client-approved asset packages
├── source_art/                   # Original art and normalized source contours
├── animation_workspace/          # Full production source and history
├── mapper_project/               # Tested Bird Motion Mapper source
├── generated_assets/             # Mapper logo and visual assets
├── context/                      # Prompt, decisions, status, and PPM target notes
├── qa/                           # Browser playback and wing proof contact sheets
└── archive_failed_experiments/   # Explicitly rejected prior static variants
```
