import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
    base: "/",
    server: {
        host: "0.0.0.0", // nur lokale Verbindung
        port: 5173,
    },
    plugins: [
        react()
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
}));
