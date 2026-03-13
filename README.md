# Nexus Command Center

A high-performance, real-time command center dashboard built with React 19 and Vite 8. This application features interactive 3D and 2D geospatial visualizations, real-time system metrics, and routing capabilities using the MapToolkit API.

![Dashboard Preview](./public/favicon.svg) <!-- Consider adding a screenshot here -->

## Features

- **Interactive Maps**: Toggle between a 3D WebGL globe (`react-globe.gl`) and a 2D topological map (`react-simple-maps`).
- **Real-Time Analytics**: Monitor global connectivity, system throughput (via `recharts`), and regional activity.
- **Node Diagnostics**: Inspect individual server nodes for latency, packet loss, and geographic data.
- **FastRouting & Geocoding**: Utilize the MapToolkit API to reverse-geocode node coordinates and calculate real-world routing and latency between global datacenters.
- **System Logs**: Live-streaming feed of critical, warning, and informational system events.
- **Neon UI/UX**: Custom "glassmorphism" design system powered by Tailwind CSS 4 and Lucide React icons.
- **Optimized Performance**: Code-splitting with Vite/Rolldown manual chunks, React.lazy/Suspense for the 3D globe, and strict PropType validations.
- **Accessible & SEO Ready**: Full ARIA support for interactive elements and customized document meta tags.

## Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Maps**: [react-globe.gl](https://github.com/vasturiano/react-globe.gl), [react-simple-maps](https://www.react-simple-maps.io/)
- **Charts**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API**: [MapToolkit](https://maptoolkit.net/) (Proxied via Vite to prevent CORS)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or pnpm
- A [MapToolkit API Key](https://maptoolkit.net/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/nexus-command-center.git
   cd nexus-command-center
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy `.env.example` to `.env` and add your MapToolkit API key:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

## Architecture & Services

### MapToolkit Proxy
Due to browser CORS restrictions, direct calls to the MapToolkit API are proxied through the Vite server. This is configured in `vite.config.js` and applies to both the `dev` and `preview` servers. The `src/services/maptoolkit.js` handles the relative path routing utilizing `import.meta.env` for secure token injection.

### Mock Data Engine
The application currently uses a robust mock data generator (`src/hooks/useMockData.js`) that simulates traffic, logs, and fluctuating latency across ~150 global nodes based on real-world datacenter locations.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production (with automated chunking).
- `npm run preview`: Bootstraps a local server to preview the production build.
- `npm run lint`: Runs ESLint across the codebase to ensure code quality.
- `node test_script.cjs`: Runs a basic Puppeteer E2E script to verify canvas mounting and node interaction.