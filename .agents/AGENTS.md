## MR CAPSULES Styling Architecture
When building or refactoring UI components for MR CAPSULES utility subpages (e.g., admin.html, live.html, docs.html):
1. **Core Structural Match**: Always adopt the core aesthetic of the main page (`index.html`). This means using stark contrast (e.g., `border: 1.5px solid var(--text-main)`), rounded corners (`border-radius: 8px` for cards, `99px` for primary buttons), and the established font hierarchy (`Times New Roman` for headers, `Courier New` for data).
2. **Exclude FX**: Explicitly EXCLUDE the main page's landing flow effects from utility pages. Do NOT implement SVG noise, scanlines, glitch animations, flickering, or the unique landing-page auth modal on subpages. Utility pages must remain performant and readable.
3. **Single Source of Truth**: All component styling (containers, backgrounds, cards, modals, fonts, buttons, contrast) must be managed from a single unified CSS file, ensuring all modes share the exact same structural foundation.
