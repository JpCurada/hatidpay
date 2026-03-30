import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Check if URL is present to prevent blank screen crash
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.error("CRITICAL ERROR: VITE_CONVEX_URL is missing. Please check your .env file.");
}

const convex = new ConvexReactClient(convexUrl || "http://localhost:5173"); // Fallback to avoid crash

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>,
)
