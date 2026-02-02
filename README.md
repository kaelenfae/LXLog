# LXLog

Lighting Database and Logger application built with React, Vite, and Electron.

## Features

- **Instrument Schedule**: Manage your lighting rig with a searchable, sortable database.
- **Reports**: Generate automated reports including:
  - Channel Hookup
  - Hanging Schedule
  - Magic Sheet
  - Patch
  - Equipment List
  - Cutting List
  - EOS Targets (Groups, Presets, Subs)
- **Import/Export**: 
  - Import from EOS CSV, Lightwright Text, and MA2/MA3 XML.
  - Export to PDF and CSV.

## Development

### Prerequisites

- Node.js (v18+)
- npm

### Setup

```bash
# Install dependencies
npm install

# Run in browser mode
npm run dev

# Run in Electron mode
npm run electron:dev
```

## Build

```bash
# Build for production
npm run electron:build
```

## License

Proprietary - LXLog Team

## Acknowledgements

Created with the help of [Google Antigravity](https://deepmind.google/technologies/antigravity/).
