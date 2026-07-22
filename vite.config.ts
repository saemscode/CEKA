import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // FORCE correct Supabase URL to override any incorrect IDE injections (e.g. from Lovable linking to the Ledger project)
  env.VITE_SUPABASE_URL = "https://iruahxgkrucidihnfytq.supabase.co";
  env.VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlydWFoeGdrcnVjaWRpaG5meXRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNzIxODcsImV4cCI6MjA5ODk0ODE4N30.YRnBeUfjtjvrE7S5l8btwUDELFfKnQCSQQCGZS3BdAA";

  console.log('[ViteConfig] Mode:', mode);
  console.log('[ViteConfig] CWD:', process.cwd());
  console.log('[ViteConfig] Env keys loaded:', Object.keys(env).filter(k => k.startsWith('VITE_')));

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-maps': ['leaflet'],
            'vendor-pdf': ['pdf-parse', 'pdfjs-dist'],
            'vendor-animation': ['lottie-react', 'gsap', 'framer-motion'],
            'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-popover', '@radix-ui/react-tooltip', 'lucide-react']
          }
        }
      }
    },
    // Explicitly define env variables to ensure they're available to the client
    // We map each VITE_ variable individually to ensure maximum compatibility in both Dev and Prod
    define: Object.keys(env).reduce<Record<string, any>>((prev, key) => {
      if (key.startsWith('VITE_')) {
        const value = JSON.stringify(env[key]);
        prev[`process.env.${key}`] = value;
        prev[`import.meta.env.${key}`] = value;
        // Also inject into globalThis for absolute certainty in all contexts
        prev[`globalThis.${key}`] = value;
      }
      return prev;
    }, {
      'process.env': {}
    })

  };
});
