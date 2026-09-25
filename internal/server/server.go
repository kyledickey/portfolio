package server

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/kyledickey/portfolio/internal/config"
	"github.com/kyledickey/portfolio/internal/middleware"
)

type Routes interface {
	Register(gin.IRouter)
}

type Options struct {
	Site   http.Handler
	Routes []Routes
	API    []Routes
}

type Server struct {
	http *http.Server
	cfg  config.ServerConfig
}

func init() {
	gin.SetMode(gin.ReleaseMode)
}

func New(cfg config.ServerConfig, opts Options) *Server {
	return &Server{
		http: &http.Server{
			Addr:         cfg.Addr(),
			Handler:      Handler(opts),
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
			ErrorLog:     slog.NewLogLogger(slog.Default().Handler(), slog.LevelError),
		},
		cfg: cfg,
	}
}

func Handler(opts Options) http.Handler {
	engine := gin.New()
	// kyle.so sits behind Cloudflare, which sends the visitor's real IP.
	engine.TrustedPlatform = gin.PlatformCloudflare
	// Logger goes outside Recovery so panicked requests still get logged.
	engine.Use(middleware.Logger(), middleware.Recovery())

	for _, routes := range opts.Routes {
		routes.Register(engine)
	}
	api := engine.Group("/api")
	for _, routes := range opts.API {
		routes.Register(api)
	}

	engine.NoRoute(func(c *gin.Context) {
		if c.Request.URL.Path == "/api" || strings.HasPrefix(c.Request.URL.Path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
		if opts.Site == nil {
			c.Status(http.StatusNotFound)
			return
		}
		opts.Site.ServeHTTP(c.Writer, c.Request)
	})
	return engine
}

func (s *Server) Run(ctx context.Context) error {
	errs := make(chan error, 1)
	go func() {
		slog.Info("listening", slog.String("addr", s.http.Addr))
		errs <- s.http.ListenAndServe()
	}()

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down", slog.Duration("timeout", s.cfg.ShutdownTimeout))
	shutdownCtx, cancel := context.WithTimeout(context.Background(), s.cfg.ShutdownTimeout)
	defer cancel()
	if err := s.http.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-errs; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}
