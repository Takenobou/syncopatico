import './index.css'
import React from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from "./pages/landing.tsx";
import Whiteboard from "./pages/whiteboard.tsx";
const App: React.FC = () => {

  return (
    <>
        <BrowserRouter>
            <div className="">
                <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/whiteboard/:code" element={<Whiteboard />} />
                </Routes>
            </div>
        </BrowserRouter>
    </>
  )
}

export default App
