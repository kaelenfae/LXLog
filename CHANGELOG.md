# Changelog

All notable changes to LXLog will be documented in this file.

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
