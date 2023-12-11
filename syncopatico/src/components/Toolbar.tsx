import React from 'react';
import { FiSquare, FiCircle, FiMinus, FiType } from 'react-icons/fi';

type Props = {
    setCurrentTool: (tool: 'line' | 'circle' | 'rectangle' | 'text') => void;
};

const Toolbar: React.FC<Props> = ({ setCurrentTool }) => {
    return (
        <div className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-200 space-x-2">
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
            </button>
            {/* Add more buttons or options as needed */}
        </div>
    );
};

export default Toolbar;
