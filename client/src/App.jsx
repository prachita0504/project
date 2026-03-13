import { useState } from "react";
import axios from "axios";
import Viewer from "./Viewer";

export default function App() {

  const [video, setVideo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [meshReady, setMeshReady] = useState(false);

  const upload = async () => {

    if (!video) {
      alert("Select a video first");
      return;
    }

    const formData = new FormData();
    formData.append("video", video);

    try {

      setProcessing(true);

      const res = await axios.post(
        "http://192.168.31.30:5000/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" }
        }
      );

      console.log(res.data);

      if (res.data.model) {
        setMeshReady(true);
      }

    } catch (err) {

      console.error(err);
      alert("Upload or processing failed");

    } finally {

      setProcessing(false);

    }

  };

  return (

    <div style={{ padding: 20 }}>

      <h2>Upload Video for 360° 3D Reconstruction</h2>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideo(e.target.files[0])}
      />

      <button
        onClick={upload}
        style={{ marginLeft: 10 }}
      >
        Upload
      </button>

      {processing && <p>Processing video & generating 3D model... please wait</p>}

      {meshReady && <Viewer />}

    </div>

  );

}