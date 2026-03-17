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
const modelDir = path.join(__dirname, "../model")

;[uploadsDir, framesDir, workspaceDir, modelDir].forEach(dir=>{
  if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
})

const upload = multer({ dest: uploadsDir })

app.use("/model", express.static(modelDir))

function run(command,args){
  return new Promise((resolve,reject)=>{
    const proc = spawn(command,args,{shell:true})

    proc.stdout.on("data",d=>console.log(d.toString()))
    proc.stderr.on("data",d=>console.log(d.toString()))

    proc.on("close",code=>{
      if(code===0) resolve()
      else reject(`Process failed: ${code}`)
    })
  })
}

app.post("/upload", upload.single("video"), async (req,res)=>{

  try{

    const videoPath = req.file.path

    console.log("STEP 1: Extract frames")

    // clear old frames
    fs.readdirSync(framesDir).forEach(f=>{
      fs.unlinkSync(path.join(framesDir,f))
    })

    await new Promise((resolve,reject)=>{
      ffmpeg(videoPath)
        .output(`${framesDir}/frame_%04d.jpg`)
        .outputOptions("-vf fps=2")
        .on("end",resolve)
        .on("error",reject)
        .run()
    })

    console.log("STEP 2: COLMAP poses")

    await run("colmap",[
      "automatic_reconstructor",
      "--workspace_path",workspaceDir,
      "--image_path",framesDir,
      "--data_type","video",
      "--quality","low"
    ])

    if(!fs.existsSync(`${workspaceDir}/sparse/0`)){
      throw new Error("COLMAP failed")
    }

    console.log("STEP 3: Convert to NeRF format")

    await run("python3",[
      "instant-ngp/scripts/colmap2nerf.py",
      "--images",framesDir,
      "--text",`${workspaceDir}/sparse/0`,
      "--out",`${workspaceDir}/transforms.json`
    ])

    console.log("STEP 4: Train NeRF")

    await run("./instant-ngp/build/testbed",[
      "--scene",workspaceDir,
      "--mode","nerf",
      "--n_steps","5000"
    ])

    console.log("STEP 5: Export mesh")

    await run("./instant-ngp/build/testbed",[
      "--scene",workspaceDir,
      "--mode","nerf",
      "--save_mesh",`${modelDir}/model.ply`
    ])

    console.log("DONE")

    res.json({
      modelUrl:"http://192.168.31.30:5000/model/model.obj"
    })

  }
  catch(err){
    console.log(err)
    res.status(500).json({error:"NeRF failed"})
  }

})

app.listen(5000,"0.0.0.0",()=>{
  console.log("Server running on port 5000")
})