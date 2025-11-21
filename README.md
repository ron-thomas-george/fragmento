# Fragmento

A comprehensive design token management platform that bridges the gap between design (Figma) and development (GitHub). Fragmento enables teams to maintain a single source of truth for design tokens with versioning, multi-platform export, and seamless collaboration workflows.

## Features

- **🎨 Figma Integration**: Sync variables from Figma to your token system
- **📦 Token Management**: Organize tokens in sets with referencing capabilities
- **🔄 Version Control**: Release management with semantic versioning
- **🚀 GitHub Integration**: Automated token export to repositories
- **💬 Slack Integration**: Real-time notifications for releases
- **👥 Team Collaboration**: Role-based access and project management
- **🎯 shadcn/ui Export**: Optimized token export for modern UI libraries

## Architecture

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **UI Components**: shadcn/ui with Radix UI primitives
- **Charts**: Recharts for analytics and visualizations
- **Figma Plugin**: Vanilla JavaScript for optimal performance

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- GitHub account (for deployment)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ron-thomas-george/fragmento.git
cd fragmento
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
JWT_SECRET=your_jwt_secret_key
```

4. **Run database migrations**
```bash
# Set up your Supabase database using the provided schema
# Import supabase.schema.sql into your Supabase project
```

5. **Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Figma Plugin

The Figma plugin is located in the `figma-plugin/` directory. To use it:

1. **Build the plugin**
```bash
cd figma-plugin
npm install
npm run build
```

2. **Install in Figma**
- Open Figma Desktop App
- Go to Plugins → Development → Import plugin from manifest
- Select `figma-plugin/manifest.json`

3. **Usage**
- Authenticate with your Fragmento account
- Select organization and project
- Import variables from Figma
- Push changes to your web app

## Deployment

### Deploy to Vercel

1. **Push to GitHub** (if not already done)
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Deploy to Vercel**
- Go to [vercel.com](https://vercel.com)
- Click "New Project"
- Import your GitHub repository
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
  - `JWT_SECRET`
- Deploy!

The `vercel.json` configuration is already set up for optimal deployment.

## Project Structure

```
fragmento/
├── src/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # Reusable UI components
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utilities and configurations
├── figma-plugin/               # Figma plugin source code
├── supabase/                   # Database migrations
├── public/                     # Static assets
└── docs/                       # Documentation
```

## API Routes

- `POST /api/auth/figma` - Figma plugin authentication
- `GET /api/organizations` - User organizations
- `GET /api/organizations/[id]/projects` - Organization projects
- `POST /api/figma/push-tokens` - Push tokens from Figma
- `POST /api/slack/notify` - Slack notifications
- `POST /api/slack/test` - Test Slack integration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the [documentation](./docs)
- Contact the development team
