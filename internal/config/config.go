package config

import (
	"errors"
	"fmt"
	"io/fs"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	Server ServerConfig
	Site   SiteConfig
	Cover  CoverConfig
	Log    LogConfig
}

type ServerConfig struct {
	Host            string        `env:"HOST"`
	Port            int           `env:"PORT" envDefault:"8080"`
	ReadTimeout     time.Duration `env:"READ_TIMEOUT" envDefault:"10s"`
	WriteTimeout    time.Duration `env:"WRITE_TIMEOUT" envDefault:"30s"`
	ShutdownTimeout time.Duration `env:"SHUTDOWN_TIMEOUT" envDefault:"10s"`
}

func (s ServerConfig) Addr() string {
	return fmt.Sprintf("%s:%d", s.Host, s.Port)
}

type SiteConfig struct {
	Dir string `env:"SITE_DIR" envDefault:"dist"`
}

type CoverConfig struct {
	AllowedHosts []string      `env:"COVER_ALLOWED_HOSTS" envDefault:"i.discogs.com,i.scdn.co"`
	Timeout      time.Duration `env:"COVER_TIMEOUT" envDefault:"10s"`
}

type LogConfig struct {
	Level  string `env:"LOG_LEVEL" envDefault:"info"`
	Format string `env:"LOG_FORMAT" envDefault:"text"`
}

func Load(files ...string) (Config, error) {
	if len(files) == 0 {
		files = []string{".env"}
	}
	for _, file := range files {
		if err := godotenv.Load(file); err != nil && !errors.Is(err, fs.ErrNotExist) {
			return Config{}, fmt.Errorf("load %s: %w", file, err)
		}
	}

	var cfg Config
	if err := env.Parse(&cfg); err != nil {
		return Config{}, fmt.Errorf("parse env: %w", err)
	}
	if cfg.Server.Port < 1 || cfg.Server.Port > 65535 {
		return Config{}, fmt.Errorf("PORT %d is out of range", cfg.Server.Port)
	}
	return cfg, nil
}
