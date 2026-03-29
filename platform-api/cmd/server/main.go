package main

import (
	"log"
	"os"

	"github.com/renchili/grafana_with_control/platform-api/internal/server"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	srv := server.New()
	log.Printf("platform-api listening on :%s", port)
	if err := srv.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
