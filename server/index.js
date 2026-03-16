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
const sparseDir = path.join(__dirname, "../workspace/sparse")
const denseDir = path.join(__dirname, "../dense")
const modelDir = path.join(__dirname, "../model")

// create folders
;[uploadsDir, framesDir, workspaceDir, sparseDir, denseDir, modelDir].forEach((dir)=>{
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
})

// multer
const upload = multer({ dest: uploadsDir })

// serve model
app.use("/model", express.static(modelDir))

// command runner
function run(command,args){
  return new Promise((resolve,reject)=>{

    const proc = spawn(command,args)

    proc.stdout.on("data",(data)=>{
      console.log(data.toString())
    })

    proc.stderr.on("data",(data)=>{
      console.log(data.toString())
    })

    proc.on("close",(code)=>{
      if(code===0) resolve()
      else reject(`Process exited with code ${code}`)
    })

  })
}

app.post("/upload", upload.single("video"), async (req,res)=>{

  try{

    const videoPath = req.file.path

    console.log("STEP 1 extracting frames")

    await new Promise((resolve,reject)=>{

      ffmpeg(videoPath)
        .output(`${framesDir}/frame_%04d.jpg`)
        .outputOptions("-vf fps=2")
        .on("end",resolve)
        .on("error",reject)
        .run()

    })

    console.log("STEP 2 feature extraction")

    await run("colmap",[
      "feature_extractor",
      "--database_path",`${workspaceDir}/database.db`,
      "--image_path",framesDir,
      "--ImageReader.camera_model","SIMPLE_RADIAL"
    ])

    console.log("STEP 3 sequential matching")

    await run("colmap",[
      "sequential_matcher",
      "--database_path",`${workspaceDir}/database.db`,
      "--SequentialMatching.overlap","20"
    ])

    console.log("STEP 4 mapping")

    await run("colmap",[
      "mapper",
      "--database_path",`${workspaceDir}/database.db`,
      "--image_path",framesDir,
      "--output_path",`${workspaceDir}/sparse`,
      "--Mapper.min_num_matches","5"
    ])

    console.log("STEP 5 undistort")

    await run("colmap",[
      "image_undistorter",
      "--image_path",framesDir,
      "--input_path",`${workspaceDir}/sparse/0`,
      "--output_path",denseDir,
      "--output_type","COLMAP"
    ])

    console.log("STEP 6 patch match")

    await run("colmap",[
      "patch_match_stereo",
      "--workspace_path",denseDir,
      "--workspace_format","COLMAP",
      "--PatchMatchStereo.geom_consistency","true",
      "--PatchMatchStereo.gpu_index","-1"
    ])

    console.log("STEP 7 fusion")

    await run("colmap",[
      "stereo_fusion",
      "--workspace_path",denseDir,
      "--workspace_format","COLMAP",
      "--input_type","geometric",
      "--output_path",`${modelDir}/model.ply`
    ])

    console.log("DONE")

    res.json({
      modelUrl:"http://192.168.31.30:5000/model/model.ply"
    })

  }
  catch(err){

    console.log(err)

    res.status(500).json({
      error:"Reconstruction failed"
    })

  }

})

app.listen(5000,"0.0.0.0",()=>{
  console.log("Server running on port 5000")
})