import React, {useCallback, useEffect, useRef, useState} from 'react';
import { useParams } from 'react-router-dom';
import Toolbar from "../components/Toolbar.tsx";

// Define a type for the drawing data
type DrawingData = {
    type: 'pan' | 'line' | 'circle' | 'rectangle' | 'text';
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    text?: string;
    fontSize?: string;
    fontFamily?: string;
};

type OuterLayer = {
    dataType: string;
    data: string;
};

const Whiteboard = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingData, setDrawingData] = useState<DrawingData[]>([]);
    const [currentTool, setCurrentTool] = useState< 'pan' | 'line' | 'circle' | 'rectangle' | 'text'>('line');
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<DrawingData | null>(null);
    const [textInput, setTextInput] = useState(''); // State for text input
    const { code } = useParams();
    const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
    const [viewOffset, setViewOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [zoomLevel, setZoomLevel] = useState(1);
    const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected', 'disconnected', or 'error'
    const [showConnectedAlert, setShowConnectedAlert] = useState(false);

    useEffect(() => {
        // Initialize WebSocket connection
        const initializeWebSocket = () => {
            const ws = new WebSocket(`ws://localhost:8080/ws/${code}`);
            let alertTimeout: number | undefined;

            ws.onopen = () => {
                console.log("WebSocket opened");
                setConnectionStatus('connected');
                setShowConnectedAlert(true); // Show the connected alert

                // Set a timeout to hide the alert after 10 seconds
                alertTimeout = setTimeout(() => {
                    setShowConnectedAlert(false);
                }, 10000);
            };

            ws.onclose = () => {
                console.log("WebSocket closed");
                setConnectionStatus('disconnected'); // Update status to disconnected
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setConnectionStatus('error'); // Update status to error on WebSocket error
            };
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
            return () => {
                clearTimeout(alertTimeout);
            };
        };

        initializeWebSocket();

        return () => {
            // Clean up the WebSocket connection
            ws?.close();
        };
    }, [code, ws]);

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
        const { adjustedX, adjustedY } = getAdjustedCoordinates(e);
        const { offsetX, offsetY } = e.nativeEvent;
        if (currentTool === 'pan') {
            setPanStart({ x: offsetX, y: offsetY });
            e.preventDefault();
        } else {
            if (currentTool === 'text') {
                const newDrawing: DrawingData = {
                    type: 'text',
                    startX: adjustedX,
                    startY: adjustedY,
                    endX: adjustedX,
                    endY: adjustedY,
                    text: textInput,
                    fontSize: '16px',
                    fontFamily: 'Arial',
                };
                setCurrentDrawing(newDrawing);
                setDrawingData(prevDrawingData => [...prevDrawingData, newDrawing]);
                setIsDrawing(false);
            } else {
                setIsDrawing(true);
                const newDrawing: DrawingData = {
                    type: currentTool,
                    startX: adjustedX,
                    startY: adjustedY,
                    endX: adjustedX,
                    endY: adjustedY,
                };
                setCurrentDrawing(newDrawing);
                setDrawingData(prevDrawingData => [...prevDrawingData, newDrawing]);
            }
        }
    };

    const draw = (e: React.MouseEvent) => {
        if (currentTool === 'pan' && panStart) {
            const { offsetX, offsetY } = e.nativeEvent;
            setViewOffset({
                x: viewOffset.x + (offsetX - panStart.x),
                y: viewOffset.y + (offsetY - panStart.y)
            });
            setPanStart({ x: offsetX, y: offsetY });
            e.preventDefault();
        } else if (isDrawing && currentDrawing) {
            const { adjustedX, adjustedY } = getAdjustedCoordinates(e);
            const updatedDrawing = {
                ...currentDrawing,
                endX: adjustedX,
                endY: adjustedY,
            };
            setCurrentDrawing(updatedDrawing);
        }
    };

    // Use sendDrawingData function where appropriate, e.g., in stopDrawing function
    const stopDrawing = (e: React.MouseEvent) => {
        if (currentTool === 'pan') {
            setPanStart(null);
            e.preventDefault();
        } else {
            setIsDrawing(false);
            if (!currentDrawing) return;
            const { adjustedX, adjustedY } = getAdjustedCoordinates(e);
            if (currentTool === 'text' && textInput.trim() !== '') {
                const textDrawing = {
                    ...currentDrawing,
                    text: textInput
                };
                sendDrawingData(textDrawing);
                setTextInput('');
            } else if (currentDrawing) {
                const finalDrawing = {
                    ...currentDrawing,
                    endX: adjustedX,
                    endY: adjustedY,
                };
                sendDrawingData(finalDrawing);
                setDrawingData(prevDrawingData => [...prevDrawingData, finalDrawing]);
            }

            setCurrentDrawing(null);
        }
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

    const drawDotGrid = (
        context: CanvasRenderingContext2D,
        gridSpacing: number,
        dotSize: number,
        viewOffset: { x: number, y: number },
        zoomLevel: number
    ) => {
        const width = context.canvas.width;
        const height = context.canvas.height;

        // Adjust the start and end points based on the viewOffset and zoomLevel
        const startX = -viewOffset.x / zoomLevel;
        const startY = -viewOffset.y / zoomLevel;
        const endX = (width - viewOffset.x) / zoomLevel;
        const endY = (height - viewOffset.y) / zoomLevel;

        context.fillStyle = '#CCCCCC'; // Set the dot color

        // Adjust the loop to start and end at the right points
        for (let x = startX - startX % gridSpacing; x < endX; x += gridSpacing) {
            for (let y = startY - startY % gridSpacing; y < endY; y += gridSpacing) {
                context.beginPath();
                context.arc(x, y, dotSize, 0, Math.PI * 2, true);
                context.fill();
            }
        }
    };

    // Function to render the drawing on the canvas
    const renderCanvas = useCallback(() => {
        requestAnimationFrame(() => {
            const canvas = canvasRef.current;
            const context = canvas?.getContext('2d');
            if (!context) {
                console.error('Canvas context not available.');
                return;
            }

            context.clearRect(0, 0, context.canvas.width, context.canvas.height);
            context.save(); // Save the current context state

            // Apply zoom and pan transformations
            context.translate(viewOffset.x, viewOffset.y);
            context.scale(zoomLevel, zoomLevel);

            drawDotGrid(context, 50 * zoomLevel, 2, viewOffset, zoomLevel);

            // Draw all shapes from the drawingData state
            drawingData.forEach((item) => {
                drawShape(context, item);
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
            if (isDrawing && currentDrawing) {
                drawShape(context, currentDrawing);
            }
            // Reset the transformation after drawing
            context.resetTransform();
        });
    }, [drawingData, viewOffset, zoomLevel, isDrawing, currentDrawing]);

    const zoomIn = () => {
        setZoomLevel(zoomLevel => Math.min(zoomLevel + 0.1, 5)); // Max zoom level 5x
    };

    const zoomOut = () => {
        setZoomLevel(zoomLevel => Math.max(zoomLevel - 0.1, 0.1)); // Min zoom level 0.1x
    };

    const drawShape = (context: CanvasRenderingContext2D, item: DrawingData) => {
        context.beginPath();
        switch (item.type) {
            case 'line':
                context.moveTo(item.startX, item.startY);
                context.lineTo(item.endX, item.endY);
                break;
            case 'circle': {
                const radius = Math.sqrt(Math.pow(item.endX - item.startX, 2) + Math.pow(item.endY - item.startY, 2));
                context.arc(item.startX, item.startY, radius, 0, 2 * Math.PI);
                break;
            }
            case 'rectangle':
                context.rect(item.startX, item.startY, item.endX - item.startX, item.endY - item.startY);
                break;
            case 'text':
                if (item.text) {
                    context.font = `${item.fontSize} ${item.fontFamily}`;
                    context.fillText(item.text, item.startX, item.startY);
                }
                break;
        }
        context.stroke();
    };

    const getAdjustedCoordinates = (e: React.MouseEvent) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const adjustedX = (offsetX - viewOffset.x) / zoomLevel;
        const adjustedY = (offsetY - viewOffset.y) / zoomLevel;
        return { adjustedX, adjustedY };
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

    const adjustCanvasSize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            canvas.width = viewportWidth;
            canvas.height = viewportHeight;
        }
    };

    useEffect(() => {
        adjustCanvasSize();
        window.addEventListener('resize', adjustCanvasSize);

        return () => {
            window.removeEventListener('resize', adjustCanvasSize);
        };
    }, []);


    return (
        <div className="flex flex-col h-screen relative">
            {/* Alerts */}
            {showConnectedAlert && (
                <div className="absolute top-0 right-0 m-4 p-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-green-900 dark:text-green-400 transition transform ease-out duration-300">
                    <label>You are connected. Code: {code}</label>
                </div>
            )}
            {connectionStatus === 'disconnected' && (
                <div
                    className="absolute top-0 right-0 m-4 p-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900 dark:text-red-400 transition transform ease-out duration-300">
                    <label>You have been disconnected.</label>
                </div>
            )}
            {connectionStatus === 'error' && (
                <div
                    className="absolute top-0 right-0 m-4 p-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300 transition transform ease-out duration-300">
                    <label>Connection error occurred.</label>
                </div>
            )}

            {/* Canvas */}
            <canvas
                className="flex-grow"
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />

            {/* Toolbar */}
            <div className="flex justify-center items-center space-x-4 p-4">
                <Toolbar
                    setCurrentTool={setCurrentTool}
                    isTextToolSelected={currentTool === 'text'}
                    textInput={textInput}
                    setTextInput={setTextInput}
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
