package desktopnet

import (
	"fmt"
	"github.com/gorilla/websocket"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func read(t *testing.T, c *websocket.Conn) map[string]any {
	t.Helper()
	c.SetReadDeadline(time.Now().Add(time.Second))
	var m map[string]any
	if err := c.ReadJSON(&m); err != nil {
		t.Fatal(err)
	}
	return m
}
func TestRoomRelayAndPhoneSpectator(t *testing.T) {
	s := httptest.NewServer(New())
	defer s.Close()
	dial := func() *websocket.Conn {
		c, _, e := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(s.URL, "http"), nil)
		if e != nil {
			t.Fatal(e)
		}
		t.Cleanup(func() { c.Close() })
		return c
	}
	host := dial()
	host.WriteJSON(map[string]any{"type": "create", "mode": "battle2p", "spectator": true})
	m := read(t, host)
	if m["limit"] != float64(3) {
		t.Fatal(m)
	}
	code := m["code"]
	phones := []*websocket.Conn{dial(), dial()}
	for i, c := range phones {
		c.WriteJSON(map[string]any{"type": "join", "code": code, "name": "phone"})
		if m := read(t, c); m["seat"] != float64(i+1) {
			t.Fatal(m)
		}
		read(t, host)
		if i == 1 {
			read(t, phones[0])
		}
	}
	host.WriteJSON(map[string]any{"type": "state", "state": map[string]any{"score": 42}})
	for _, c := range phones {
		if m := read(t, c); m["type"] != "state" {
			t.Fatal(m)
		}
	}
	phones[1].WriteJSON(map[string]any{"type": "action", "key": "ArrowLeft", "seat": 0})
	if m := read(t, host); m["seat"] != float64(2) || m["key"] != "ArrowLeft" {
		t.Fatal(m)
	}
	extra := dial()
	extra.WriteJSON(map[string]any{"type": "join", "code": code})
	if read(t, extra)["type"] != "error" {
		t.Fatal("overfilled room")
	}
	phones[1].Close()
	if m := read(t, host); m["type"] != "roster" {
		t.Fatal(m)
	}
	read(t, phones[0])
	host.Close()
	if m := read(t, phones[0]); m["type"] != "closed" {
		t.Fatal(m)
	}
}
func TestInvalidRoomAndMode(t *testing.T) {
	s := httptest.NewServer(New())
	defer s.Close()
	c, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(s.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	for _, m := range []map[string]any{{"type": "join", "code": "xxxxxx"}, {"type": "create", "mode": "ultra"}} {
		c.WriteJSON(m)
		if read(t, c)["type"] != "error" {
			t.Fatal("expected error")
		}
	}
}

func TestMacAndPhoneRoom(t *testing.T) {
	s := httptest.NewServer(New())
	defer s.Close()
	u := "ws" + strings.TrimPrefix(s.URL, "http")
	host, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer host.Close()
	host.WriteJSON(map[string]any{"type": "create", "mode": "battle2p"})
	m := read(t, host)
	if m["limit"] != float64(2) || m["spectator"] != false {
		t.Fatal(m)
	}
	guest, _, err := websocket.DefaultDialer.Dial(u, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer guest.Close()
	guest.WriteJSON(map[string]any{"type": "join", "code": m["code"]})
	if read(t, guest)["seat"] != float64(1) {
		t.Fatal("invalid guest seat")
	}
	read(t, host)
	guest.WriteJSON(map[string]any{"type": "state", "state": map[string]any{"fake": true}})
	guest.WriteJSON(map[string]any{"type": "action", "key": "Tab"})
	if m := read(t, host); m["type"] != "action" {
		t.Fatal("guest can replace host state", m)
	}
}

func TestRematchConsentAndRoundIsolation(t *testing.T) {
	for _, spectator := range []bool{false, true} {
		t.Run(fmt.Sprintf("spectator=%v", spectator), func(t *testing.T) {
			server := httptest.NewServer(New())
			defer server.Close()
			dial := func() *websocket.Conn {
				c, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
				if err != nil {
					t.Fatal(err)
				}
				t.Cleanup(func() { c.Close() })
				return c
			}
			host := dial()
			host.WriteJSON(map[string]any{"type": "create", "mode": "battle2p", "spectator": spectator})
			code := read(t, host)["code"]
			peers := []*websocket.Conn{host}
			count := 1
			if spectator {
				count = 2
			}
			for i := 0; i < count; i++ {
				p := dial()
				p.WriteJSON(map[string]any{"type": "join", "code": code})
				read(t, p)
				for _, q := range peers {
					read(t, q)
				}
				peers = append(peers, p)
			}
			finished := func(round string, done bool) {
				host.WriteJSON(map[string]any{"type": "state", "state": map[string]any{"roundId": round, "finished": done}})
				for _, p := range peers[1:] {
					if read(t, p)["type"] != "state" {
						t.Fatal("expected snapshot")
					}
				}
				if done {
					for _, p := range peers {
						if read(t, p)["type"] != "rematch-status" {
							t.Fatal("expected consent state")
						}
					}
				}
			}
			finished("one", false)
			peers[1].WriteJSON(map[string]any{"type": "rematch", "round": "one", "ready": true})
			peers[1].WriteJSON(map[string]any{"type": "action", "key": "ArrowLeft"})
			if m := read(t, host); m["type"] != "action" {
				t.Fatal("readiness accepted during play", m)
			}
			// Requests during play cannot enqueue readiness or restart the game.
			finished("one", true)
			ready := func(p *websocket.Conn, value bool, want int) {
				p.WriteJSON(map[string]any{"type": "rematch", "round": "one", "ready": value})
				for _, q := range peers {
					m := read(t, q)
					if m["type"] != "rematch-status" || len(m["ready"].([]any)) != want {
						t.Fatal(m)
					}
				}
			}
			first := 0
			if spectator {
				first = 1
				host.WriteJSON(map[string]any{"type": "rematch", "round": "one", "ready": true})
			}
			ready(peers[first], true, 1)
			ready(peers[first], false, 0)
			ready(peers[first], true, 1)
			ready(peers[first+1], true, 2)
			for _, p := range peers {
				if m := read(t, p); m["type"] != "rematch-start" {
					t.Fatal(m)
				}
			}
			// Duplicate votes and votes from the old round must not restart round two.
			peers[first+1].WriteJSON(map[string]any{"type": "rematch", "round": "one", "ready": true})
			finished("two", false)
			peers[1].WriteJSON(map[string]any{"type": "rematch", "round": "one", "ready": true})
			peers[1].WriteJSON(map[string]any{"type": "action", "key": "ArrowLeft"})
			if m := read(t, host); m["type"] != "action" {
				t.Fatal("stale consent leaked", m)
			}
			finished("two", true)
			peers[len(peers)-1].Close()
			for _, p := range peers[:len(peers)-1] {
				if read(t, p)["type"] != "roster" {
					t.Fatal("missing leave")
				}
				m := read(t, p)
				if m["type"] != "rematch-status" || len(m["required"].([]any)) != 1 || len(m["ready"].([]any)) != 0 {
					t.Fatal(m)
				}
			}
		})
	}
}

func TestLateJoinReceivesResultBeforeRematchStatus(t *testing.T) {
	server := httptest.NewServer(New())
	defer server.Close()
	dial := func() *websocket.Conn {
		c, _, e := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
		if e != nil {
			t.Fatal(e)
		}
		t.Cleanup(func() { c.Close() })
		return c
	}
	host := dial()
	host.WriteJSON(map[string]any{"type": "create", "mode": "battle2p"})
	code := read(t, host)["code"]
	host.WriteJSON(map[string]any{"type": "state", "state": map[string]any{"roundId": "finished-round", "finished": true}})
	read(t, host)
	guest := dial()
	guest.WriteJSON(map[string]any{"type": "join", "code": code})
	if read(t, guest)["type"] != "welcome" {
		t.Fatal("missing welcome")
	}
	if m := read(t, guest); m["type"] != "state" || m["state"].(map[string]any)["roundId"] != "finished-round" {
		t.Fatal("missing cached result", m)
	}
	if m := read(t, guest); m["type"] != "rematch-status" || len(m["required"].([]any)) != 2 {
		t.Fatal("missing readiness", m)
	}
	read(t, host)
	read(t, host)
}

func TestSpeedAndItemRooms(t *testing.T) {
	for _, mode := range []string{"speed", "item"} {
		t.Run(mode, func(t *testing.T) {
			server := httptest.NewServer(New())
			defer server.Close()
			url := "ws" + strings.TrimPrefix(server.URL, "http")
			host, _, err := websocket.DefaultDialer.Dial(url, nil)
			if err != nil {
				t.Fatal(err)
			}
			defer host.Close()
			host.WriteJSON(map[string]any{"type": "create", "mode": mode})
			welcome := read(t, host)
			if welcome["mode"] != mode {
				t.Fatal(welcome)
			}
			guest, _, err := websocket.DefaultDialer.Dial(url, nil)
			if err != nil {
				t.Fatal(err)
			}
			defer guest.Close()
			guest.WriteJSON(map[string]any{"type": "join", "code": welcome["code"]})
			read(t, guest)
			read(t, host)
			key := "ArrowLeft"
			if mode == "item" {
				key = "v"
			}
			guest.WriteJSON(map[string]any{"type": "action", "key": key})
			if m := read(t, host); m["key"] != key || m["seat"] != float64(1) {
				t.Fatal(m)
			}
		})
	}
}

// A saturated recipient must not block a room broadcaster or grow memory unbounded.
func TestSlowPeerQueueIsBoundedAndDisconnects(t *testing.T) {
	p := &Peer{output: make(chan []byte, 2), done: make(chan struct{})}
	p.send(map[string]any{"n": 1})
	p.send(map[string]any{"n": 2})
	finished := make(chan struct{})
	go func() { p.send(map[string]any{"n": 3}); close(finished) }()
	select {
	case <-finished:
	case <-time.After(time.Second):
		t.Fatal("slow peer blocked broadcaster")
	}
	select {
	case <-p.done:
	default:
		t.Fatal("saturated peer was not disconnected")
	}
	if len(p.output) != 2 {
		t.Fatal("unbounded output queue")
	}
	p.send(map[string]any{"n": 4})
}
