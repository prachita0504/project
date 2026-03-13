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
app.use(express.json())

const uploadsDir = path.join(__dirname, "../uploads")
const framesDir = path.join(__dirname, "../frames")
const workspaceDir = path.join(__dirname, "../workspace")
const modelDir = path.join(__dirname, "../model")

;[uploadsDir, framesDir, workspaceDir, modelDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

app.use("/model", express.static(modelDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
})

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }
})

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
      "-vf fps=1,scale=1280:-1",
      "-qscale:v 2"
    ])
    .on("end", () => {

      console.log("Frames extracted")
      console.log("Running full 3D pipeline...")

      const pipeline = spawn("bash", ["pipeline.sh"], {
        cwd: __dirname
      })

      pipeline.stdout.on("data", data => {
        console.log(data.toString())
      })

      pipeline.stderr.on("data", data => {
        console.error(data.toString())
      })

      pipeline.on("close", code => {

        console.log("Pipeline finished:", code)

        if (code !== 0) {
          return res.status(500).json({
            error: "3D reconstruction failed"
          })
        }

        return res.json({
          message: "Gaussian scene generated",
          model: "/model"
        })

      })

    })
    .on("error", err => {

      console.error("FFmpeg error:", err)

      return res.status(500).json({
        error: "Frame extraction failed"
      })

    })
    .run()

})

app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000")
})