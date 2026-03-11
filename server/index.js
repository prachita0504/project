const express = require("express")
const multer = require("multer")
const cors = require("cors")
const ffmpeg = require("fluent-ffmpeg")
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path
const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
app.use(cors())

const uploadsDir = path.join(__dirname, "../uploads")
const framesDir = path.join(__dirname, "../frames")
const workspaceDir = path.join(__dirname, "../workspace")
const modelDir = path.join(__dirname, "../model")

;[uploadsDir, framesDir, workspaceDir, modelDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

app.use("/model", express.static(modelDir))
app.use("/frames", express.static(framesDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})

const upload = multer({ storage })

app.post("/upload", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video uploaded" })
    }

    const videoPath = req.file.path

    console.log("Extracting frames...")

    // clear old frames
    fs.readdirSync(framesDir).forEach((file) => {
      fs.unlinkSync(path.join(framesDir, file))
    })

    ffmpeg(videoPath)
      .output(path.join(framesDir, "frame_%04d.jpg"))
      .outputOptions("-vf fps=2")
      .on("end", () => {
        console.log("Frames extracted")
        console.log("Starting reconstruction")

        const py = spawn("python", ["reconstruct.py"], {
          cwd: __dirname,
          shell: true,
        })

        py.stdout.on("data", (data) => {
          process.stdout.write(data.toString())
        })

        py.stderr.on("data", (data) => {
          process.stderr.write(data.toString())
        })

        py.on("close", (code) => {
          console.log(`Reconstruction process exited with code ${code}`)

          if (code !== 0) {
            return res.status(500).json({ error: "Reconstruction failed" })
          }

          return res.json({
            message: "3D model created successfully",
            sparseModel: "model/model.ply",
            denseModel: "model/dense.ply",
            meshModel: "model/mesh.ply",
          })
        })
      })
      .on("error", (err) => {
        console.error("FFmpeg error:", err)
        return res.status(500).json({ error: "Frame extraction failed" })
      })
      .run()
  } catch (error) {
    console.error("Server error:", error)
    return res.status(500).json({ error: "Server crashed" })
  }
})

app.listen(5000, () => {
  console.log("Server running on port 5000")
})