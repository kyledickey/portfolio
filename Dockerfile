FROM oven/bun:1 AS web
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM golang:1.27 AS server
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd cmd
COPY internal internal
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /portfolio ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=server /portfolio /app/portfolio
COPY --from=web /app/dist /app/dist
ENV SITE_DIR=/app/dist LOG_FORMAT=json
EXPOSE 8080
ENTRYPOINT ["/app/portfolio"]
