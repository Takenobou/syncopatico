import React, {useCallback, useEffect, useRef, useState} from 'react';
import Toolbar from "../components/Toolbar.tsx";

// Define a type for the drawing data
type DrawingData = {
    type: 'line' | 'circle' | 'rectangle' | 'text';
    startX: number;
    startY: number;
    endX?: number;
    endY?: number;
    text?: string;
    // Add other properties as needed (like color, thickness)
};

const Whiteboard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingData, setDrawingData] = useState<DrawingData[]>([]);
    const [currentTool, setCurrentTool] = useState<'line' | 'circle' | 'rectangle' | 'text'>('line');
    const [ws, setWs] = useState<WebSocket | null>(null);

    useEffect(() => {
        const newWebSocket = new WebSocket('ws://localhost:8080/ws');

        newWebSocket.onopen = () => {
            console.log("Connected to WebSocket server");
            // Send a test message upon connection
            newWebSocket.send(JSON.stringify({ DataType: "test", Data: "Connection established" }));
        };

        newWebSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        newWebSocket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            setDrawingData(drawingData => [...drawingData, message]);
        };

        newWebSocket.onclose = (event) => {
            console.log("WebSocket closed:", event.reason);
        };

        setWs(newWebSocket);

        return () => {
            if (newWebSocket.readyState === WebSocket.OPEN) {
                newWebSocket.close();
            }
        };
    }, []);


    // Function to start drawing
    const startDrawing = (e: React.MouseEvent) => {
        const { offsetX, offsetY } = e.nativeEvent;
        setIsDrawing(true);
        // Add initial drawing data based on the current tool
        const newDrawing: DrawingData = {
            type: currentTool,
            startX: offsetX,
            startY: offsetY,
        };
        setDrawingData([...drawingData, newDrawing]);
    };

    // Function to update drawing
    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = e.nativeEvent;
        const updatedDrawingData = drawingData.map((data, index) => {
            if (index === drawingData.length - 1) {
                return {
                    ...data,
                    endX: offsetX,
                    endY: offsetY
                };
            }
            return data;
        });
        const currentDrawing = updatedDrawingData[updatedDrawingData.length - 1];

        if (currentTool === 'line' || currentTool === 'rectangle' || currentTool === 'circle') {
            currentDrawing.endX = offsetX;
            currentDrawing.endY = offsetY;
        }

        setDrawingData(updatedDrawingData);
    };

    // Function to stop drawing
    const stopDrawing = () => {
        setIsDrawing(false);
        const currentDrawing = drawingData[drawingData.length - 1];
        if (ws) {
            ws.send(JSON.stringify(currentDrawing));
        }
    };

    // Function to render the drawing on the canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!context) return;

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        drawingData.forEach((item) => {
            if (item.type === 'line') {
                context.beginPath();
                context.moveTo(item.startX, item.startY);
                if (item.endX && item.endY) {
                    context.lineTo(item.endX, item.endY);
                }
                context.stroke();
            }
            // Implement rendering logic for other types
        });
    }, [drawingData]);

    // Effect to render the canvas whenever the drawing data changes
    useEffect(() => {
        renderCanvas();
    }, [drawingData, renderCanvas]);

    return (
        <div>
            <Toolbar setCurrentTool={setCurrentTool} />
            <canvas
                ref={canvasRef}
                width={800} // Set appropriate size
                height={600}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
        </div>
    );
};

export default Whiteboard;
