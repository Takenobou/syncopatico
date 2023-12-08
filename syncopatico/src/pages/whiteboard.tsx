import React, {useCallback, useEffect, useRef, useState} from 'react';
import Toolbar from "../components/Toolbar.tsx";

// Define a type for the drawing data
type DrawingData = {
    type: 'line' | 'circle' | 'rectangle' | 'text';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    text?: string;
    // Add other properties as needed (like color, thickness)
};

const Whiteboard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingData, setDrawingData] = useState<DrawingData[]>([]);
    const [currentTool, setCurrentTool] = useState<'line' | 'circle' | 'rectangle' | 'text'>('line');
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);

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
            console.log("WebSocket message received:", event.data);

            try {
                const msg = JSON.parse(event.data); // First parse
                console.log("Parsed message:", msg);

                if (msg.DataType === 'drawing') {
                    const drawingObject = JSON.parse(msg.Data); // Second parse
                    console.log("Drawing object received:", drawingObject);

                    // Update the drawingData state with the new drawing object
                    setDrawingData(prevDrawingData => [...prevDrawingData, drawingObject]);
                }
            } catch (error) {
                console.error("Error processing the message:", error);
            }
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
        const newDrawing: DrawingData = {
            type: currentTool,
            startX: offsetX,
            startY: offsetY,
            // Initialize endX and endY with the same starting point
            endX: offsetX,
            endY: offsetY,
        };
        setCurrentDrawing(newDrawing); // Set the current drawing
        setDrawingData([...drawingData, newDrawing]);
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

        console.log('draw - updatedData:', updatedDrawing);
        // Update the last item in drawingData array with the updated drawing
        setDrawingData(drawingData.map((data, index) =>
            index === drawingData.length - 1 ? updatedDrawing : data
        ));
    };

    const stopDrawing = () => {
        setIsDrawing(false);

        // If currentDrawing is null, we do not proceed.
        if (!currentDrawing) return;

        // Since we have a currentDrawing, we proceed to update the drawingData state.
        setDrawingData((prevDrawingData) => {
            const updatedDrawingData = prevDrawingData.map((data, index) => {
                // If we're at the last item in the array, we return the currentDrawing.
                // We use a type guard to ensure that we are not spreading null values.
                if (index === prevDrawingData.length - 1 && currentDrawing) {
                    return { ...data, ...currentDrawing };
                }
                return data;
            });

            // Send the last drawing to the WebSocket server
            const lastDrawing = updatedDrawingData[updatedDrawingData.length - 1];
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log('stopDrawing - sending drawing data:', lastDrawing);
                const message = {
                    DataType: 'drawing',
                    Data: JSON.stringify(currentDrawing)
                };
                ws.send(JSON.stringify(message));
            }

            // Return the updated drawing data array
            return updatedDrawingData;
        });

        // Reset the current drawing to null.
        setCurrentDrawing(null);
    };

    useEffect(() => {
        if (!isDrawing && drawingData.length > 0) {
            const currentDrawing = drawingData[drawingData.length - 1];
            if (currentDrawing.type && currentDrawing.startX !== undefined && currentDrawing.endX !== undefined) {
                console.log("Final drawing data to send:", currentDrawing);
                // Consider sending the data here if needed, or rely on stopDrawing.
            }
        }
    }, [isDrawing, drawingData]);

    // Function to render the drawing on the canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!context) {
            console.error('Canvas context not available.');
            return;
        }

        context.clearRect(0, 0, context.canvas.width, context.canvas.height);

        // Draw all lines from the drawingData state
        drawingData.forEach((item) => {
            context.beginPath();
            context.moveTo(item.startX, item.startY);
            context.lineTo(item.endX, item.endY);
            context.stroke();
        });
    }, [drawingData]);


    // Effect to render the canvas whenever the drawing data changes
    useEffect(() => {
        console.log('Redrawing canvas with new data...');
        renderCanvas();
    }, [drawingData, renderCanvas]);

    useEffect(() => {
        console.log('drawingData updated:', drawingData);
    }, [drawingData]);

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
