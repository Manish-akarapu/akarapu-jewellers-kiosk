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

        // 1. Calculate Face Size for Scaling
        const rawFaceWidth = Math.abs(landmarks[454].x - landmarks[234].x) * canvas.width;
        const faceWidth = Math.min(rawFaceWidth, canvas.width * 0.4); 
        
        const eWidth = faceWidth * 0.25; // Made earrings slightly wider to bridge any remaining gaps
        const eHeight = eWidth * 1.6; 

        const nose = landmarks[1];

        // 2. Exact Earlobe Landmarks
        const anchors = [
          { id: 177, side: "left" },  // Exact left earlobe point
          { id: 401, side: "right" }  // Exact right earlobe point
        ];

        anchors.forEach((anchor) => {
          const point = landmarks[anchor.id];
          if (!point) return;

          // 3. Hide earring if face turns away
          const distanceToNose = Math.abs(nose.x - point.x);
          if (distanceToNose < 0.05) return; 

          // 4. Exact Coordinates
          let x = (1 - point.x) * canvas.width; 
          let y = point.y * canvas.height;

          // Push the earring slightly *inward* toward the cheek to prevent "air gaps" on narrow phones
          const gapFix = (faceWidth * 0.05); 
          if (anchor.side === "left") {
            x = x + gapFix; 
          } else {
            x = x - gapFix; 
          }

          if (activeImg && activeImg.complete) {
            canvasCtx.save(); // Save the canvas state before drawing

            // 5. Dynamic Rotation (Swing physics)
            // Calculate how tilted the head is left-to-right
            const rollOffset = landmarks[234].y - landmarks[454].y; 
            const rotationAngle = (anchor.side === "left") ? rollOffset * 1.5 : rollOffset * -1.5;

            // Move the "drawing cursor" to the exact earlobe point
            canvasCtx.translate(x, y);
            
            // Apply rotation so the earring dangles naturally
            canvasCtx.rotate(rotationAngle);

            // Add drop shadow
            canvasCtx.shadowColor = "rgba(0, 0, 0, 0.6)"; 
            canvasCtx.shadowBlur = 10; 
            canvasCtx.shadowOffsetX = anchor.side === "left" ? -4 : 4; 
            canvasCtx.shadowOffsetY = 8; 

            // Draw the earring (adjusted to hang directly *below* the anchor point)
            canvasCtx.drawImage(activeImg, -(eWidth / 2), 0, eWidth, eHeight);

            canvasCtx.restore(); // Reset the canvas for the next frame
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