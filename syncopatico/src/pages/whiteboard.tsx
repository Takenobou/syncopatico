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
                const obj: OuterLayer = JSON.parse(event.data);
                console.log(obj.dataType);
                if (obj.dataType === 'drawing') {
                    const drawingObject = JSON.parse(obj.data);
                    console.log("Message datatype (layer 2)", drawingObject.DataType)

                    setDrawingData(prevDrawingData => {
                        console.log('Updating drawing data with:', drawingObject);
                        return [...prevDrawingData, drawingObject];
                    });
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

        if (!currentDrawing) return;

        setDrawingData((prevDrawingData) => {
            return prevDrawingData.map((data, index) => {
                if (index === prevDrawingData.length - 1 && currentDrawing) {
                    return {...data, ...currentDrawing};
                }
                return data;
            });
        });

        setCurrentDrawing(null);
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

        // Draw all lines from the drawingData state
        drawingData.forEach((item) => {
            console.log("Drawing tool received:", item)
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

    useEffect(() => {
        if (!isDrawing && drawingData.length > 0) {
            const lastDrawing = drawingData[drawingData.length - 1];
            if (lastDrawing.type && lastDrawing.startX !== undefined && lastDrawing.endX !== undefined) {
                console.log("Final drawing data to send:", lastDrawing);

                // Send the last drawing to the WebSocket server
                if (ws && ws.readyState === WebSocket.OPEN) {
                    console.log('useEffect - sending drawing data:', lastDrawing);
                    const message = {
                        DataType: 'drawing',
                        Data: JSON.stringify(lastDrawing)
                    };
                    ws.send(JSON.stringify(message));
                }
            }
        }
    }, [isDrawing, drawingData, ws]);

    return (
        <div>
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
