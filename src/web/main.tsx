import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import "./styles.css";
import "./i18n";
import App from "./app.tsx";

createRoot(document.getElementById("root")!).render(
        <StrictMode>
                <Router>
                        <App />
                </Router>
        </StrictMode>,
);
