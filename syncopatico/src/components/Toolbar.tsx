import React from 'react';
import {FiSquare, FiCircle, FiMinus, FiType, FiMove, FiPlus} from 'react-icons/fi';

type Props = {
    setCurrentTool: (tool: 'pan' | 'line' | 'circle' | 'rectangle' | 'text') => void;
    isTextToolSelected: boolean;
    textInput: string;
    setTextInput: React.Dispatch<React.SetStateAction<string>>;
    zoomIn: () => void;
    zoomOut: () => void;
};


const Toolbar: React.FC<Props> = ({ setCurrentTool, isTextToolSelected, textInput, setTextInput, zoomIn, zoomOut }) => {
    // ... existing code

    const renderTextInput = () => {
        if (!isTextToolSelected) return null;

        return (
            <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text"
                className="ml-4 text-sm p-1 border border-gray-300 rounded" // Adjust styling as needed
            />
        );
    };

    return (
        <div className="fixed top-5 left-5 z-10 flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-200 space-x-2">
            {/* Your buttons go here */}
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={() => setCurrentTool('pan')}
            >
                <FiMove className="h-4 w-4" /> {/* Replace FiMove with the icon of your choice */}
                <span className="text-xs">Pan</span>
            </button>
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={() => setCurrentTool('line')}
            >
                <FiMinus className="h-4 w-4" />
                <span className="text-xs">Line</span>
            </button>
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={() => setCurrentTool('circle')}
            >
                <FiCircle className="h-4 w-4" />
                <span className="text-xs">Circle</span>
            </button>
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={() => setCurrentTool('rectangle')}
            >
                <FiSquare className="h-4 w-4" />
                <span className="text-xs">Rectangle</span>
            </button>
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={() => setCurrentTool('text')}
            >
                <FiType className="h-4 w-4" />
                <span className="text-xs">Text</span>
                {renderTextInput()}
            </button>

            {/* Zoom In Button */}
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={zoomIn}
            >
                <FiPlus className="h-4 w-4" />
                <span className="text-xs">Zoom In</span>
            </button>

            {/* Zoom Out Button */}
            <button
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-500 focus:outline-none"
                onClick={zoomOut}
            >
                <FiMinus className="h-4 w-4" />
                <span className="text-xs">Zoom Out</span>
            </button>
            {/* Add more buttons or options as needed */}
        </div>
    );
};

export default Toolbar;
