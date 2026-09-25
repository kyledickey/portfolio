import { renderToString } from "react-dom/server";
import { App } from "#/app";

export function render(path: string) {
    return renderToString(<App path={path} />);
}
