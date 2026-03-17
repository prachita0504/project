const express = require("express")
const multer = require("multer")
const cors = require("cors")
const ffmpeg = require("fluent-ffmpeg")
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const app = express()
app.use(cors())

// 📁 Paths
const ROOT = path.join(__dirname, "..")
const uploadsDir = path.join(ROOT, "uploads")
const framesDir = path.join(ROOT, "frames")
const workspaceDir = path.join(ROOT, "workspace")
const sparseDir = path.join(workspaceDir, "sparse")
const modelDir = path.join(ROOT, "model")

// 📦 Ensure base folders exist
;[uploadsDir, framesDir, workspaceDir, modelDir].forEach(dir=>{
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
})

// 📤 Upload setup
const upload = multer({ dest: uploadsDir })

// 🌐 Serve model
app.use("/model", express.static(modelDir))

// ⚙️ Run shell command
function run(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true })

    proc.stdout.on("data", d => console.log(d.toString()))
    proc.stderr.on("data", d => console.log(d.toString()))

    proc.on("close", code => {
      if (code === 0) resolve()
      else reject(`❌ ${command} failed with code ${code}`)
    })
  })
}

// 🧹 Clean folder safely
function resetDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
  fs.mkdirSync(dir, { recursive: true })
}

// 🎬 Extract frames
function extractFrames(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(`${framesDir}/frame_%04d.jpg`)
      .outputOptions("-vf fps=2")
      .on("end", resolve)
      .on("error", reject)
      .run()
  })
}

// 🚀 MAIN API
app.post("/upload", upload.single("video"), async (req, res) => {

  try {

    const videoPath = req.file.path

    console.log("STEP 0: Clean folders")
    resetDir(framesDir)
    resetDir(workspaceDir)
    fs.mkdirSync(sparseDir, { recursive: true })

    console.log("STEP 1: Extract frames")
    await extractFrames(videoPath)

    console.log("STEP 2: Feature extraction")
    await run("colmap", [
      "feature_extractor",
      "--database_path", `${workspaceDir}/database.db`,
      "--image_path", framesDir,
      "--ImageReader.camera_model", "SIMPLE_RADIAL",
      "--SiftExtraction.max_num_features", "8000"
    ])

    console.log("STEP 3: Matching")
    await run("colmap", [
      "exhaustive_matcher",
      "--database_path", `${workspaceDir}/database.db`
    ])

    console.log("STEP 4: Mapping")
    await run("colmap", [
      "mapper",
      "--database_path", `${workspaceDir}/database.db`,
      "--image_path", framesDir,
      "--output_path", sparseDir,
      "--Mapper.min_num_matches", "15"
    ])

    // ✅ Check sparse result
    if (!fs.existsSync(`${sparseDir}/0`)) {
      throw new Error("COLMAP sparse reconstruction failed")
    }

    console.log("STEP 5: Convert to NeRF")
    await run("python3", [
      "instant-ngp/scripts/colmap2nerf.py",
      "--images", framesDir,
      "--text", `${sparseDir}/0`,
      "--out", `${workspaceDir}/transforms.json`
    ])

    console.log("STEP 6: Train NeRF")
    await run("./instant-ngp/build/instant-ngp", [
      "--scene", workspaceDir,
      "--mode", "nerf",
      "--n_steps", "5000"
    ])

    console.log("STEP 7: Export mesh")
    await run("./instant-ngp/build/instant-ngp", [
      "--scene", workspaceDir,
      "--mode", "nerf",
      "--save_mesh", `${modelDir}/model.obj`
    ])

    console.log("✅ DONE")

    res.json({
      modelUrl: "http://192.168.31.30:5000/model/model.obj"
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "NeRF pipeline failed" })
  }
})

// 🚀 Start server
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running on port 5000")
})