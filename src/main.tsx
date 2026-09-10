import { createRoot } from "react-dom/client";
import App from "./app.tsx";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root is missing from index.html.");

createRoot(rootElement).render(<App />);
