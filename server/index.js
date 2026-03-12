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

// ensure folders exist
;[uploadsDir, framesDir, workspaceDir, modelDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

app.use("/model", express.static(modelDir))
app.use("/frames", express.static(framesDir))

// upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})

const upload = multer({ storage })

// helper to clear folder
function clearFolder(folder) {
  if (!fs.existsSync(folder)) return
  fs.readdirSync(folder).forEach(file => {
    const filePath = path.join(folder, file)
    fs.rmSync(filePath, { recursive: true, force: true })
  })
}

app.post("/upload", upload.single("video"), (req, res) => {

  if (!req.file) {
    return res.status(400).json({ error: "No video uploaded" })
  }

  const videoPath = req.file.path

  console.log("Cleaning old data...")

  clearFolder(framesDir)
  clearFolder(workspaceDir)
  clearFolder(modelDir)

  console.log("Extracting frames...")

  ffmpeg(videoPath)
    .output(path.join(framesDir, "frame_%04d.jpg"))
    .outputOptions([
      "-vf fps=1",
      "-qscale:v 2"
    ])
    .on("end", () => {

      console.log("Frames extracted")
      console.log("Starting reconstruction")

      const py = spawn("python3", ["reconstruct.py"], {
        cwd: __dirname
      })

      py.stdout.on("data", (data) => {
        console.log(data.toString())
      })

      py.stderr.on("data", (data) => {
        console.error(data.toString())
      })

      py.on("close", (code) => {

        console.log(`Reconstruction process exited with code ${code}`)

        if (code !== 0) {
          return res.status(500).json({
            error: "Reconstruction failed"
          })
        }

        return res.json({
          message: "3D model created successfully",
          sparseModel: "/model/model.ply",
          denseModel: "/model/dense.ply",
          meshModel: "/model/mesh.ply"
        })

      })

    })
    .on("error", (err) => {
      console.error("FFmpeg error:", err)
      return res.status(500).json({ error: "Frame extraction failed" })
    })
    .run()

})

app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000")
})