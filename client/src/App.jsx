import { useState } from "react";
import axios from "axios";
import Viewer from "./Viewer";

export default function App() {
  const [video, setVideo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [meshReady, setMeshReady] = useState(false);

  // Poll /ready endpoint
  const checkMesh = async () => {
    try {
      const res = await fetch("http://localhost:5000/ready");
      const data = await res.json();
      if (data.ready) {
        setMeshReady(true);
        setProcessing(false);
      } else {
        setTimeout(checkMesh, 2000); // poll every 2 seconds
      }
    } catch {
      setTimeout(checkMesh, 2000);
    }
  };

  const upload = async () => {
    if (!video) return alert("Select a video first");

    const formData = new FormData();
    formData.append("video", video);

    setProcessing(true);
    await axios.post("http://localhost:5000/upload", formData);

    // Start polling after upload
    checkMesh();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Video for 360° 3D Reconstruction</h2>
      <input type="file" accept="video/*" onChange={e => setVideo(e.target.files[0])} />
      <button onClick={upload} style={{ marginLeft: 10 }}>Upload</button>

      {processing && !meshReady && <p>Processing video & generating 3D model... please wait</p>}
      {meshReady && <Viewer />}
    </div>
  );
}