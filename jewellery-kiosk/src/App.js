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

        const leftEdge = landmarks[234];  
        const rightEdge = landmarks[454]; 
        const nose = landmarks[1];
        const chin = landmarks[152];

        const rawFaceWidth = Math.abs(rightEdge.x - leftEdge.x) * canvas.width;
        const faceWidth = Math.min(rawFaceWidth, canvas.width * 0.4); 
        
        const baseWidth = faceWidth * 0.22; 
        const baseHeight = baseWidth * 1.6; 

        const leftDist = Math.abs(nose.x - leftEdge.x);
        const rightDist = Math.abs(nose.x - rightEdge.x);

        // BACK TO THE OUTER EDGES
        const anchors = [
          { id: 234, side: "left" }, 
          { id: 454, side: "right" } 
        ];

        anchors.forEach((anchor) => {
          const point = landmarks[anchor.id];
          if (!point) return;

          if (anchor.side === "left" && leftDist < rightDist * 0.25) return;
          if (anchor.side === "right" && rightDist < leftDist * 0.25) return;

          let x = (1 - point.x) * canvas.width; 
          let y = point.y * canvas.height;

          // 1. FORCE IT OUTSIDE THE FACE (Off the beard/cheeks)
          const outwardPush = faceWidth * 0.12; 
          if (anchor.side === "left") {
            x = x - outwardPush; 
          } else {
            x = x + outwardPush; 
          }

          // 2. DROP IT DOWN TO THE EARLOBE
          const downwardDrop = faceWidth * 0.15;
          const pitch = (nose.y - chin.y) * canvas.height * 0.1;
          y = y + downwardDrop + pitch;

          if (activeImg && activeImg.complete) {
            canvasCtx.save(); 

            const sideDist = anchor.side === "left" ? leftDist : rightDist;
            const centerRatio = sideDist / Math.abs(leftEdge.x - rightEdge.x);
            const perspectiveScale = Math.min(1, Math.max(0.15, centerRatio * 2.2));
            const currentWidth = baseWidth * perspectiveScale;

            const dy = rightEdge.y - leftEdge.y;
            const dx = rightEdge.x - leftEdge.x;
            const headAngle = Math.atan2(dy, dx); 
            
            canvasCtx.translate(x, y);
            canvasCtx.rotate(-headAngle * 0.75); 

            canvasCtx.shadowColor = "rgba(0, 0, 0, 0.6)"; 
            canvasCtx.shadowBlur = 8; 
            canvasCtx.shadowOffsetX = anchor.side === "left" ? -4 : 4; 
            canvasCtx.shadowOffsetY = 8; 

            // Center the image directly on this new floating coordinate
            canvasCtx.drawImage(activeImg, -(currentWidth / 2), 0, currentWidth, baseHeight);

            canvasCtx.restore(); 
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