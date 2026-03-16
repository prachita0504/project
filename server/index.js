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
const modelDir = path.join(__dirname, "../model")

;[uploadsDir, framesDir, workspaceDir, modelDir].forEach((dir)=>{
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
})

const upload = multer({dest:uploadsDir})

app.use("/model", express.static(modelDir))

function run(cmd){
  return new Promise((resolve,reject)=>{
    exec(cmd,(err,stdout,stderr)=>{
      console.log(stdout)
      console.log(stderr)
      if(err) reject(err)
      else resolve()
    })
  })
}

app.post("/upload", upload.single("video"), async (req,res)=>{

  try{

    const videoPath = req.file.path

    console.log("STEP 1: extracting frames")

    await new Promise((resolve,reject)=>{
      ffmpeg(videoPath)
      .output(`${framesDir}/frame_%04d.jpg`)
      .outputOptions("-vf fps=1")
      .on("end",resolve)
      .on("error",reject)
      .run()
    })

    console.log("STEP 2: feature extraction")

    await run(`
    colmap feature_extractor \
    --database_path ${workspaceDir}/database.db \
    --image_path ${framesDir}
    `)

    console.log("STEP 3: matching")

    await run(`
    colmap exhaustive_matcher \
    --database_path ${workspaceDir}/database.db
    `)

    console.log("STEP 4: sparse reconstruction")

    await run(`
    colmap mapper \
    --database_path ${workspaceDir}/database.db \
    --image_path ${framesDir} \
    --output_path ${workspaceDir}/sparse
    `)

    console.log("STEP 5: undistort")

    await run(`
    colmap image_undistorter \
    --image_path ${framesDir} \
    --input_path ${workspaceDir}/sparse/0 \
    --output_path ${workspaceDir}/dense \
    --output_type COLMAP
    `)

    console.log("STEP 6: dense stereo")

    await run(`
    colmap patch_match_stereo \
    --workspace_path ${workspaceDir}/dense
    `)

    console.log("STEP 7: fusion")

    await run(`
    colmap stereo_fusion \
    --workspace_path ${workspaceDir}/dense \
    --output_path ${modelDir}/model.ply
    `)

    console.log("DONE")

    res.json({
      modelUrl:"http://192.168.31.30:5000/model/model.ply"
    })

  }catch(err){

    console.log(err)

    res.status(500).json({
      error:"Reconstruction failed"
    })

  }

})

app.listen(5000,"0.0.0.0",()=>{
  console.log("Server running on port 5000")
})