import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";

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
        const chin = landmarks[152]; // Used to calculate up/down tilt (Pitch)

        const anchors = [
          { id: 234, side: "left" }, 
          { id: 454, side: "right" } 
        ];

        anchors.forEach((anchor) => {
          const point = landmarks[anchor.id];
          if (!point) return;

          // 2. Visibility Check (Hides earring when you turn away completely)
          const distanceToNose = Math.abs(nose.x - point.x);
          if (distanceToNose < 0.05) return; 

          let x = (1 - point.x) * canvas.width;
          let y = point.y * canvas.height;

          // 3. Pitch Adjustment: If user looks UP, the earrings should hang DOWN lower
          const pitchOffset = (nose.y - chin.y) * 0.5; // Calculates head tilt up/down

          y = y + (faceWidth * 0.16) + (pitchOffset * canvas.height * 0.2); 

          const dynamicPush = (faceWidth * 0.08) * (distanceToNose * 4);

          if (anchor.side === "left") {
            x = x + dynamicPush; 
          } else {
            x = x - dynamicPush; 
          }

          if (activeImg && activeImg.complete) {
            // *** THE 2.5D MAGIC: DYNAMIC SHADOWS ***
            // This casts a dark, blurred shadow on your neck behind the image
            canvasCtx.shadowColor = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
            canvasCtx.shadowBlur = 12; // Softness of the shadow
            canvasCtx.shadowOffsetX = anchor.side === "left" ? -5 : 5; // Pushes shadow toward the neck
            canvasCtx.shadowOffsetY = 10; // Pushes shadow down

            // Draw the earring
            canvasCtx.drawImage(activeImg, x - (eWidth / 2), y, eWidth, eHeight);

            // Reset shadows so it doesn't mess up the next frame
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
    <div style={{ textAlign: "center", backgroundColor: "#000", minHeight: "100vh", color: "#D4AF37", fontFamily: "serif" }}>
      <header style={{ padding: "30px" }}>
        <h1 style={{ fontSize: "2.8rem", margin: 0, letterSpacing: "2px" }}>SHRI AKARAPU KUMARASWAMY JEWELLERS</h1>
        <p style={{ color: "#fff", fontSize: "1.2rem", fontStyle: "italic", marginTop: "10px" }}>Virtual Try-On Suite</p>
      </header>
      
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: "20px" }}>
        <div style={{ position: "relative", border: "8px solid #D4AF37", borderRadius: "10px", backgroundColor: "#111", display: "inline-block", boxShadow: "0 10px 30px rgba(212, 175, 55, 0.3)" }}>
          
          <Webcam 
            ref={webcamRef} 
            mirrored={true} 
            videoConstraints={{ width: 640, height: 480 }}
            style={{ display: "block", width: "640px", height: "480px", borderRadius: "2px" }} 
          />
          
          <canvas 
            ref={canvasRef} 
            style={{ position: "absolute", top: 0, left: 0, width: "640px", height: "480px", zIndex: 10, pointerEvents: "none" }} 
          />
          
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <button 
          onClick={() => changeEarring("/earring1.png")} 
          style={activeButton === "/earring1.png" ? activeBtnStyle : btnStyle}
        >
          ANTIQUE JHUMKA
        </button>
        <button 
          onClick={() => changeEarring("/earring2.png")} 
          style={activeButton === "/earring2.png" ? activeBtnStyle : btnStyle}
        >
          DIAMOND DROP
        </button>
      </div>
      
      <footer style={{ marginTop: "30px", color: "#666", fontSize: "0.9rem" }}>
        <p>Akarapu Jewellers Kiosk v1.0 • Nagarkurnool</p>
      </footer>
    </div>
  );
}

const btnStyle = { padding: "18px 45px", fontSize: "18px", margin: "0 20px", backgroundColor: "#222", color: "#D4AF37", border: "2px solid #D4AF37", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", transition: "all 0.3s ease" };
const activeBtnStyle = { ...btnStyle, backgroundColor: "#D4AF37", color: "black", boxShadow: "0 0 20px rgba(212, 175, 55, 0.6)" };

export default App;