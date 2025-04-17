# Guide: {{TASK_DESCRIPTION}}

**(Generated on: {{ GENERATION_DATE }})**

**High-Level Summary:**
This guide provides the **exact, mandatory steps** to implement "{{TASK_DESCRIPTION}}". You are an agent executing this plan. The process emphasizes **rapid iteration, constant verification, and forward momentum.**

**Core Principles:**

- **Strict Order:** Follow steps precisely. No deviations.
- **Attempt Tracking (for Code/Test Steps):**
  - Announce **"Attempt 1"** when starting a code implementation or testing step.
  - If verification fails, announce **"Attempt 2"**, analyze the failure, make corrections, and re-verify.
  - If verification fails again, announce **"Attempt 3"**, make final corrections, and re-verify.
  - **If verification fails on Attempt 3, STOP.** Announce the persistent failure (e.g., "Verification failed after 3 attempts. The current approach may be flawed.") and recommend reconsidering the plan. **Do not proceed with the failed step.**
- **Mandatory Verification:** Meticulously verify at each stage _as instructed_. **Do NOT proceed to the next action (especially commit) if verification fails** (respecting the 3-attempt limit). Successful verification signals forward progress.
- **Commit Discipline:** Commit _only_ when instructed, using the specified format, and _only after successful verification_.
- **Complete All Steps:** Finish the entire sequence as laid out.

**Your Goal:** Execute this plan efficiently, demonstrating progress through successful verification at each step. Strict adherence is crucial for quality and traceability.

_(Note: Adapt package manager commands like `pnpm run ...` or `npm test` to match your project's setup: `npm`, `yarn`, or `pnpm`.)_

---
