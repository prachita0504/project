const express = require("express")
const multer = require("multer")
const cors = require("cors")
const ffmpeg = require("fluent-ffmpeg")
const { exec } = require("child_process")
const fs = require("fs")
const path = require("path")

const app = express()
app.use(cors())

// folders
const uploadsDir = path.join(__dirname, "../uploads")
const framesDir = path.join(__dirname, "../frames")
const workspaceDir = path.join(__dirname, "../workspace")
const sparseDir = path.join(__dirname, "../workspace/sparse")
const modelDir = path.join(__dirname, "../model")

// create folders if missing
;[uploadsDir, framesDir, workspaceDir, sparseDir, modelDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// multer
const upload = multer({ dest: uploadsDir })

// serve model
app.use("/model", express.static(modelDir))

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      console.log(stdout)
      console.log(stderr)
      if (err) reject(err)
      else resolve()
    })
  })
}

app.post("/upload", upload.single("video"), async (req, res) => {

  try {

    const videoPath = req.file.path

    console.log("STEP 1: extracting frames")

    await new Promise((resolve, reject) => {

      ffmpeg(videoPath)
        .output(`${framesDir}/frame_%04d.jpg`)
        .outputOptions("-vf fps=0.3")
        .on("end", resolve)
        .on("error", reject)
        .run()

    })

    console.log("STEP 2: feature extraction")

    await execPromise(`
    colmap feature_extractor \
    --database_path ${workspaceDir}/database.db \
    --image_path ${framesDir} \
    --ImageReader.camera_model SIMPLE_RADIAL
    `)

    console.log("STEP 3: matching")

    await execPromise(`
    colmap exhaustive_matcher \
    --database_path ${workspaceDir}/database.db
    `)

    console.log("STEP 4: mapping")

    await execPromise(`
    colmap mapper \
    --database_path ${workspaceDir}/database.db \
    --image_path ${framesDir} \
    --output_path ${sparseDir} \
    --Mapper.min_num_matches 15
    `)

    console.log("STEP 5: export PLY")

    await execPromise(`
    colmap model_converter \
    --input_path ${sparseDir}/0 \
    --output_path ${modelDir}/model.ply \
    --output_type PLY
    `)

    console.log("DONE")

    // CHANGE HERE
    res.json({
      modelUrl: "http://192.168.31:5000/model/model.ply"
    })

  } catch (err) {

    console.log(err)

    res.status(500).json({
      error: "Reconstruction failed"
    })

  }

})

// IMPORTANT CHANGE HERE
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000")
})