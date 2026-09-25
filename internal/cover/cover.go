// Package cover passes album covers through on this origin. Discogs doesn't
// send CORS headers, and without them a canvas can't read the pixels to
// dither them.
package cover

import (
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	client  *http.Client
	allowed map[string]bool
}

func New(timeout time.Duration, allowedHosts []string) *Handler {
	// Only album art hosts, so this can't be used as an open proxy.
	allowed := make(map[string]bool, len(allowedHosts))
	for _, host := range allowedHosts {
		allowed[strings.TrimSpace(host)] = true
	}
	return &Handler{client: &http.Client{Timeout: timeout}, allowed: allowed}
}

func (h *Handler) Register(r gin.IRouter) {
	r.GET("/cover", h.serve)
}

func (h *Handler) serve(c *gin.Context) {
	target, err := url.Parse(c.Query("src"))
	if err != nil || !target.IsAbs() {
		c.String(http.StatusBadRequest, "Bad cover")
		return
	}
	if target.Scheme != "https" || !h.allowed[target.Hostname()] {
		c.String(http.StatusBadRequest, "Not a cover")
		return
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, target.String(), nil)
	if err != nil {
		c.String(http.StatusBadRequest, "Bad cover")
		return
	}
	req.Header.Set("User-Agent", "kyle.so")

	res, err := h.client.Do(req)
	if err != nil {
		slog.WarnContext(c.Request.Context(), "cover fetch failed",
			slog.String("src", target.String()), slog.Any("error", err))
		c.String(http.StatusBadGateway, "Cover unavailable")
		return
	}
	defer res.Body.Close()

	contentType := res.Header.Get("Content-Type")
	if res.StatusCode != http.StatusOK || !strings.HasPrefix(contentType, "image/") {
		slog.WarnContext(c.Request.Context(), "cover upstream rejected",
			slog.String("src", target.String()),
			slog.Int("status", res.StatusCode),
			slog.String("content_type", contentType))
		c.String(http.StatusBadGateway, "Cover unavailable")
		return
	}

	c.Header("Cache-Control", "public, max-age=604800, immutable")
	c.DataFromReader(http.StatusOK, res.ContentLength, contentType, res.Body, nil)
}
