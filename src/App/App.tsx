import React, { useState, useEffect, useRef } from "react";
import { WaveFile } from "wavefile";
import { Route, Routes, BrowserRouter } from "react-router-dom";
import axios from "axios";
import App2 from "./App2";
import App3 from "./App3";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App2 />} />
        <Route path="/3" element={<App3 />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
