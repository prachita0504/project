const express = require("express")
const multer = require("multer")
const cors = require("cors")
const ffmpeg = require("fluent-ffmpeg")
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

const app = express()
app.use(cors())

// folders
const uploadsDir = path.join(__dirname, "../uploads")
const framesDir = path.join(__dirname, "../frames")
const workspaceDir = path.join(__dirname, "../workspace")
const sparseDir = path.join(workspaceDir, "sparse")
const modelDir = path.join(__dirname, "../model")

// ensure folders
;[uploadsDir, framesDir, workspaceDir, sparseDir, modelDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
})

// multer
const upload = multer({ dest: uploadsDir })

// serve model (KEEP SAME URL)
app.use("/model", express.static(modelDir))

// run command
function run(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { shell: true })

    proc.stdout.on("data", d => console.log(d.toString()))
    proc.stderr.on("data", d => console.log(d.toString()))

    proc.on("close", code => {
      if (code === 0) resolve()
      else reject(`❌ Process failed: ${code}`)
    })
  })
}

// CLEAN folder helper
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file)
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true })
      } else {
        fs.unlinkSync(filePath)
      }
    })
  }
}

app.post("/upload", upload.single("video"), async (req, res) => {

  try {

    const videoPath = req.file.path

    console.log("🧹 Cleaning old data...")
    cleanDir(framesDir)
    cleanDir(workspaceDir)
    cleanDir(modelDir)

    fs.mkdirSync(sparseDir, { recursive: true })

    console.log("STEP 1: Extract frames")

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(`${framesDir}/frame_%04d.jpg`)
        .outputOptions("-vf fps=4") // 🔥 increased overlap
        .on("end", resolve)
        .on("error", reject)
        .run()
    })

    console.log("STEP 2: Feature extraction")

    await run("colmap", [
      "feature_extractor",
      "--database_path", `${workspaceDir}/database.db`,
      "--image_path", framesDir,
      "--ImageReader.camera_model", "SIMPLE_RADIAL",
      "--SiftExtraction.max_num_features", "8000",
      "--SiftExtraction.estimate_affine_shape", "1",
      "--SiftExtraction.domain_size_pooling", "1"
    ])

    console.log("STEP 3: Sequential matching")

    await run("colmap", [
      "sequential_matcher",
      "--database_path", `${workspaceDir}/database.db`,
      "--SequentialMatching.overlap", "20"
    ])

    console.log("STEP 4: Mapping")

    await run("colmap", [
      "mapper",
      "--database_path", `${workspaceDir}/database.db`,
      "--image_path", framesDir,
      "--output_path", sparseDir,
      "--Mapper.min_num_matches", "8"
    ])

    // check reconstruction
    if (!fs.existsSync(`${sparseDir}/0`)) {
      throw new Error("❌ COLMAP failed: no reconstruction")
    }

    console.log("STEP 5: Convert to NeRF format")

    await run("python3", [
      "instant-ngp/scripts/colmap2nerf.py",
      "--images", framesDir,
      "--text", `${sparseDir}/0`,
      "--out", `${workspaceDir}/transforms.json`
    ])

    console.log("STEP 6: Train NeRF")

    await run("./instant-ngp/build/testbed", [
      "--scene", workspaceDir,
      "--mode", "nerf",
      "--n_steps", "5000"
    ])

    console.log("STEP 7: Export mesh")

    await run("./instant-ngp/build/testbed", [
      "--scene", workspaceDir,
      "--mode", "nerf",
      "--save_mesh", `${modelDir}/model.ply`
    ])

    console.log("✅ DONE")

    res.json({
      modelUrl: "http://192.168.31.30:5000/model/model.ply" // SAME URL
    })

  } catch (err) {

    console.log(err)

    res.status(500).json({
      error: "❌ NeRF reconstruction failed"
    })

  }

})

app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Server running on port 5000")
})