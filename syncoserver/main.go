package main

import (
	"encoding/json"
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
	clients      = make(map[*websocket.Conn]bool) // Connected clients
	mutex        sync.Mutex                       // Mutex to protect access to clients map
	drawingData  []DrawingData                    // Shared drawing data
	drawingMutex sync.Mutex                       // Mutex to protect access to drawingData
	writeMutex   sync.Mutex                       // Mutex to protect websocket write
)
var broadcast = make(chan Message) // Broadcast channel

// Message object
type Message struct {
	DataType string `json:"dataType"`
	Data     string `json:"data"`
}

type DrawingData struct {
	Type   string `json:"type"`
	StartX int    `json:"startX"`
	StartY int    `json:"startY"`
	EndX   int    `json:"endX"`
	EndY   int    `json:"endY"`
	Text   string `json:"text,omitempty"`
	// Additional properties for rectangle and circle
	Radius int `json:"radius,omitempty"`
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	// Upgrade initial GET request to a WebSocket
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	defer func(ws *websocket.Conn) {
		err := ws.Close()
		if err != nil {
			log.Printf("Error closing WebSocket: %v", err)
		}
	}(ws)

	mutex.Lock()
	clients[ws] = true
	mutex.Unlock()

	log.Printf("New user connected: %s", ws.RemoteAddr())

	// Send initial drawing data to the new client
	drawingMutex.Lock()
	for _, drawing := range drawingData {
		message := Message{
			DataType: "drawing",
			Data:     toJSONString(drawing),
		}
		writeMutex.Lock()
		err := ws.WriteJSON(message)
		writeMutex.Unlock()
		if err != nil {
			log.Printf("Error sending initial drawing data to %s: %v", ws.RemoteAddr(), err)
			break
		}
	}
	drawingMutex.Unlock()

	for {
		// Read in a new message as JSON into a map to capture raw JSON
		var rawMsg map[string]interface{}
		err := ws.ReadJSON(&rawMsg)
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

		// Convert the raw message to a string for logging
		rawJSON, _ := json.Marshal(rawMsg)
		log.Printf("Raw JSON message from %s: %s", ws.RemoteAddr(), string(rawJSON))

		// Unmarshal into the Message struct
		var msg Message
		if err := json.Unmarshal(rawJSON, &msg); err != nil {
			log.Printf("Unmarshal error from %s: %v", ws.RemoteAddr(), err)
			continue
		}

		// Check the DataType before broadcasting
		if msg.DataType != "test" {
			log.Printf("Received drawing message from %s: %+v", ws.RemoteAddr(), msg)
			// Send the newly received message to the broadcast channel
			broadcast <- msg
		} else {
			// Handle "test" messages differently or ignore them
			log.Printf("Test message received from %s: %+v", ws.RemoteAddr(), msg)
		}
	}
}

func handleMessages() {
	for {
		msg := <-broadcast
		mutex.Lock()
		for client := range clients {
			go func(c *websocket.Conn) {
				writeMutex.Lock()
				err := c.WriteJSON(msg)
				writeMutex.Unlock()
				if err != nil {
					log.Printf("Error broadcasting to %s: %v", c.RemoteAddr(), err)
					err := c.Close()
					if err != nil {
						return
					}
					delete(clients, c)
				}
			}(client)
		}
		mutex.Unlock()

		// Save the drawing to the drawingData array
		if msg.DataType == "drawing" {
			drawingMutex.Lock()
			var drawing DrawingData
			if err := json.Unmarshal([]byte(msg.Data), &drawing); err == nil {
				drawingData = append(drawingData, drawing)
			}
			drawingMutex.Unlock()
		}

		// Log every 10 received messages
		if len(broadcast)%10 == 0 {
			log.Printf("Broadcasted %d messages", len(broadcast))
		}
	}
}

func toJSONString(data interface{}) string {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Printf("Error marshalling to JSON: %v", err)
		return ""
	}
	return string(jsonData)
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
