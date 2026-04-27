import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaceMesh } from "@mediapipe/face_mesh";
import * as cam from "@mediapipe/camera_utils";
import Webcam from "react-webcam";
import './App.css'; 

function App() {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null); 
  
  const [category, setCategory] = useState("earrings");
  const [activeItem, setActiveItem] = useState("/earring1.png");
  const [showExtra, setShowExtra] = useState(false);
  
  const itemRef = useRef("/earring1.png");
  const extraRef = useRef(false);
  const categoryRef = useRef("earrings");

  // Keeping these as they are used for manual logic
  const offsetRefX = useRef(0);
  const offsetRefY = useRef(13);

  const images = useMemo(() => {
    const list = ["earring1", "earring2", "extra", "nath", "puligoru", "kanthi", "stud"];
    const obj = {};
    list.forEach(name => {
      const img = new Image();
      img.src = `/${name}.png`;
      obj[`/${name}.png`] = img;
    });
    return obj;
  }, []);

  const handleUpdateItem = (path) => {
    setActiveItem(path);
    itemRef.current = path;
  };

  const handleCategoryChange = (cat) => {
    setCategory(cat);
    categoryRef.current = cat;
    if (cat === "earrings") handleUpdateItem("/earring1.png");
    if (cat === "nose") handleUpdateItem("/nath.png");
    if (cat === "necklace") handleUpdateItem("/kanthi.png");
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

        if (categoryRef.current === "earrings") {
          const anchors = [{ id: 234, side: "left" }, { id: 454, side: "right" }];
          anchors.forEach(a => {
            const pt = landmarks[a.id];
            let x = (1 - pt.x) * canvas.width;
            let y = pt.y * canvas.height + (faceWidth * (offsetRefY.current / 100));
            const push = faceWidth * (offsetRefX.current / 100);
            x = (a.side === "left") ? x - push : x + push;

            const eW = faceWidth * 0.22;
            const eH = eW * 1.5;
            ctx.drawImage(images[itemRef.current], x - eW/2, y, eW, eH);

            if (extraRef.current) {
              const exW = eW * 0.6;
              ctx.drawImage(images["/extra.png"], x + (a.side === "left" ? 15 : -15), y - 25, exW, exW);
            }
          });
        }

        if (categoryRef.current === "nose") {
          const nostril = landmarks[279];
          const sideFace = landmarks[234];
          let nx = (1 - nostril.x) * canvas.width;
          let ny = nostril.y * canvas.height;
          let sx = (1 - sideFace.x) * canvas.width;
          const nathWidth = Math.abs(sx - nx) * 1.1; 
          const angle = Math.atan2(sideFace.y - nostril.y, sideFace.x - nostril.x);

          ctx.save();
          ctx.translate(nx, ny);
          ctx.rotate(-angle * 0.5);
          ctx.drawImage(images["/nath.png"], -10, -20, nathWidth, faceWidth * 0.4);
          ctx.restore();
        }

        if (categoryRef.current === "necklace") {
          const chin = landmarks[152];
          let cx = (1 - chin.x) * canvas.width;
          let cy = chin.y * canvas.height + (faceWidth * 0.1);
          const nWidth = faceWidth * 1.4;
          const nHeight = nWidth * 0.9;
          ctx.drawImage(images[itemRef.current], cx - nWidth/2, cy, nWidth, nHeight);
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
        <h1>SHRI AKARAPU KUMARASWAMY JEWELLERS</h1>
        <div className="category-bar">
          <button className={category === "earrings" ? "active" : ""} onClick={() => handleCategoryChange("earrings")}>EARRINGS</button>
          <button className={category === "nose" ? "active" : ""} onClick={() => handleCategoryChange("nose")}>NATH</button>
          <button className={category === "necklace" ? "active" : ""} onClick={() => handleCategoryChange("necklace")}>NECKLACES</button>
        </div>
      </header>

      <div className="kiosk-container">
        <Webcam ref={webcamRef} mirrored={true} className="video-layer" />
        <canvas ref={canvasRef} className="canvas-layer" />
      </div>

      <div className="item-selector">
        {category === "earrings" && (
          <>
            <button onClick={() => handleUpdateItem("/earring1.png")} className={activeItem === "/earring1.png" ? "active" : ""}>JHUMKA</button>
            <button onClick={() => handleUpdateItem("/earring2.png")} className={activeItem === "/earring2.png" ? "active" : ""}>DIAMOND</button>
            <button onClick={() => handleUpdateItem("/stud.png")} className={activeItem === "/stud.png" ? "active" : ""}>MEN STUD</button>
            <button className="gold-btn" onClick={() => {setShowExtra(!showExtra); extraRef.current = !showExtra}}>
              {showExtra ? "REMOVE BUTTERFLY" : "+ ADD BUTTERFLY"}
            </button>
          </>
        )}
        {category === "necklace" && (
          <>
            <button onClick={() => handleUpdateItem("/kanthi.png")} className={activeItem === "/kanthi.png" ? "active" : ""}>KANTHI</button>
            <button onClick={() => handleUpdateItem("/puligoru.png")} className={activeItem === "/puligoru.png" ? "active" : ""}>PULI GORU</button>
          </>
        )}
      </div>

      <div className="calibration-panel">
        <input type="range" min="-20" max="40" defaultValue="0" onChange={(e) => {offsetRefX.current = Number(e.target.value);}} />
        <input type="range" min="-10" max="50" defaultValue="13" onChange={(e) => {offsetRefY.current = Number(e.target.value);}} />
      </div>
      
      <footer className="app-footer">
        <p>Nagarkurnool • Experience Royal Jewellery</p>
      </footer>
    </div>
  );
}

export default App;