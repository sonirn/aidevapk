# AI APK to Dev Converter

A powerful Next.js application that converts APK files to development-ready projects using AI assistance.

## Features

- 🔄 APK to development project conversion
- 🤖 AI-powered code analysis and assistance
- 🛠️ Auto-fix system for common issues
- 📊 System monitoring and health checks
- 🗄️ Database integration with Neon/Supabase
- 🚀 One-click deployment to Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- A Neon database
- A Supabase project
- An OpenAI API key

### Installation

1. Clone the repository:
\`\`\`bash
git clone <your-repo-url>
cd aiapktodev
\`\`\`

2. Install dependencies:
\`\`\`bash
pnpm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

Fill in your environment variables in `.env.local`.

4. Set up the database:
Run the SQL script in `scripts/create-database-tables.sql` in your Neon database.

5. Start the development server:
\`\`\`bash
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy!

The project is configured with `vercel.json` for optimal deployment settings.

### Environment Variables

Make sure to set all required environment variables in your Vercel project settings:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `VERCEL_ACCESS_TOKEN` (optional, for deployment features)
- `VERCEL_REPO_ID` (optional, for deployment features)

## Project Structure

- `/app` - Next.js App Router pages and API routes
- `/components` - React components
- `/lib` - Utility functions and configurations
- `/server` - Server-side APK processing logic
- `/scripts` - Database setup scripts
- `/hooks` - Custom React hooks

## Technologies Used

- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL
- **Authentication & Storage**: Supabase
- **AI**: OpenAI GPT-4
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel

## License

MIT License
