package config

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoadDefaults(t *testing.T) {
	cfg, err := Load(filepath.Join(t.TempDir(), "missing.env"))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Server.Port != 8080 {
		t.Errorf("Server.Port = %d, want 8080", cfg.Server.Port)
	}
	if cfg.Site.Dir != "dist" {
		t.Errorf("Site.Dir = %q, want dist", cfg.Site.Dir)
	}
	if len(cfg.Cover.AllowedHosts) != 2 {
		t.Errorf("Cover.AllowedHosts = %v, want the two defaults", cfg.Cover.AllowedHosts)
	}
}

func TestLoadFile(t *testing.T) {
	file := filepath.Join(t.TempDir(), ".env")
	body := "PORT=3001\nHOST=127.0.0.1\nREAD_TIMEOUT=2s\nLOG_FORMAT=json\n"
	if err := os.WriteFile(file, []byte(body), 0o600); err != nil {
		t.Fatal(err)
	}
	// godotenv sets these for the process; clear them after.
	for _, key := range []string{"PORT", "HOST", "READ_TIMEOUT", "LOG_FORMAT"} {
		t.Setenv(key, "")
		os.Unsetenv(key)
	}

	cfg, err := Load(file)
	if err != nil {
		t.Fatal(err)
	}
	if got := cfg.Server.Addr(); got != "127.0.0.1:3001" {
		t.Errorf("Server.Addr() = %q, want 127.0.0.1:3001", got)
	}
	if cfg.Server.ReadTimeout != 2*time.Second {
		t.Errorf("Server.ReadTimeout = %v, want 2s", cfg.Server.ReadTimeout)
	}
	if cfg.Log.Format != "json" {
		t.Errorf("Log.Format = %q, want json", cfg.Log.Format)
	}
}

func TestLoadEnvironmentWins(t *testing.T) {
	file := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(file, []byte("PORT=3001\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PORT", "4000")

	cfg, err := Load(file)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Server.Port != 4000 {
		t.Errorf("Server.Port = %d, want 4000", cfg.Server.Port)
	}
}

func TestLoadRejectsBadPort(t *testing.T) {
	t.Setenv("PORT", "70000")
	if _, err := Load(filepath.Join(t.TempDir(), "missing.env")); err == nil {
		t.Error("Load accepted PORT=70000")
	}
}
