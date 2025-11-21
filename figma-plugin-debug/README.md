# Fragmento Figma Plugin

A Figma plugin that enables seamless synchronization of design tokens between Figma variables and the Fragmento web application.

## Features

- **Authentication**: Secure OAuth-based authentication with your Fragmento account
- **Organization & Project Selection**: Choose which Fragmento project to sync with
- **Variable Import**: Import all Figma variables organized by collections
- **Smart Sync**: Automatically maps Figma collections to Fragmento token sets
- **Conflict Resolution**: Updates existing tokens when values differ
- **Change Tracking**: All synced changes appear in Pending Changes for release creation

## Installation

### Development Setup

1. Clone the repository and navigate to the plugin directory:
```bash
cd figma-plugin
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run build
```

### Installing in Figma

1. Open Figma Desktop App
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select the `manifest.json` file from the `figma-plugin` directory
4. The plugin will appear in your **Plugins** → **Development** section

## Usage

### First Time Setup

1. **Launch Plugin**: Open the Fragmento plugin from the Plugins menu
2. **Authenticate**: Click "Authenticate with Fragmento" to open browser authentication
3. **Sign In**: Complete the authentication flow in your browser
4. **Return to Figma**: The plugin will automatically connect once authenticated

### Syncing Variables

1. **Select Organization**: Choose your organization from the dropdown
2. **Select Project**: Choose the target project for your design tokens
3. **Import Variables**: Click "Import Variables" to load all Figma variables
4. **Review Collections**: Variables are displayed grouped by their collections
5. **Push to Fragmento**: Click "Push to Fragmento" and confirm the sync

### How Sync Works

- **Collection Matching**: Figma collections are mapped to Fragmento token sets by name
- **New Collections**: Collections not found in Fragmento create new token sets
- **Token Updates**: Variables with matching names update existing tokens if values differ
- **Change Tracking**: All changes are recorded in Fragmento's Pending Changes

## Supported Variable Types

- **Color**: RGB values converted to CSS format
- **Number**: Numeric values (dimensions, opacity, etc.)
- **String**: Text values
- **Boolean**: True/false values

## Development

### File Structure

```
figma-plugin/
├── src/
│   ├── plugin/
│   │   └── plugin.ts          # Main plugin logic
│   ├── ui/
│   │   ├── components/        # React components
│   │   ├── App.tsx           # Main app component
│   │   ├── index.tsx         # Entry point
│   │   └── styles.css        # Styles
│   └── types/
│       └── index.ts          # TypeScript definitions
├── dist/                     # Built files
├── manifest.json            # Plugin manifest
└── package.json            # Dependencies
```

### Build Commands

- `npm run build` - Build both plugin and UI
- `npm run build:plugin` - Build plugin code only
- `npm run build:ui` - Build UI code only
- `npm run watch` - Watch mode for development

### API Endpoints

The plugin communicates with these Fragmento API endpoints:

- `GET /auth/figma` - Authentication flow
- `GET /api/organizations` - Fetch user organizations
- `GET /api/organizations/[id]/projects` - Fetch organization projects
- `POST /api/figma/push-tokens` - Push variables to Fragmento

## Authentication Flow

1. Plugin opens browser to `/auth/figma?state=<random>`
2. User completes authentication in Fragmento web app
3. Web app generates JWT token and redirects to `figma://auth-callback`
4. Plugin receives token and stores it securely
5. Token is used for subsequent API calls

## Security

- JWT tokens are used for API authentication
- Tokens are stored securely in Figma's clientStorage
- Tokens expire after 7 days and require re-authentication
- All API calls are made over HTTPS

## Troubleshooting

### Authentication Issues

- **Plugin won't authenticate**: Ensure you're signed in to Fragmento in your browser
- **Token expired**: Re-authenticate by clicking the logout button and signing in again
- **Browser doesn't open**: Check if your default browser is set correctly

### Sync Issues

- **No variables found**: Ensure you have created variables in your Figma file
- **Push fails**: Check that you have the correct permissions for the selected project
- **Variables not updating**: Verify that variable names and values are different from existing tokens

### Development Issues

- **Build fails**: Ensure all dependencies are installed with `npm install`
- **Plugin not loading**: Check that the manifest.json path is correct
- **TypeScript errors**: Run `npm run build` to see detailed error messages

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the Fragmento documentation
3. Contact support through the Fragmento web application

## License

This plugin is part of the Fragmento design token management platform.
