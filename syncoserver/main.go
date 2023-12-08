package main

import (
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"sync"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

var (
	clients = make(map[*websocket.Conn]bool) // Connected clients
	mutex   sync.Mutex                       // Mutex to protect access to clients map
)
var broadcast = make(chan Message) // Broadcast channel

// Message object
type Message struct {
	DataType string `json:"dataType"`
	Data     string `json:"data"`
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer ws.Close()

	// Register new client
	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	log.Printf("New user connected: %s", ws.RemoteAddr())

	for {
		var msg Message
		// Read in a new message as JSON
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error from %s: %v", ws.RemoteAddr(), err)
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Unexpected close error: %v", err)
			}
			mutex.Lock()
			delete(clients, ws)
			mutex.Unlock()
			log.Printf("User disconnected: %s", ws.RemoteAddr())
			break
		}
		log.Printf("Received message from %s: %+v", ws.RemoteAddr(), msg)
		// Send the newly received message to the broadcast channel
		broadcast <- msg
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("Error broadcasting to %s: %v", client.RemoteAddr(), err)
				client.Close()
				delete(clients, client)
			}
		}
		mutex.Unlock()
	}
}

func main() {
	// Set up a simple file server
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	// Set up route for WebSocket connections
	http.HandleFunc("/ws", handleConnections)
	go handleMessages()

	// Start the server
	log.Println("Listening on http://localhost:8080/")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
