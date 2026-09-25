package site

import (
	"fmt"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

const (
	indexFile    = "index.html"
	notFoundFile = "404.html"
)

type Site struct {
	files fs.FS
}

func New(fsys fs.FS) (*Site, error) {
	for _, name := range []string{indexFile, notFoundFile} {
		if _, err := fs.Stat(fsys, name); err != nil {
			return nil, fmt.Errorf("site is missing %s (run `bun run build`): %w", name, err)
		}
	}
	return &Site{files: fsys}, nil
}

func (s *Site) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
		return
	}

	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name == "" {
		name = indexFile
	}
	if name == notFoundFile || !s.isFile(name) {
		s.notFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", cacheControl(name))
	http.ServeFileFS(w, r, s.files, name)
}

func (s *Site) isFile(name string) bool {
	info, err := fs.Stat(s.files, name)
	return err == nil && info.Mode().IsRegular()
}

// notFound sends 404.html by hand, since ServeFileFS only sends 200s.
func (s *Site) notFound(w http.ResponseWriter, r *http.Request) {
	page, err := fs.ReadFile(s.files, notFoundFile)
	if err != nil {
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Cache-Control", cacheControl(notFoundFile))
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusNotFound)
	if r.Method != http.MethodHead {
		_, _ = w.Write(page)
	}
}

func cacheControl(name string) string {
	switch {
	case strings.HasSuffix(name, ".html"):
		return "no-cache"
	case strings.HasPrefix(name, "assets/"):
		return "public, max-age=31536000, immutable"
	default:
		return "public, max-age=86400"
	}
}
