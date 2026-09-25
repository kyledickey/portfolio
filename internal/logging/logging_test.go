package logging

import (
	"bytes"
	"strings"
	"testing"

	"github.com/kyledickey/portfolio/internal/config"
)

func TestNew(t *testing.T) {
	var out bytes.Buffer
	logger, err := New(&out, config.LogConfig{Level: "warn", Format: "json"})
	if err != nil {
		t.Fatal(err)
	}
	logger.Info("hidden")
	logger.Warn("shown")
	if got := out.String(); strings.Contains(got, "hidden") || !strings.Contains(got, `"msg":"shown"`) {
		t.Errorf("output = %q", got)
	}
}

func TestNewRejectsBadConfig(t *testing.T) {
	for _, cfg := range []config.LogConfig{
		{Level: "loud", Format: "text"},
		{Level: "info", Format: "xml"},
	} {
		if _, err := New(&bytes.Buffer{}, cfg); err == nil {
			t.Errorf("New accepted %+v", cfg)
		}
	}
}
