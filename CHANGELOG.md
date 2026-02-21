# Changelog

All notable changes to LXLog will be documented in this file.

## [0.4.2] - 2026-02-21

### Fixed
- Fixed magic sheet rendering bugs.

## [0.4.1] - 2026-02-19

### Added
- **Unified Print Center**: A new centralized hub for selecting and bundling multiple reports (Channel Hookup, Hanging Schedule, Patch, etc.) into a single PDF document.
- **Enhanced Magic Sheets**: better display and ordering, more flexibility options added.
    - **Setup Wizard**: Quickly configure grid dimensions, numbering directions, and display preferences.
    - **Dynamic Grouping**: Group by any field, including user-defined custom fields.
    - **Variable Widths**: Arrange groups in 1/3, 2/3, or Full page widths for more flexible board layouts.
    - **Sub-fixture Support**: Intelligent handling of multi-cell fixtures and part-based channels.
    - **Duplicate Merging**: Option to automatically merge duplicated channels (2-fers) into single visual tiles.
- **Combined Cover Pages**: Reports can now be bundled with a professional cover page for show binders.
- **Flexible Channel Tracking**: Added global settings for channel display (Parts, Dots, Hide/Show Duplicates) that apply across all views and PDF reports.

### Changed
- **PDF Engine Upgrade**: Migrated all report exports to `@react-pdf/renderer` for better layout control and high-fidelity output.
- **Print Branding**: Standardized report headers and footers with customizable show info (Venue, Designer, assistants).
- **Light Theme Reports**: All reports now utilize a forced light theme for printing, ensuring clarity regardless of UI theme.

### Fixed
- Fixed critical crash in Hanging Schedule PDF generation.
- Fixed PDF reports ignoring column visibility and address formatting preferences.

### Added
- **Address Range Visibility**: The Instrument Schedule now displays full DMX ranges (e.g., `1/1–1/4`) for multi-channel fixtures in the Address column.

### Changed
- **Data Integrity**: Session-specific data (EOS targets, GDTF library, and notes) is now automatically cleared when creating a New Show or performing a fresh import.
- **UI Refinements**: 
  - Moved the "Collapse Details" carat button into the detail panel header.
  - Cleaned up redundant "Lightning" and "Close" icons from the detail header.
  - Resized and standardized the "GDTF" population button in the Type field.
  - Repositioned color swatches to prevent obscuring text prefixes.
- **Address Logic**: Standardized and normalized universe separator logic (`:` vs `/`) across the app.

### Fixed
- Fixed "Enter" key accidentally closing the instrument detail panel.
- Fixed critical bug preventing saving and creation of new instruments.

## [0.3.1] - 2026-02-01

### Changed
- **Open Source**: Now available on [GitHub](https://github.com/kaelenfae/LXLog).
- **New Features**:
  - **Power Report**: New report for calculating power loads per circuit/dimmer.
  - **DMX Universe View**: Visual grid view of DMX universes and patching.
  - **Fixture Library**: Added library management for GDTF files and fixture definitions.
- **Deployment**: Changed netlify deployment to live (automatic) instead of manual.
- **Code Quality**: Performed major cleanup (removed unused `ChannelHookup` component, unused state variables, and helpers).
- **Documentation**: Added acknowledgement to Google Antigravity in README and About page.
- **Lightwright Import**: Added database index for `[channel+part]` to fix merge errors.
- **Import Wizard**: Removed MA3 XML import option.
- **MA2 Import**: Verified compatibility with updated merge logic.

## [0.3.0] - 2026-01-24

### Added
- **EOS Targets Report**: New report displaying Groups, Presets, and Subs imported from EOS CSV files.
  - Grid layout with color-coded sections for each target type.
  - Filter dropdown to view specific target types.
  - Conditional sidebar link (only appears when EOS data exists).
- **GPLv3 License**: Project is now open source under GNU General Public License v3.

### Changed
- **EOS CSV Import**: Improved parsing with UUID validation to correctly distinguish target definitions from level data.
- **Import Wizard**: 
  - EOS CSV imports now show field selection for `START_CHANNELS` section (instrument data).
  - Skips field selection for exports without channels (TARGETS-only import).
- **Project Structure**: Moved project files into `LXLog` subfolder for cleaner repository organization.

### Fixed
- Fixed EOS CSV import failing on files without `START_CHANNELS` section.
- Fixed incorrect column indices when parsing Presets and Subs labels.
- Fixed import picking up thousands of START_LEVELS entries instead of actual target definitions.

## [0.2.0] - Previous Release

Initial release with core features.
