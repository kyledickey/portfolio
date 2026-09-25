package server

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/kyledickey/portfolio/internal/api"
)

type routesFunc func(gin.IRouter)

func (f routesFunc) Register(r gin.IRouter) { f(r) }

func newHandler(t *testing.T, logs *bytes.Buffer) http.Handler {
	defaultLogger := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(logs, nil)))
	t.Cleanup(func() { slog.SetDefault(defaultLogger) })

	return Handler(Options{
		Site: http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusTeapot)
		}),
		Routes: []Routes{routesFunc(func(r gin.IRouter) {
			r.GET("/boom", func(*gin.Context) { panic("boom") })
		})},
		API: []Routes{api.New()},
	})
}

func TestRouting(t *testing.T) {
	h := newHandler(t, &bytes.Buffer{})
	for path, status := range map[string]int{
		"/api/health": http.StatusOK,
		"/api/nope":   http.StatusNotFound,
		"/api":        http.StatusNotFound,
		"/":           http.StatusTeapot,
		"/apiary":     http.StatusTeapot,
		"/boom":       http.StatusInternalServerError,
	} {
		w := httptest.NewRecorder()
		h.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != status {
			t.Errorf("%s: status = %d, want %d", path, w.Code, status)
		}
	}
}

func TestRequestLogs(t *testing.T) {
	var logs bytes.Buffer
	h := newHandler(t, &logs)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/health?x=1", nil))

	var line map[string]any
	if err := json.Unmarshal(logs.Bytes(), &line); err != nil {
		t.Fatalf("log line %q: %v", logs.String(), err)
	}
	want := map[string]any{
		"level": "INFO", "msg": "request", "method": "GET",
		"path": "/api/health", "query": "x=1", "status": float64(200),
	}
	for key, value := range want {
		if line[key] != value {
			t.Errorf("log %s = %v, want %v", key, line[key], value)
		}
	}
}

func TestPanicLogs(t *testing.T) {
	var logs bytes.Buffer
	h := newHandler(t, &logs)
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/boom", nil))

	lines := strings.Split(strings.TrimSpace(logs.String()), "\n")
	if len(lines) != 2 {
		t.Fatalf("got %d log lines, want panic + request:\n%s", len(lines), logs.String())
	}
	if !strings.Contains(lines[0], `"msg":"panic"`) || !strings.Contains(lines[0], `"error":"boom"`) {
		t.Errorf("panic log = %s", lines[0])
	}
	if !strings.Contains(lines[1], `"level":"ERROR"`) || !strings.Contains(lines[1], `"status":500`) {
		t.Errorf("request log = %s", lines[1])
	}
}
