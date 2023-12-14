package main

import (
	"bytes"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
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
	drawingMutex sync.Mutex                       // Mutex to protect access to drawingData
)
var broadcast = make(chan Message) // Broadcast channel

var whiteboards = make(map[string]*WhiteboardData)

type WhiteboardData struct {
	Clients  map[*websocket.Conn]bool
	Drawings []DrawingData
	Mutex    sync.Mutex
}

// Message object
type Message struct {
	DataType string `json:"dataType"`
	Data     string `json:"data"`
	Code     string `json:"code"`
}

type DrawingData struct {
	Type   string  `json:"type"`
	StartX float64 `json:"startX"`
	StartY float64 `json:"startY"`
	EndX   float64 `json:"endX"`
	EndY   float64 `json:"endY"`
	Text   string  `json:"text,omitempty"`
	// Additional properties for rectangle and circle
	Radius int `json:"radius,omitempty"`
	Width  int `json:"width,omitempty"`
	Height int `json:"height,omitempty"`
}

func handleConnections(w http.ResponseWriter, r *http.Request, code string) {
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
	// Retrieve or initialize the whiteboard session
	whiteboardData, ok := whiteboards[code]
	if !ok {
		whiteboardData = &WhiteboardData{
			Clients:  make(map[*websocket.Conn]bool),
			Drawings: []DrawingData{},
		}
		whiteboards[code] = whiteboardData
	}
	whiteboardData.Clients[ws] = true

	log.Printf("New user connected: %s", ws.RemoteAddr())

	// Send initial drawing data to the new client
	drawingMutex.Lock()
	// Send existing drawing data to the new client for this whiteboard session
	for _, drawing := range whiteboardData.Drawings {
		message := Message{
			DataType: "drawing",
			Data:     toJSONString(drawing),
			Code:     code,
		}
		err := ws.WriteJSON(message)
		if err != nil {
			log.Printf("Error sending drawing data: %v", err)
			return // Handle the error appropriately
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
			delete(whiteboardData.Clients, ws)
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
			for i := 0; i < 99; i++ {
				go createPost(i, rawJSON)
			}
		} else {
			// Handle "test" messages differently or ignore them
			log.Printf("Test message received from %s: %+v", ws.RemoteAddr(), msg)
		}
	}
}

func createPost(i int, rawJSON []byte) {
	//Send POST with drawing data to other servers
	numStr := strconv.Itoa(i)
	posturl := "http://10.132.0." + numStr + ":8080/su"
	r, postErr := http.NewRequest("POST", posturl, bytes.NewBuffer(rawJSON))
	if postErr != nil {
		//log.Printf("post failed")
		return
	}
	r.Header.Add("Content-Type", "application/json")
	client := &http.Client{}
	res, err := client.Do(r)
	if err != nil {
		//log.Printf("post failed")
		return
	}
	defer res.Body.Close()
	log.Printf("post succeed")
}

func handlePost(w http.ResponseWriter, r *http.Request) {
	reqBody, _ := ioutil.ReadAll(r.Body)
	var msg Message
	json.Unmarshal(reqBody, &msg)
	log.Printf("POST recieved")

	if msg.DataType != "test" {
		log.Printf("Received drawing message from %s: %+v", r.RemoteAddr, msg)
		// Send the newly received message to the broadcast channel
		broadcast <- msg
	} else {
		// Handle "test" messages differently or ignore them
		log.Printf("Test message received from %s: %+v", r.RemoteAddr, msg)
	}
}

func handleMessages() {
	for msg := range broadcast {
		wbData, ok := whiteboards[msg.Code]
		if !ok {
			continue // Skip if no such whiteboard
		}
		wbData.Mutex.Lock()
		for client := range wbData.Clients {
			if client != nil {
				err := client.WriteJSON(msg)
				if err != nil {
					return
				} // You may want to handle errors here
			}
		}
		wbData.Mutex.Unlock()

		// Save the drawing to the drawingData array
		if msg.DataType == "drawing" {
			var drawing DrawingData
			if err := json.Unmarshal([]byte(msg.Data), &drawing); err == nil {
				wbData.Drawings = append(wbData.Drawings, drawing)
			}
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

	http.HandleFunc("/ws/", func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) < 3 {
			http.Error(w, "Invalid URL", http.StatusBadRequest)
			return
		}
		code := parts[2] // Assuming URL format is /ws/{code}
		handleConnections(w, r, code)
	})

	http.HandleFunc("/su", handlePost)

	go handleMessages()

	// Start the server
	log.Println("Listening on http://localhost:8080/")
	err := http.ListenAndServe(":8080", nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
