import React, {useCallback, useEffect, useRef, useState} from 'react';
import { useParams } from 'react-router-dom';
import Toolbar from "../components/Toolbar.tsx";

// Define a type for the drawing data
type DrawingData = {
    type: 'line' | 'circle' | 'rectangle' | 'text';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    text?: string;
    fontSize?: string;
    fontFamily?: string;
    // Add other properties as needed (like color, thickness)
};

type OuterLayer = {
    dataType: string;
    data: string;
};

const Whiteboard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingData, setDrawingData] = useState<DrawingData[]>([]);
    const [currentTool, setCurrentTool] = useState<'line' | 'circle' | 'rectangle' | 'text'>('line');
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
    const [textInput, setTextInput] = useState(''); // State for text input
    const { code } = useParams();
    useEffect(() => {
        // Initialize WebSocket connection
        const initializeWebSocket = () => {
            const ws = new WebSocket(`ws://localhost:8080/ws/${code}`);
            ws.onopen = () => console.log("WebSocket opened");
            ws.onclose = () => console.log("WebSocket closed");
            ws.onerror = (error) => console.error("WebSocket error:", error);
            ws.onmessage = (event) => {
                console.log("WebSocket message received:", event.data);

                try {
                    const obj: OuterLayer = JSON.parse(event.data);
                    console.log(obj.dataType);
                    if (obj.dataType === 'drawing') {
                        const drawingObject = JSON.parse(obj.data);

                        setDrawingData(prevDrawingData => {
                            console.log('Updating drawing data with:', drawingObject);
                            return [...prevDrawingData, drawingObject];
                        });
                    }
                } catch (error) {
                    console.error("Error processing the message:", error);
                }
            };
            setWs(ws);
        };

        initializeWebSocket();

        return () => {
            // Clean up the WebSocket connection
            ws?.close();

        };


    }, [code]);

    useEffect(() => {
        const handleBeforeUnload = () => {
            ws?.close();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [ws]);




    // Function to start drawing
    const startDrawing = (e: React.MouseEvent) => {
        if (currentTool === 'text') {
            const { offsetX, offsetY } = e.nativeEvent
            // Logic for starting text drawing
            const newDrawing: DrawingData = {
                type: 'text',
                startX: offsetX,
                startY: offsetY,
                endX: offsetX, // For text, endX and endY may not be used
                endY: offsetY,
                text: textInput,
                fontSize: '16px', // Default font size, can be made dynamic
                fontFamily: 'Arial', // Default font family, can be made dynamic
            };
            setCurrentDrawing(newDrawing);
            setDrawingData(prevDrawingData => [...prevDrawingData, newDrawing]);
            setIsDrawing(false); // To stop drawing after text input
        } else {
            const { offsetX, offsetY } = e.nativeEvent;
            setIsDrawing(true);
            const newDrawing: DrawingData = {
                type: currentTool,
                startX: offsetX,
                startY: offsetY,
                // Initialize endX and endY with the same starting point
                endX: offsetX,
                endY: offsetY,
            };
            setCurrentDrawing(newDrawing); // Set the current drawing
            setDrawingData(prevDrawingData => [...prevDrawingData, newDrawing]);
        }

    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !currentDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        // Update the current drawing directly
        const updatedDrawing = {
            ...currentDrawing,
            endX: offsetX,
            endY: offsetY,
        };
        setCurrentDrawing(updatedDrawing); // Update the current drawing
    };


    // Use sendDrawingData function where appropriate, e.g., in stopDrawing function
    const stopDrawing = () => {
        setIsDrawing(false);

        if (!currentDrawing) return;

        if (currentTool === 'text' && textInput.trim() !== '') {
            const textDrawing = {
                ...currentDrawing,
                text: textInput
            };
            sendDrawingData(textDrawing);
            setTextInput(''); // Clear the text input after sending
        } else if (currentDrawing) {
            sendDrawingData(currentDrawing); // Send drawing data for other tools
        }

        setDrawingData(prevDrawingData => [...prevDrawingData, currentDrawing]);
        setCurrentDrawing(null);
    };

    // sendDrawingData function
    const sendDrawingData = (drawing: DrawingData) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            const message = {
                DataType: 'drawing',
                Data: JSON.stringify(drawing),
                Code: code
            };
            ws.send(JSON.stringify(message));
        }
    };


    // Function to render the drawing on the canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!context) {
            console.error('Canvas context not available.');
            return;
        }

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Draw all shapes from the drawingData state
        drawingData.forEach((item) => {
            context.beginPath();
            if (item.type === 'line') {
                context.moveTo(item.startX, item.startY);
                context.lineTo(item.endX, item.endY);
            } else if (item.type === 'circle') {
                const radius = Math.sqrt(Math.pow(item.endX - item.startX, 2) + Math.pow(item.endY - item.startY, 2));
                context.arc(item.startX, item.startY, radius, 0, 2 * Math.PI);
            } else if (item.type === 'rectangle') {
                context.rect(item.startX, item.startY, item.endX - item.startX, item.endY - item.startY);
            } else if (item.type === 'text' && item.text) {
                context.font = `${item.fontSize} ${item.fontFamily}`;
                context.fillText(item.text, item.startX, item.startY);
            }
            context.stroke();
        });
    }, [drawingData]);

    const renderTextInput = () => {
        if (currentTool === 'text') {
            return (
                <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter text"
                />
            );
        }
        return null;
    };

    // Effect to render the canvas whenever the drawing data changes
    useEffect(() => {
        console.log('Redrawing canvas with new data...');
        renderCanvas();
    }, [drawingData, renderCanvas]);

    useEffect(() => {
        console.log('drawingData updated:', drawingData);
    }, [drawingData]);

    useEffect(() => {
        // Check if drawing has just stopped and there is at least one drawing in the array
        if (!isDrawing && drawingData.length > 0) {
            const lastDrawing = drawingData[drawingData.length - 1];
            if (lastDrawing.type && lastDrawing.startX !== undefined && lastDrawing.endX !== undefined) {
                console.log("Final drawing data to send:", lastDrawing);

                // Send the last drawing to the WebSocket server
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log('Sending drawing data:', lastDrawing);
                    const message = {
                        DataType: 'drawing',
                        Data: JSON.stringify(lastDrawing)
                    };
                    ws.send(JSON.stringify(message));
                }
            }
        }
    }, [drawingData, isDrawing, ws]);

    return (
        <div>
            {renderTextInput()}
            <canvas
                ref={canvasRef}
                width={800} // Set appropriate size
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
            <Toolbar setCurrentTool={setCurrentTool} />
        </div>
    );
};

export default Whiteboard;
