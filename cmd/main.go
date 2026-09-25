package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/kyledickey/portfolio/internal/api"
	"github.com/kyledickey/portfolio/internal/config"
	"github.com/kyledickey/portfolio/internal/cover"
	"github.com/kyledickey/portfolio/internal/logging"
	"github.com/kyledickey/portfolio/internal/server"
	"github.com/kyledickey/portfolio/internal/site"
)

func main() {
	if err := run(); err != nil {
		slog.Error("exiting", slog.Any("error", err))
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	logger, err := logging.New(os.Stdout, cfg.Log)
	if err != nil {
		return err
	}
	slog.SetDefault(logger)

	web, err := site.New(os.DirFS(cfg.Site.Dir))
	if err != nil {
		return err
	}

	srv := server.New(cfg.Server, server.Options{
		Site: web,
		Routes: []server.Routes{
			cover.New(cfg.Cover.Timeout, cfg.Cover.AllowedHosts),
		},
		API: []server.Routes{
			api.New(),
		},
	})

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return srv.Run(ctx)
}
