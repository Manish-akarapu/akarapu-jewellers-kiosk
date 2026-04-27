import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css'; 

// --- THE MASTER CATALOG ---
const EARRING_CATALOG = [
  { id: "e1", name: "ANTIQUE JHUMKA", path: "/e1.png", w: 0.22, h: 1.5, x: -6, y: 0 },
  { id: "e2", name: "DIAMOND DROP", path: "/e2.png", w: 0.15, h: 1.6, x: -4, y: 3 }, 
  { id: "e3", name: "NAWABI JHUMKA", path: "/e3.png", w: 0.22, h: 1.5, x: -5, y: 1 },
  { id: "e4", name: "TEARDROP SWIRL", path: "/e4.png", w: 0.17, h: 1.3, x: -3, y: 3 }, 
  { id: "e5", name: "GOLD CHANDELIER", path: "/e5.png", w: 0.24, h: 1.4, x: -3, y: 5 }  
];

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null); 
  
  const [activeItem, setActiveItem] = useState(EARRING_CATALOG[0].path);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);

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

  const handleUpdateItem = (item) => {
    setActiveItem(item.path);
    itemRef.current = item.path;
    
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
      
      ctx.shadowColor = "rgba(0, 0, 0, 0.45)"; 
      ctx.shadowBlur = 15;                    
      ctx.shadowOffsetY = 6;

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const faceWidth = Math.abs(landmarks[454].x - landmarks[234].x) * canvas.width;
        
        // --- 3D MATH PREPARATION ---
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        
        // 1. Calculate Head Roll (Tilting head left to shoulder or right to shoulder)
        const headRoll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        
        // 2. Calculate Head Yaw (Turning head to look left or right)
        const faceCenterX = (landmarks[234].x + landmarks[454].x) / 2;
        const headYaw = nose.x - faceCenterX; 

        const activeData = EARRING_CATALOG.find(item => item.path === itemRef.current) || EARRING_CATALOG[0];
        const anchors = [{ id: 234, side: "left" }, { id: 454, side: "right" }];
        
        anchors.forEach(a => {
          const pt = landmarks[a.id];
          if (!pt) return;

          let x = (1 - pt.x) * canvas.width;
          let y = pt.y * canvas.height;

          // Apply manual calibration offsets directly to the pivot point
          y = y + (faceWidth * (offsetRefY.current / 100));
          const push = faceWidth * (offsetRefX.current / 100);
          x = (a.side === "left") ? x - push : x + push;

          // --- Z-DEPTH: DYNAMIC SCALING ---
          // If turning right, left side grows (+ yaw), right side shrinks (- yaw)
          let zScale = 1.0;
          if (a.side === "left") zScale = 1 + (headYaw * 3);
          else zScale = 1 - (headYaw * 3);
          
          // Clamp the scale so it doesn't get ridiculously large or completely disappear
          zScale = Math.max(0.6, Math.min(zScale, 1.4));

          const eW = faceWidth * activeData.w * zScale;
          const eH = eW * activeData.h;

          const activeImg = images[itemRef.current];
          if (activeImg && activeImg.complete) {
            ctx.save();
            
            // Move the canvas origin exactly to the earlobe
            ctx.translate(x, y);
            
            // --- GRAVITY ANCHORING ---
            // Counter-rotate the earring so it always points down, resisting the head tilt
            ctx.rotate(-headRoll * 0.8); // 0.8 adds a slight "stiffness" to the gold
            
            // Draw the image around the new pivot point
            ctx.drawImage(activeImg, -eW/2, 0, eW, eH);
            
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

      <div className="item-selector" style={{ bottom: "80px", padding: "0 20px" }}>
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

      <button className="admin-toggle-btn" onClick={() => setShowCalibration(!showCalibration)}>⚙️</button>

      {showCalibration && (
        <div className="calibration-panel" style={{ bottom: "20px" }}>
          <label>X: <b>{offsetX}</b></label>
          <input type="range" min="-20" max="40" value={offsetX} onChange={(e) => {setOffsetX(Number(e.target.value)); offsetRefX.current = Number(e.target.value);}} />
          <label style={{marginLeft: "15px"}}>Y: <b>{offsetY}</b></label>
          <input type="range" min="-10" max="50" value={offsetY} onChange={(e) => {setOffsetY(Number(e.target.value)); offsetRefY.current = Number(e.target.value);}} />
        </div>
      )}
    </div>
  );
}

export default App;