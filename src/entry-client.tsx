import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "#/app";
import "#/styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");

const app = <App path={window.location.pathname} />;

if (root.firstElementChild) {
    hydrateRoot(root, app);
} else {
    createRoot(root).render(app);
}
