package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type API struct{}

func New() *API {
	return &API{}
}

func (a *API) Register(r gin.IRouter) {
	r.GET("/health", a.health)
}

func (a *API) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
