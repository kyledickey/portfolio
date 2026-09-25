package logging

import (
	"fmt"
	"io"
	"log/slog"
	"strings"

	"github.com/kyledickey/portfolio/internal/config"
)

func New(w io.Writer, cfg config.LogConfig) (*slog.Logger, error) {
	var level slog.Level
	if err := level.UnmarshalText([]byte(cfg.Level)); err != nil {
		return nil, fmt.Errorf("LOG_LEVEL: %w", err)
	}
	opts := &slog.HandlerOptions{Level: level}

	switch strings.ToLower(cfg.Format) {
	case "json":
		return slog.New(slog.NewJSONHandler(w, opts)), nil
	case "text", "":
		return slog.New(slog.NewTextHandler(w, opts)), nil
	default:
		return nil, fmt.Errorf("LOG_FORMAT %q must be text or json", cfg.Format)
	}
}
