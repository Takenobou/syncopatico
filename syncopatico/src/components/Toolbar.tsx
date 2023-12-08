import React from 'react';

type Props = {
    setCurrentTool: (tool: 'line' | 'circle' | 'rectangle' | 'text') => void;
};

const Toolbar: React.FC<Props> = ({ setCurrentTool }) => {
    return (
        <div className="toolbar">
            <button onClick={() => setCurrentTool('line')}>Line</button>
            <button onClick={() => setCurrentTool('circle')}>Circle</button>
            <button onClick={() => setCurrentTool('rectangle')}>Rectangle</button>
            <button onClick={() => setCurrentTool('text')}>Text</button>
            {/* Add more buttons or options as needed */}
        </div>
    );
};

export default Toolbar;
