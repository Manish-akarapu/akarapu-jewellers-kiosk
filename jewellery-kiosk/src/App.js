import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css'; 

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null); 
  
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState("earrings"); // earrings, nose, neck
  const [selectedJewel, setSelectedJewel] = useState("/earring1.png");
  const [showExtra, setShowExtra] = useState(false);
  
  const itemRef = useRef("/earring1.png");
  const extraRef = useRef(false);
  const tabRef = useRef("earrings");

  // Calibration (We'll use these for the main earrings)
  const [offsetX, setOffsetX] = useState(0); 
  const [offsetY, setOffsetY] = useState(13); 
  const offsetRefX = useRef(0);
  const offsetRefY = useRef(13);

  const images = useMemo(() => {
    const names = ["earring1", "earring2", "extra", "nath", "puligoru", "kanthi", "stud"];
    const imgs = {};
    names.forEach(n => {
      const i = new Image();
      i.src = `/${n}.png`;
      imgs[`/${n}.png`] = i;
    });
    return imgs;
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    tabRef.current = tab;
    // Set default item for each tab
    if(tab === "earrings") { setSelectedJewel("/earring1.png"); itemRef.current = "/earring1.png"; }
    if(tab === "nose") { setSelectedJewel("/nath.png"); itemRef.current = "/nath.png"; }
    if(tab === "neck") { setSelectedJewel("/kanthi.png"); itemRef.current = "/kanthi.png"; }
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
      if (!canvasRef.current || !webcamRef.current?.video) return;
      const video = webcamRef.current.video;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const faceWidth = Math.abs(landmarks[454].x - landmarks[234].x) * canvas.width;
        const nose = landmarks[1];
        const chin = landmarks[152];

        // --- 1. EARRINGS LOGIC ---
        if (tabRef.current === "earrings") {
          const anchors = [{ id: 234, side: "left" }, { id: 454, side: "right" }];
          anchors.forEach(a => {
            const pt = landmarks[a.id];
            let x = (1 - pt.x) * canvas.width;
            let y = pt.y * canvas.height + (faceWidth * (offsetRefY.current / 100));
            const push = faceWidth * (offsetRefX.current / 100);
            x = (a.side === "left") ? x - push : x + push;

            const img = images[itemRef.current];
            if (img?.complete) {
                const ew = faceWidth * 0.22;
                ctx.drawImage(img, x - ew/2, y, ew, ew * 1.5);
            }

            if (extraRef.current) {
                const exImg = images["/extra.png"];
                if (exImg?.complete) {
                    const exW = faceWidth * 0.1;
                    const exX = (a.side === "left") ? x + 20 : x - 20;
                    ctx.drawImage(exImg, exX - exW/2, y - 30, exW, exW);
                }
            }
          });
        }

        // --- 2. NATH (CHEST-TO-NOSE) LOGIC ---
        if (tabRef.current === "nose") {
          const nostril = landmarks[279];
          const earAttach = landmarks[127]; // Side of face
          let nx = (1 - nostril.x) * canvas.width;
          let ny = nostril.y * canvas.height;
          let ex = (1 - earAttach.x) * canvas.width;
          
          const nathImg = images["/nath.png"];
          if (nathImg?.complete) {
            const nathW = Math.abs(ex - nx) * 1.3;
            ctx.drawImage(nathImg, nx - 10, ny - 10, nathW, nathW * 0.6);
          }
        }

        // --- 3. NECKLACE / PULI GORU LOGIC ---
        if (tabRef.current === "neck") {
          const neckX = (1 - chin.x) * canvas.width;
          const neckY = chin.y * canvas.height + 15;
          const neckImg = images[itemRef.current];
          if (neckImg?.complete) {
            const nw = faceWidth * 1.4;
            ctx.drawImage(neckImg, neckX - nw/2, neckY, nw, nw * 0.9);
          }
        }
      }
    });

    if (webcamRef.current?.video && !cameraRef.current) {
      cameraRef.current = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => { await faceMesh.send({ image: webcamRef.current.video }); },
        width: 640, height: 480,
      });
      cameraRef.current.start();
    }
    return () => faceMesh.close();
  }, [images]);

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <h1 style={{color: "#D4AF37", letterSpacing: "2px"}}>SHRI AKARAPU KUMARASWAMY JEWELLERS</h1>
        <div className="tab-menu">
          <button onClick={() => handleTabChange("earrings")} className={activeTab === "earrings" ? "active" : ""}>EARRINGS</button>
          <button onClick={() => handleTabChange("nose")} className={activeTab === "nose" ? "active" : ""}>NATH</button>
          <button onClick={() => handleTabChange("neck")} className={activeTab === "neck" ? "active" : ""}>NECKWEAR</button>
        </div>
      </header>

      <div className="kiosk-body">
        <div className="video-wrap">
          <Webcam ref={webcamRef} mirrored={true} className="video-feed" />
          <canvas ref={canvasRef} className="canvas-overlay" />
        </div>

        <div className="controls-side">
          <h3 style={{color: "#D4AF37"}}>Select Style</h3>
          {activeTab === "earrings" && (
            <div className="btn-group">
              <button onClick={() => {itemRef.current="/earring1.png"; setSelectedJewel("/earring1.png")}}>Antique Jhumka</button>
              <button onClick={() => {itemRef.current="/stud.png"; setSelectedJewel("/stud.png")}}>Diamond Stud</button>
              <button onClick={() => {extraRef.current = !showExtra; setShowExtra(!showExtra)}} style={{borderColor: "#FFD700"}}>
                {showExtra ? "Remove Butterfly" : "+ Add 2nd Piercing"}
              </button>
            </div>
          )}
          {activeTab === "neck" && (
            <div className="btn-group">
              <button onClick={() => {itemRef.current="/kanthi.png"; setSelectedJewel("/kanthi.png")}}>Royal Kanthi</button>
              <button onClick={() => {itemRef.current="/puligoru.png"; setSelectedJewel("/puligoru.png")}}>Puli Goru</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;