# Portfolio v11

[kyle.so](https://kyle.so), a React site served by a Go (gin) server.

```sh
bun install
cp .env.example .env
make dev
```

`make dev` runs Vite on port 3000 with hot reload, and proxies `/cover` and
`/api` to the Go server on `PORT`. `make serve` builds everything and runs the
production binary, which serves the site itself. Run `make test` before
committing.

The build prerenders each page to HTML (`scripts/prerender.ts`), so the Go
server only serves files: `index.html` at `/`, `404.html` for unknown paths.

- `cmd/main.go` wires the server together from `.env` config.
- `internal/` holds the server packages: `config`, `logging`, `middleware`,
  `server`, `site` (the built frontend), `cover` (album art proxy), and `api`
  (JSON endpoints under `/api`).
- `src/pages` holds page composition, `src/components` interactive UI, and
  `src/lib` project/film data, pixel drawing, and print patterns.

`Dockerfile` builds the image Railway deploys.
