import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css'; 

// --- THE MASTER CATALOG WITH MEMORY ---
// w: width, h: height
// x: horizontal perfect spot, y: vertical perfect spot
const EARRING_CATALOG = [
  { id: "e1", name: "ANTIQUE JHUMKA", path: "/e1.png", w: 0.22, h: 1.5, x: 0, y: 13 },
  { id: "e2", name: "DIAMOND DROP", path: "/e2.png", w: 0.15, h: 1.6, x: 0, y: 13 }, 
  { id: "e3", name: "NAWABI JHUMKA", path: "/e3.png", w: 0.22, h: 1.5, x: 0, y: 13 },
  { id: "e4", name: "TEARDROP SWIRL", path: "/e4.png", w: 0.17, h: 1.3, x: 0, y: 13 }, 
  { id: "e5", name: "GOLD CHANDELIER", path: "/e5.png", w: 0.24, h: 1.4, x: 0, y: 13 }  
];

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null); 
  
  const [activeItem, setActiveItem] = useState(EARRING_CATALOG[0].path);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sliders now start at the exact position of the first earring
  const [offsetX, setOffsetX] = useState(EARRING_CATALOG[0].x);
  const [offsetY, setOffsetY] = useState(EARRING_CATALOG[0].y);
  
  const itemRef = useRef(EARRING_CATALOG[0].path);
  const offsetRefX = useRef(EARRING_CATALOG[0].x);
  const offsetRefY = useRef(EARRING_CATALOG[0].y);

  const images = useMemo(() => {
    const obj = {};
    EARRING_CATALOG.forEach(item => {
      const img = new Image();
      img.src = item.path;
      obj[item.path] = img;
    });
    return obj;
  }, []);

  // --- THE NEW AUTO-JUMP LOGIC ---
  const handleUpdateItem = (item) => {
    setActiveItem(item.path);
    itemRef.current = item.path;
    
    // Automatically move the sliders to the saved perfect spots
    setOffsetX(item.x);
    setOffsetY(item.y);
    offsetRefX.current = item.x;
    offsetRefY.current = item.y;
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7 
    });

    faceMesh.onResults((results) => {
      setIsLoaded(true);
      if (!canvasRef.current || !webcamRef.current?.video) return;
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const faceWidth = Math.abs(landmarks[454].x - landmarks[234].x) * canvas.width;
        const chin = landmarks[152];
        const nose = landmarks[1];

        const activeData = EARRING_CATALOG.find(item => item.path === itemRef.current) || EARRING_CATALOG[0];
        const anchors = [{ id: 234, side: "left" }, { id: 454, side: "right" }];
        
        anchors.forEach(a => {
          const pt = landmarks[a.id];
          if (!pt) return;

          let x = (1 - pt.x) * canvas.width;
          let y = pt.y * canvas.height;

          const pitchOffset = (nose.y - chin.y) * 0.5;
          y = y + (faceWidth * 0.16) + (pitchOffset * canvas.height * 0.2); 

          y = y + (faceWidth * (offsetRefY.current / 100));
          const push = faceWidth * (offsetRefX.current / 100);
          x = (a.side === "left") ? x - push : x + push;

          const eW = faceWidth * activeData.w;
          const eH = eW * activeData.h;

          const activeImg = images[itemRef.current];
          if (activeImg && activeImg.complete) {
            ctx.save();
            ctx.drawImage(activeImg, x - eW/2, y, eW, eH);
            ctx.restore();
          }
        });
      }
    });

    if (webcamRef.current?.video && !cameraRef.current) {
      cameraRef.current = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video.readyState === 4) {
            await faceMesh.send({ image: webcamRef.current.video });
          }
        },
        width: 640, height: 480,
      });
      cameraRef.current.start();
    }
    return () => { if (cameraRef.current) { cameraRef.current.stop(); } faceMesh.close(); };
  }, [images]);

  return (
    <div className="app-wrapper">
      {!isLoaded && <div className="loading-overlay">Initializing Kiosk...</div>}
      
      <header className="app-header">
        <h1>SHRI AKARAPU KUMARASWAMY JEWELLERS</h1>
        <p style={{color: "#aaa", fontSize: "0.9rem", letterSpacing: "1px"}}>EXCLUSIVE EARRING COLLECTION</p>
      </header>

      <div className="kiosk-container">
        <Webcam ref={webcamRef} mirrored={true} videoConstraints={{ facingMode: "user" }} className="video-layer" />
        <canvas ref={canvasRef} className="canvas-layer" />
      </div>

      <div className="item-selector" style={{ bottom: "100px", padding: "0 20px" }}>
        {EARRING_CATALOG.map((item) => (
          <button 
            key={item.id}
            onClick={() => handleUpdateItem(item)} 
            className={activeItem === item.path ? "active" : ""}
            style={{ marginBottom: "10px" }}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="calibration-panel">
        <label>X: <b>{offsetX}</b></label>
        <input type="range" min="-20" max="40" value={offsetX} onChange={(e) => {setOffsetX(Number(e.target.value)); offsetRefX.current = Number(e.target.value);}} />
        
        <label style={{marginLeft: "15px"}}>Y: <b>{offsetY}</b></label>
        <input type="range" min="-10" max="50" value={offsetY} onChange={(e) => {setOffsetY(Number(e.target.value)); offsetRefY.current = Number(e.target.value);}} />
      </div>
    </div>
  );
}

export default App;