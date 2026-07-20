# LinkedIn Job Checker

A deterministic, zero-trust Chrome Extension for verifying application infrastructure, detecting lookalike domains, and auditing data-harvesting operations on job postings.

## Features

* **Boundary Mapping:** Verifies outbound application pathways against a company's actual, verified domain footprint to catch unverified external aggregators.
* **Infrastructure Whitelisting:** Validates routing URLs against an enterprise-grade applicant tracking system (ATS) registry (e.g., Greenhouse, Lever, Ashby, Workday), flagging non-standard pipelines instantly.
* **Domain Age Telemetry:** Cross-references network lookup data with domain registration age to intercept sophisticated lookalike domain spoofing attacks.
* **AI Content Integrity Sub-Workflow:** Concurrently parses job descriptions for fraudulent linguistic indicators and aggressive PII collection tactics—failing safely to an explicit `UNVERIFIED` warning layout if network conditions time out.
* **Execution Trace Log:** Transparent console UI output displaying the precise cryptographic and infrastructure mapping steps taken for every page evaluated.

## Tech Stack

* Manifest V3
* Chrome Extension Architecture
* Vanilla JS (No framework bloat, zero dependency maintenance).

## Architecture & Customization Note

> 🛠️ **Designed for Extensibility:** The core engine is built explicitly as a modular state-machine workflow with integrated async sub-workflows. If you want to adapt this tool to your own use cases—such as auditing SSL certificate paths, checking MX records, or altering the AI prompt matrices for specific industry compliance—you can drop new verification stages straight into the orchestrator execution array without refactoring the underlying pipeline.

## Installation (Developer Mode)

1. Clone this repository (or download the folder).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked** and select this extension folder.

## How it Works

The extension operates as a multi-layered identity and context verification pipeline using a highly structured, state-machine execution sequence:

1. **Scrape Stage (`runScrapeStage`):** Extract the core structural metadata, target employer profile, and application landing points from the active DOM interface.
2. **Resolve Stage (`runResolveDomainStage`):** Handle raw async asynchronous string resolutions to track the outbound destination.
3. **Registry Check Stage (`runRegistryCheckStage`):** Extract historical network footprint telemetry and registration details.
4. **Infrastructure Stage (`runInfrastructureStage`):** Enforce boundary rules against the approved enterprise infrastructure inventory.
5. **AI Analysis Sub-Workflow (`AIAnalysisSubWorkflow`):** Concurrently analyzes the linguistic parameters of the post body to catch text-level anomalies without stalling the network trace layer.
