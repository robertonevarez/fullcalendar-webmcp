import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "temporal-polyfill/global";
import App from "./App";
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/breezy/theme.css";
import "@fullcalendar/react/themes/breezy/palettes/emerald.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
