package cover

import (
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

type transport func(*http.Request) (*http.Response, error)

func (f transport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func respond(status int, contentType, body string) transport {
	return func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode:    status,
			Header:        http.Header{"Content-Type": {contentType}},
			Body:          io.NopCloser(strings.NewReader(body)),
			ContentLength: int64(len(body)),
		}, nil
	}
}

func get(t *testing.T, upstream transport, src string) *httptest.ResponseRecorder {
	t.Helper()
	h := New(time.Second, []string{"i.discogs.com", "i.scdn.co"})
	h.client.Transport = upstream
	engine := gin.New()
	h.Register(engine)
	w := httptest.NewRecorder()
	engine.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/cover?src="+url.QueryEscape(src), nil))
	return w
}

func TestServesAllowedImage(t *testing.T) {
	var fetched *http.Request
	client := transport(func(r *http.Request) (*http.Response, error) {
		fetched = r
		return respond(http.StatusOK, "image/jpeg", "jpeg bytes")(r)
	})

	w := get(t, client, "https://i.discogs.com/a.jpg")

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	if w.Body.String() != "jpeg bytes" {
		t.Errorf("body = %q", w.Body.String())
	}
	if got := w.Header().Get("Content-Type"); got != "image/jpeg" {
		t.Errorf("Content-Type = %q", got)
	}
	if got := w.Header().Get("Cache-Control"); !strings.Contains(got, "immutable") {
		t.Errorf("Cache-Control = %q", got)
	}
	if got := fetched.Header.Get("User-Agent"); got != "kyle.so" {
		t.Errorf("upstream User-Agent = %q", got)
	}
}

func TestRejects(t *testing.T) {
	never := transport(func(*http.Request) (*http.Response, error) {
		t.Fatal("fetched a rejected cover")
		return nil, nil
	})
	for _, src := range []string{
		"",
		"not a url",
		"http://i.discogs.com/a.jpg",
		"https://example.com/a.jpg",
		"https://i.discogs.com.evil.com/a.jpg",
	} {
		if w := get(t, never, src); w.Code != http.StatusBadRequest {
			t.Errorf("src %q: status = %d, want 400", src, w.Code)
		}
	}
}

func TestUpstreamFailures(t *testing.T) {
	for name, client := range map[string]transport{
		"error":     func(*http.Request) (*http.Response, error) { return nil, errors.New("down") },
		"not found": respond(http.StatusNotFound, "image/jpeg", ""),
		"not image": respond(http.StatusOK, "text/html", "<html>"),
	} {
		if w := get(t, client, "https://i.scdn.co/a.jpg"); w.Code != http.StatusBadGateway {
			t.Errorf("%s: status = %d, want 502", name, w.Code)
		}
	}
}
