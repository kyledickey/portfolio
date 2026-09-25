import { readFile, rm, writeFile } from "node:fs/promises";

const DIST = "dist";
const SERVER = "dist-server";

const { render } = (await import(`../${SERVER}/entry-server.js`)) as {
    render: (path: string) => string;
};
const template = await readFile(`${DIST}/index.html`, "utf8");

const pages = { "/": "index.html", "/404": "404.html" };
for (const [path, file] of Object.entries(pages)) {
    // React puts preloads it discovers (like the first film poster) ahead of
    // the markup; they belong in the head.
    let preloads = "";
    const app = render(path).replace(/^(<link [^>]*\/>)+/, (links) => {
        preloads = links;
        return "";
    });
    const html = template
        .replace("</head>", () => `${preloads}</head>`)
        .replace("<!--app-->", () => app);
    await writeFile(`${DIST}/${file}`, html);
    console.log(`prerendered ${path} -> ${DIST}/${file}`);
}

await rm(SERVER, { recursive: true });
