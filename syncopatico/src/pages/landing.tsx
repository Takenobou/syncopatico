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
        // Add your validation logic here (if needed)
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
            console.log('Is Valid Code:', true);
            console.log('Navigating to whiteboard:', `/whiteboard/${joinCode}`);
            navigate(`/whiteboard/${joinCode}`);
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
    // const createNewWhiteboard = () => {
    //     const code = generateRandomCode();
    //     navigate(`/whiteboard/${code}`);
    // };
    //
    // const handleJoinSubmit = () => {
    //     console.log('Handle Join Submit called');
    //
    //     if (isValidCode(joinCode)) {
    //         console.log('Is Valid Code:', true);
    //         console.log('Navigating to whiteboard:', `/whiteboard/${joinCode}`);
    //         navigate(`/whiteboard/${joinCode}`);
    //     } else {
    //         console.log('Invalid code. Please try again.');
    //     }
    // };
    //
    //
    //
    // const handleJoinClick = () => {
    //     setShowJoinInput(true);
    // };
    //
    // const handleGoBack = () => {
    //     setShowJoinInput(false);
    //     setJoinCode('');
    // };



    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="text-center p-8 bg-white shadow-lg rounded-xl transition-all w-1/4">
                <h1 className="text-5xl font-extrabold mb-10 text-gray-900">Syncopatico</h1>
                {!showJoinInput ? (
                    <div className="space-y-4">
                        <button
                            className="bg-gray-200 hover:bg-green-300 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow transition duration-300 w-full"
                            onClick={createNewWhiteboard}
                        >
                            Create New
                        </button>
                        <button
                            className="bg-gray-200 hover:bg-blue-300 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow transition duration-300 w-full"
                            onClick={handleJoinClick}
                        >
                            Join
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input
                            type="text"
                            className="border-2 border-gray-300 bg-white rounded-lg py-2 px-4 text-gray-800 shadow-inner focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition duration-300 w-full"
                            placeholder="Enter Code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            autoFocus
                        />
                        <button
                            className="bg-gray-200 hover:bg-blue-300 text-gray-800 font-semibold py-2 rounded-lg shadow transition duration-300 w-full"
                            onClick={handleJoinSubmit}
                        >
                            Join
                        </button>
                        <button
                            className="bg-gray-200 hover:bg-red-300 text-gray-800 font-semibold py-2 px-6 rounded-lg transition duration-300 w-full"
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
