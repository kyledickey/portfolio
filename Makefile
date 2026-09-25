BIN := bin/portfolio

.PHONY: dev build build-web build-server serve test test-go test-web clean

dev:
	./scripts/dev.sh

build: build-web build-server

build-web:
	bun run build

build-server:
	go build -trimpath -o $(BIN) ./cmd

serve: build
	./$(BIN)

test: test-go test-web

test-go:
	test -z "$$(gofmt -l .)" || (gofmt -l . && exit 1)
	go vet ./...
	go test -race ./...

test-web:
	bun run check
	bun run typecheck
	bun run test

clean:
	rm -rf bin dist dist-server
