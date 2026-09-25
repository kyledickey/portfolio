import { Home } from "#/pages/home";
import { NotFound } from "#/pages/not-found";

export function App({ path }: { path: string }) {
    return path === "/" ? <Home /> : <NotFound />;
}
