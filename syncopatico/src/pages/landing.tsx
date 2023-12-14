import React, {useEffect, useState} from "react";
import { useNavigate } from 'react-router-dom';

const Landing: React.FC = () => {
    const navigate = useNavigate();
    const [showJoinInput, setShowJoinInput] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const generateRandomCode = (): number => {
        return Math.floor(1000 + Math.random() * 9000);
    };
    const isValidCode = (code: string): boolean => {
        return /^[0-9]{4}$/.test(code);
    };

    useEffect(() => {
        // Establish a WebSocket connection when the component mounts
        const socket = new WebSocket('ws://localhost:8080/ws');

        // Handle incoming messages from the server
        socket.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            console.log('Received message from server:', message);
            // Handle the message as needed
        });

        // Handle WebSocket close event
        socket.addEventListener('close', (event) => {
            if (event.wasClean) {
                console.log(`Connection closed cleanly, code=${event.code}, reason=${event.reason}`);
            } else {
                console.error('Connection died');
            }
        });

        // Handle errors
        socket.addEventListener('error', (error) => {
            console.error('WebSocket Error:', error);
        });

        // Clean up the WebSocket connection when the component unmounts
        return () => {
            socket.close();
        };
    }, []); // Empty dependency array ensures that this effect runs only once

    const createNewWhiteboard = () => {
        const code = generateRandomCode();
        navigate(`/whiteboard/${code}`);
    };

    const handleJoinSubmit = () => {
        console.log('Handle Join Submit called');

        if (isValidCode(joinCode)) {
            navigate(`/whiteboard/${joinCode}`); // This should navigate to the URL with the correct code
        } else {
            console.log('Invalid code. Please try again.');
        }
    };

    const handleJoinClick = () => {
        setShowJoinInput(true);
    };

    const handleGoBack = () => {
        setShowJoinInput(false);
        setJoinCode('');
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-50">
            <div className="text-center p-6 bg-white shadow rounded-xl transition-all w-full max-w-md">
                <h1 className="text-4xl font-bold mb-6 text-gray-900">Syncopatico</h1>
                {!showJoinInput ? (
                    <div className="space-y-4">
                        <button
                            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2 px-4 rounded-full shadow transition duration-300 w-full"
                            onClick={createNewWhiteboard}
                        >
                            Create New Whiteboard
                        </button>
                        <button
                            className="bg-green-500 hover:bg-green-400 text-white font-semibold py-2 px-4 rounded-full shadow transition duration-300 w-full"
                            onClick={handleJoinClick}
                        >
                            Join Whiteboard
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="text"
                            className="border border-gray-300 bg-white rounded-full py-2 px-4 text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-200 transition duration-300 w-full"
                            placeholder="Enter Code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            autoFocus
                        />
                        <button
                            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold py-2 rounded-full shadow transition duration-300 w-full"
                            onClick={handleJoinSubmit}
                        >
                            Join
                        </button>
                        <button
                            className="bg-red-500 hover:bg-red-400 text-white font-semibold py-2 px-4 rounded-full transition duration-300 w-full"
                            onClick={handleGoBack}
                        >
                            Go Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Landing;
