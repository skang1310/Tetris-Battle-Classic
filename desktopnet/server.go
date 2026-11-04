package desktopnet

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"github.com/gorilla/websocket"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type Peer struct {
	conn     *websocket.Conn
	output   chan []byte
	done     chan struct{}
	stopOnce sync.Once
	seat     int
	name     string
	room     *Room
}
type Room struct {
	Code       string
	Mode       string
	Limit      int
	Spectator  bool
	peers      map[int]*Peer
	Round      string
	Finished   bool
	Rematching bool
	Ready      map[int]bool
	LastState  json.RawMessage
}
type Server struct {
	mu    sync.Mutex
	rooms map[string]*Room
}
type Message struct {
	Spectator bool            `json:"spectator"`
	Type      string          `json:"type"`
	Code      string          `json:"code"`
	Mode      string          `json:"mode"`
	Name      string          `json:"name"`
	Key       string          `json:"key"`
	Round     string          `json:"round"`
	Ready     bool            `json:"ready"`
	State     json.RawMessage `json:"state"`
}

var limits = map[string]int{"battle2p": 2, "speed": 2, "item": 2}

func New() *Server { return &Server{rooms: map[string]*Room{}} }

// Socket writes never run while the global room mutex is held.
func (p *Peer) stop() {
	p.stopOnce.Do(func() {
		close(p.done)
		if p.conn != nil {
			p.conn.Close()
		}
	})
}
func (p *Peer) enqueue(data []byte) {
	select {
	case <-p.done:
		return
	default:
	}
	select {
	case p.output <- data:
	default:
		p.stop()
	}
}
func (p *Peer) send(v any) {
	data, err := json.Marshal(v)
	if err == nil {
		p.enqueue(data)
	}
}
func (p *Peer) closeAfterFlush() { p.enqueue(nil) }
func (p *Peer) writer() {
	defer p.stop()
	for {
		select {
		case <-p.done:
			return
		case data := <-p.output:
			if data == nil {
				return
			}
			_ = p.conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
			if p.conn.WriteMessage(websocket.TextMessage, data) != nil {
				return
			}
		}
	}
}
func (s *Server) broadcast(r *Room, v any, except *Peer) {
	for _, p := range r.peers {
		if p != except {
			p.send(v)
		}
	}
}
func roster(r *Room) []map[string]any {
	list := []map[string]any{}
	for i := 0; i < r.Limit; i++ {
		if p := r.peers[i]; p != nil {
			list = append(list, map[string]any{"seat": i, "name": p.name})
		}
	}
	return list
}
func validKey(k string) bool {
	switch k {
	case "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "x", "z", " ", "c", "Shift", "p", "Tab", "v", "b", "n", "1", "2", "3":
		return true
	}
	return false
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	up := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool {
		if r.Header.Get("Origin") == "" {
			return true
		}
		origin, err := url.Parse(r.Header.Get("Origin"))
		return err == nil && origin.Host == r.Host
	}}
	conn, err := up.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(1024 * 1024)
	p := &Peer{conn: conn, seat: -1, output: make(chan []byte, 64), done: make(chan struct{})}
	go p.writer()
	defer func() {
		s.mu.Lock()
		defer s.mu.Unlock()
		if p.room != nil {
			room := p.room
			delete(room.peers, p.seat)
			delete(room.Ready, p.seat)
			if p.seat == 0 {
				s.broadcast(room, map[string]any{"type": "closed", "error": "방장이 게임을 종료했습니다."}, nil)
				for _, guest := range room.peers {
					guest.room = nil
					guest.closeAfterFlush()
				}
				delete(s.rooms, room.Code)
			} else {
				s.broadcast(room, map[string]any{"type": "roster", "players": roster(room)}, nil)
				if room.Finished {
					s.broadcast(room, rematchStatus(room), nil)
				}
			}
		}
		p.stop()
	}()
	for {
		var m Message
		if err := conn.ReadJSON(&m); err != nil {
			return
		}
		s.mu.Lock()
		switch m.Type {
		case "create":
			if p.room != nil {
				s.mu.Unlock()
				continue
			}
			limit, ok := limits[m.Mode]
			if !ok {
				p.send(map[string]any{"type": "error", "error": "지원하지 않는 대전 모드입니다."})
				s.mu.Unlock()
				continue
			}
			var code string
			for {
				var b [3]byte
				_, _ = rand.Read(b[:])
				code = fmt.Sprintf("%06d", (int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000)
				if s.rooms[code] == nil {
					break
				}
			}
			if m.Spectator {
				limit++
			}
			room := &Room{Spectator: m.Spectator, Code: code, Mode: m.Mode, Limit: limit, peers: map[int]*Peer{0: p}, Ready: map[int]bool{}}
			p.room = room
			p.seat = 0
			p.name = cleanName(m.Name)
			s.rooms[code] = room
			p.send(map[string]any{"type": "welcome", "code": code, "mode": room.Mode, "seat": 0, "spectator": room.Spectator, "limit": limit, "players": roster(room)})
		case "join":
			if p.room != nil {
				s.mu.Unlock()
				continue
			}
			room := s.rooms[strings.TrimSpace(m.Code)]
			if room == nil {
				p.send(map[string]any{"type": "error", "error": "방 코드를 찾을 수 없습니다."})
				s.mu.Unlock()
				continue
			}
			seat := 1
			for seat < room.Limit && room.peers[seat] != nil {
				seat++
			}
			if seat == room.Limit {
				p.send(map[string]any{"type": "error", "error": "방이 가득 찼습니다."})
				s.mu.Unlock()
				continue
			}
			p.room = room
			p.seat = seat
			p.name = cleanName(m.Name)
			room.peers[seat] = p
			p.send(map[string]any{"type": "welcome", "code": room.Code, "mode": room.Mode, "seat": seat, "spectator": room.Spectator, "limit": room.Limit, "players": roster(room)})
			if len(room.LastState) > 0 {
				p.send(map[string]any{"type": "state", "state": room.LastState})
			}
			s.broadcast(room, map[string]any{"type": "roster", "players": roster(room)}, p)
			if room.Finished {
				s.broadcast(room, rematchStatus(room), nil)
			}
		case "state":
			if p.room != nil && p.seat == 0 && len(m.State) > 0 {
				room := p.room
				var meta struct {
					Round    string `json:"roundId"`
					Finished bool   `json:"finished"`
				}
				if json.Unmarshal(m.State, &meta) != nil {
					break
				}
				// A new host round clears old consent; repeated final snapshots keep it.
				changed := room.Round != meta.Round || room.Finished != meta.Finished
				if room.Round != meta.Round {
					room.Ready = map[int]bool{}
					room.Rematching = false
				}
				room.LastState = append(json.RawMessage(nil), m.State...)
				room.Round = meta.Round
				room.Finished = meta.Finished
				s.broadcast(room, map[string]any{"type": "state", "state": m.State}, p)
				if changed && room.Finished {
					s.broadcast(room, rematchStatus(room), nil)
				}
			}
		case "rematch":
			room := p.room
			if room == nil || !room.Finished || room.Rematching || room.Round == "" || m.Round != room.Round || (room.Spectator && p.seat == 0) {
				break
			}
			room.Ready[p.seat] = m.Ready
			status := rematchStatus(room)
			required := status["required"].([]int)
			ready := status["ready"].([]int)
			s.broadcast(room, status, nil)
			if len(required) >= 2 && len(ready) == len(required) {
				room.Rematching = true
				s.broadcast(room, map[string]any{"type": "rematch-start", "round": room.Round}, nil)
			}
		case "action":
			if p.room != nil && p.seat > 0 && validKey(m.Key) {
				if host := p.room.peers[0]; host != nil {
					host.send(map[string]any{"type": "action", "seat": p.seat, "key": m.Key})
				}
			}
		}
		s.mu.Unlock()
	}
}
func cleanName(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return "Player"
	}
	r := []rune(s)
	if len(r) > 20 {
		r = r[:20]
	}
	return string(r)
}
func NetworkInfo(w http.ResponseWriter, r *http.Request) {
	addresses := []string{}
	interfaces, _ := net.Interfaces()
	for _, face := range interfaces {
		if face.Flags&net.FlagUp == 0 || face.Flags&net.FlagLoopback != 0 {
			continue
		}
		list, _ := face.Addrs()
		for _, address := range list {
			ip, _, err := net.ParseCIDR(address.String())
			if err == nil && ip.To4() != nil && ip.IsPrivate() {
				addresses = append(addresses, "http://"+ip.String()+":8080")
			}
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"urls": addresses})
}

func rematchStatus(room *Room) map[string]any {
	required, ready := []int{}, []int{}
	for i := 0; i < room.Limit; i++ {
		if room.peers[i] == nil || (room.Spectator && i == 0) {
			continue
		}
		required = append(required, i)
		if room.Ready[i] {
			ready = append(ready, i)
		}
	}
	return map[string]any{"type": "rematch-status", "round": room.Round, "required": required, "ready": ready}
}
