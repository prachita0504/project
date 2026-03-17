import { useState } from "react";
import axios from "axios";
import Viewer from "./Viewer";

export default function App() {

  const [video, setVideo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);

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
          headers: {
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (res.data.modelUrl) {
        setModelUrl(res.data.modelUrl);
      }

    } catch (err) {
      alert("Processing failed");
    } finally {
      setProcessing(false);
    }

  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Video for NeRF 360</h2>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setVideo(e.target.files[0])}
      />

      <button onClick={upload}>Upload</button>

      {processing && <p>Processing... please wait</p>}

      {modelUrl && <Viewer file={modelUrl} />}
    </div>
  );
}