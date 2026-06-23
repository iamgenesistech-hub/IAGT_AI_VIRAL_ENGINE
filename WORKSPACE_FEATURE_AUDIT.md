# EVICS Workspace Feature and Button Audit

Date: 2026-06-22
Scope: Executive and affiliate workspace surfaces, stage panels, and linked training/dashboard pages.
Goal: Keep only purposeful controls, remove redundant controls, and flag non-elite/non-functional surfaces for wiring or removal.

## Audit Method
- Reviewed active Next surfaces and component panels.
- Mapped button actions to store methods and backend API routes.
- Checked affiliate dashboard action handlers against backend routes in server.js.
- Reduced scanner and duplicate-action overload in primary operator surfaces.

## Cleanup Applied Now
1. Removed duplicate scanner run buttons outside scanner workspace.
2. Consolidated scanner execution authority to scanner workspace only.
3. Removed legacy workspace shell link from executive Next workspace.
4. Removed duplicate quick-action panel from affiliate Next portal.

## Workspace-by-Workspace Findings

### 1) Next Executive Workspace
File: app/workspace/page.tsx
Status: Functional, simplified.

Buttons and controls:
- Open Affiliate Workspace: KEEP (functional, purposeful).
- Legacy Workspace Shell link: REMOVED (redundant and high-noise alternate shell).

### 2) Next Affiliate Products Workspace (new portal)
File: app/affiliate-products-workspace/page.tsx
Status: Functional with backend-linked actions.

Controls kept:
- Affiliate search, status filter, affiliate selector.
- Save GCS snapshot.
- Product search and create video package.
- Landing page/package preview controls.
- TradeAlgo + board guidance visibility.

Controls removed:
- Duplicate Quick Actions panel (same links already exposed in hero and other sections).

Notes:
- Uses rewrite-backed /api routes.
- Snapshot storage path supports local + GCS when configured.

### 3) Next Command Panel
File: components/workspace/command/CommandPanel.tsx
Status: Functional, scanner controls de-duplicated.

Controls kept:
- Stage metric cards for media/scanners/decisions/evidence navigation.
- Scanner status visibility.

Changed:
- Run Executive Scan button replaced with Open Scanner Workspace.
Reason: scanner execution should not be available from every workspace.

### 4) Next Scanner Panel
File: components/workspace/scanners/ScannerPanel.tsx
Status: Functional and now authoritative scanner control surface.

Controls kept:
- Pause/Enable scanner.
- Run Elite Scan.
- Findings list and recommendations.

Decision:
- KEEP as single scanner execution location.

### 5) Next Agent Rail
File: components/system/AgentRail.tsx
Status: Functional, reduced noise.

Controls kept:
- Open Decisions.
- Logs drawer.

Controls removed:
- Run Elite Scan.
Reason: duplicate scanner trigger.

### 6) VP Panel
File: components/system/VpPanel.tsx
Status: Functional, scanner action routing simplified.

Controls kept:
- Voice start/stop.
- Run Directive.
- Open Command Center.

Changed:
- Scan directive now routes to scanner workspace; it no longer executes a scan directly.
- Removed Run Executive Scan button.

### 7) Legacy Unified Workspace
File: workspace.html
Status: Very feature-heavy, partially redundant with Next shell.

Findings:
- Contains very large multi-stage surface and many controls that overlap Next command/scanner/media/decisions views.
- Still includes scanner-run controls and extensive ops-only workflows.
- Primary overload source for admins.

Decision:
- RETAIN as legacy/advanced fallback only.
- Do not present as primary operator entry.
- Future phase: introduce a strict mode toggle with default workflowStageSet only, hide fullStageSet unless ops unlock is explicit.

### 8) Legacy Affiliate Products Workspace
File: affiliate-products-workspace.html
Status: Mostly functional against existing APIs.

Findings:
- Core product add/activate and affiliate analytics controls map to real backend routes.
- Overlaps with Next affiliate portal now.

Decision:
- RETAIN temporarily for fallback.
- Prefer Next affiliate portal as primary.
- Future phase: remove this page from navigation after parity confirmation.

### 9) Affiliate Dashboard
File: affiliate-dashboard.html
Status: Broadly functional; many controls map to live APIs.

Validated action-to-API coverage includes:
- /api/affiliate/register
- /api/affiliate/stats
- /api/affiliate/update
- /api/affiliate/leaderboard
- /api/affiliate/link
- /api/affiliate/payout/request
- /api/affiliate/avatar/create
- /api/affiliate/avatars
- /api/affiliate/avatar/generate-video
- /api/viral-products
- /api/crypto/market-data

Decision:
- KEEP, but simplify in next pass by hiding rarely used sections until profile/registration is complete.

### 10) EVICS Training and Trading Education
Files: evics-training.html, trading-education.html
Status: Functional training surfaces.

Findings:
- evics-training.html has minimal controls and low clutter.
- trading-education.html has many interactive controls; appears purposeful for education workflow.

Decision:
- KEEP.
- Future phase: align language and tabs with board model (remove Buffett-specific framing where needed).

## Non-Functional or High-Risk Items
1. Legacy workspace complexity risk:
- workspace.html remains the biggest overload vector and includes advanced controls not suited for default admin flow.

2. Local-only command-center store actions:
- Next workspace store actions are local-state heavy and not fully backend-persistent for every control path.
- Risk: behavior can look complete but not survive process restarts for all workflows.

3. Duplicate surfaces:
- Similar capabilities still exist across Next and legacy HTML pages.
- This increases operator confusion and maintenance burden.

## Autonomy Alignment Decisions
1. Scanner orchestration must be centralized to scanner workspace.
2. Command and VP should route to scanner, not directly trigger scans.
3. Primary default operator flow should be:
- command -> scanners -> media -> decisions -> evidence -> insights
4. Legacy advanced surfaces should be hidden from default entry paths.

## Planned Next Cleanup Phase (Recommended)
1. Add role/age access model:
- minor profile (13-17) with parent consent required.
- product filters for minor-safe catalog.
- executive toggle for adult-catalog access by account.

2. Add autonomous mode controls in one place only:
- run mode, daily render target, stop condition, continuous mode.
- remove duplicated mode toggles from secondary panels.

3. Reduce affiliate dashboard overload:
- progressive disclosure (basic mode vs advanced mode).
- hide wallet/trading/advanced automation until account setup complete.

4. Decommission duplicate legacy pages from nav once parity is complete.

## Files Changed In This Audit Pass
- app/workspace/page.tsx
- app/affiliate-products-workspace/page.tsx
- components/workspace/command/CommandPanel.tsx
- components/system/AgentRail.tsx
- components/system/VpPanel.tsx
