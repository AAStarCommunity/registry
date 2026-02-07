import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log('🔹 Loaded Env Keys:', Object.keys(env).filter(k => k.includes('RPC')));
  console.log('🔹 Mode:', mode);
  
  // Strategy: Rewrite RPC URL to use local proxy in frontend
  // This prevents leaking the real API Key, and leverages api/rpc-proxy.ts
  if (mode === 'development' || mode === 'production') {
     // Overwrite the frontend's view of this variable to point to the proxy
     // The REAL url remains in process.env for the Vercel function to use
     env.SEPOLIA_RPC_URL = "/api/rpc-proxy"; 
     console.log('🔒 Rewriting SEPOLIA_RPC_URL to /api/rpc-proxy for frontend security');
  }
  
  // Filter environment variables to prevent leaking secrets
  const publicEnv = Object.keys(env).reduce((acc, key) => {
    const isSafe = 
      key.startsWith('VITE_') || 
      [
        'NETWORK', 'CHAIN_ID', 'SEPOLIA_RPC_URL', 'OP_SEPOLIA_RPC_URL', 'RPC_URL', 
        'CONTRACT_SRC_HASH', 'REGISTRY', 'GTOKEN', 'STAKING', 'SBT', 'REPUTATION_SYSTEM', 
        'SUPER_PAYMASTER', 'PAYMASTER_FACTORY', 'PAYMASTER_V4_IMPL', 'XPNTS_FACTORY', 
        'BLS_AGGREGATOR', 'BLS_VALIDATOR', 'DVT_VALIDATOR', 'ENTRY_POINT', 'APNTS'
      ].includes(key);
      
    if (isSafe && !key.includes('KEY') && !key.includes('SECRET') && !key.includes('MNEMONIC')) {
      acc[key] = env[key];
    }
    return acc;
  }, {} as Record<string, string>);

  // Create explicit definitions for each key to ensure they are replaced statically
  // This avoids conflicts with vite-plugin-node-polyfills which might reset process.env at runtime
  const defineEnv: Record<string, string> = {
    'process.env.SEPOLIA_RPC_URL': JSON.stringify("/api/rpc-proxy"), // Force Proxy
    'process.env.OP_SEPOLIA_RPC_URL': JSON.stringify("/api/rpc-proxy"), // Force Proxy
    'process.env.NETWORK': JSON.stringify(env.VITE_NETWORK || 'sepolia'), // Map VITE_NETWORK to SDK NETWORK
    'process.env.CHAIN_ID': JSON.stringify(env.VITE_CHAIN_ID || '11155111'), // Default to Sepolia ID
  };

  // Add other safe variables
  Object.keys(publicEnv).forEach(key => {
    if (key !== 'SEPOLIA_RPC_URL' && key !== 'OP_SEPOLIA_RPC_URL') {
        defineEnv[`process.env.${key}`] = JSON.stringify(publicEnv[key]);
    }
  });

  return {
    define: defineEnv,
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Vercel dev server
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor code by package
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Ethers.js - large library
            if (id.includes('ethers')) {
              return 'ethers';
            }
            // Other node_modules
            return 'vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1000kb
    chunkSizeWarningLimit: 1000,
  },
  };
});
