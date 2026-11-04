package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"syscall"
	tetrisserver "tetris-battle"
	"tetris-battle/desktopnet"
	"time"
)

func main() {
	parent, _ := strconv.Atoi(os.Getenv("TETRIS_PARENT_PID"))
	if parent > 0 {
		go func() {
			for {
				time.Sleep(time.Second)
				if syscall.Kill(parent, 0) != nil {
					os.Exit(0)
				}
			}
		}()
	}
	listener, err := net.Listen("tcp", ":8080")
	if err != nil {
		log.Fatal(err)
	}
	mux := http.NewServeMux()
	mux.Handle("/arena-ws", desktopnet.New())
	mux.HandleFunc("/desktop-network", desktopnet.NetworkInfo)
	mux.HandleFunc("/desktop-health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(os.Getenv("TETRIS_LAUNCH_TOKEN")))
	})
	mux.Handle("/", tetrisserver.NewServerHandler())
	log.Fatal(http.Serve(listener, mux))
}
