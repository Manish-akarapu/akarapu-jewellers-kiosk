import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css'; 

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null); 
  
  const [activeButton, setActiveButton] = useState("/earring1.png");
  const earringRef = useRef("/earring1.png");

  const images = useMemo(() => {
    const i1 = new Image(); i1.src = "/earring1.png";
    const i2 = new Image(); i2.src = "/earring2.png";
    return { "/earring1.png": i1, "/earring2.png": i2 };
  }, []);

  const changeEarring = (style) => {
    setActiveButton(style);
    earringRef.current = style; 
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.8,
      minTrackingConfidence: 0.8 
    });

    faceMesh.onResults((results) => {
      if (!canvasRef.current || !webcamRef.current || !webcamRef.current.video) return;
      
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const canvasCtx = canvas.getContext("2d");

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const activeImg = images[earringRef.current];

        // 1. Face Width & Size
        const rawFaceWidth = Math.abs(landmarks[454].x - landmarks[234].x) * canvas.width;
        const faceWidth = Math.min(rawFaceWidth, canvas.width * 0.4); 
        
        const eWidth = faceWidth * 0.22; 
        const eHeight = eWidth * 1.5; 

        const nose = landmarks[1];
        const chin = landmarks[152];

        const anchors = [
          { id: 234, side: "left" }, 
          { id: 454, side: "right" } 
        ];

        anchors.forEach((anchor) => {
          const point = landmarks[anchor.id];
          if (!point) return;

          const distanceToNose = Math.abs(nose.x - point.x);
          if (distanceToNose < 0.05) return; 

          let x = (1 - point.x) * canvas.width;
          let y = point.y * canvas.height;

          const pitchOffset = (nose.y - chin.y) * 0.5; 

          y = y + (faceWidth * 0.16) + (pitchOffset * canvas.height * 0.2); 

          const dynamicPush = (faceWidth * 0.08) * (distanceToNose * 4);

          if (anchor.side === "left") {
            x = x + dynamicPush; 
          } else {
            x = x - dynamicPush; 
          }

          if (activeImg && activeImg.complete) {
            canvasCtx.shadowColor = "rgba(0, 0, 0, 0.5)"; 
            canvasCtx.shadowBlur = 12; 
            canvasCtx.shadowOffsetX = anchor.side === "left" ? -5 : 5; 
            canvasCtx.shadowOffsetY = 10; 

            canvasCtx.drawImage(activeImg, x - (eWidth / 2), y, eWidth, eHeight);

            canvasCtx.shadowColor = "transparent";
          }
        });
      }
    });

    if (webcamRef.current && webcamRef.current.video && !cameraRef.current) {
      cameraRef.current = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current?.video.readyState === 4) {
            try {
              await faceMesh.send({ image: webcamRef.current.video });
            } catch (e) {}
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current.start();
    }

    return () => {
      faceMesh.close();
    };
  }, [images]);

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <h1>SHRI AKARAPU KUMARASWAMY JEWELLERS</h1>
        <p>Virtual Try-On Suite</p>
      </header>
      
      <div className="kiosk-container">
        <div className="video-container">
          <Webcam 
            ref={webcamRef} 
            mirrored={true} 
            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
            className="video-layer" 
          />
          <canvas 
            ref={canvasRef} 
            className="canvas-layer" 
          />
        </div>
      </div>

      <div className="button-container">
        <button 
          onClick={() => changeEarring("/earring1.png")} 
          className={`kiosk-btn ${activeButton === "/earring1.png" ? "active" : ""}`}
        >
          ANTIQUE JHUMKA
        </button>
        <button 
          onClick={() => changeEarring("/earring2.png")} 
          className={`kiosk-btn ${activeButton === "/earring2.png" ? "active" : ""}`}
        >
          DIAMOND DROP
        </button>
      </div>
      
      <footer className="app-footer">
        <p>Akarapu Jewellers Kiosk v1.0 • Nagarkurnool</p>
      </footer>
    </div>
  );
}

export default App;