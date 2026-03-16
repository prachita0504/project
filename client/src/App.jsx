import { useState } from "react"
import axios from "axios"
import Viewer from "./Viewer"

export default function App() {

  const [video, setVideo] = useState(null)
  const [model, setModel] = useState(null)

  const upload = async () => {

    const formData = new FormData()
    formData.append("video", video)

    const res = await axios.post(
  "http://192.168.31.135:5000/upload",
  formData
)

    setModel(res.data.modelUrl)

  }

  return (
    <div>

      <h1>Upload Video for 360° 3D Reconstruction</h1>

      <input
        type="file"
        onChange={(e) => setVideo(e.target.files[0])}
      />

      <button onClick={upload}>Upload</button>

      {model && <Viewer file={model} />}

    </div>
  )

}