package site

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func newSite(t *testing.T) *Site {
	t.Helper()
	s, err := New(fstest.MapFS{
		"index.html":       {Data: []byte("home")},
		"404.html":         {Data: []byte("lost")},
		"favicon.svg":      {Data: []byte("<svg/>")},
		"assets/app-1.js":  {Data: []byte("js")},
		"films/poster.jpg": {Data: []byte("jpg")},
	})
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestServe(t *testing.T) {
	s := newSite(t)
	for _, tc := range []struct {
		method, path string
		status       int
		body, cache  string
	}{
		{"GET", "/", 200, "home", "no-cache"},
		{"GET", "/favicon.svg", 200, "<svg/>", "public, max-age=86400"},
		{"GET", "/assets/app-1.js", 200, "js", "public, max-age=31536000, immutable"},
		{"GET", "/nope", 404, "lost", "no-cache"},
		{"GET", "/films", 404, "lost", "no-cache"},
		{"GET", "/404.html", 404, "lost", "no-cache"},
		{"GET", "/../index.html", 400, "invalid URL path\n", ""},
		{"HEAD", "/nope", 404, "", "no-cache"},
		{"POST", "/", 405, "Method Not Allowed\n", ""},
	} {
		w := httptest.NewRecorder()
		s.ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != tc.status {
			t.Errorf("%s %s: status = %d, want %d", tc.method, tc.path, w.Code, tc.status)
		}
		if w.Body.String() != tc.body {
			t.Errorf("%s %s: body = %q, want %q", tc.method, tc.path, w.Body.String(), tc.body)
		}
		if got := w.Header().Get("Cache-Control"); got != tc.cache {
			t.Errorf("%s %s: Cache-Control = %q, want %q", tc.method, tc.path, got, tc.cache)
		}
	}
}

func TestHTMLContentType(t *testing.T) {
	s := newSite(t)
	for _, path := range []string{"/", "/nope"} {
		w := httptest.NewRecorder()
		s.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if got := w.Header().Get("Content-Type"); got != "text/html; charset=utf-8" {
			t.Errorf("%s: Content-Type = %q", path, got)
		}
	}
}

func TestNewNeedsBuild(t *testing.T) {
	if _, err := New(fstest.MapFS{"index.html": {}}); err == nil {
		t.Error("New accepted a build without 404.html")
	}
}
