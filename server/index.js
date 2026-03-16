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
  filename: (req, file, cb) => cb(null, Date.now()+"-"+file.originalname)
})

const upload = multer({ storage })

function clearFolder(folder){
  if(!fs.existsSync(folder)) return
  fs.readdirSync(folder).forEach(file=>{
    fs.rmSync(path.join(folder,file),{recursive:true,force:true})
  })
}

app.post("/upload", upload.single("video"), (req,res)=>{

  const videoPath = req.file.path

  clearFolder(framesDir)
  clearFolder(workspaceDir)
  clearFolder(modelDir)

  console.log("Extracting frames")

  ffmpeg(videoPath)
    .output(path.join(framesDir,"frame_%04d.jpg"))
    .outputOptions([
      "-vf fps=3,scale=1280:-1",
      "-qscale:v 2"
    ])
    .on("end",()=>{

      console.log("Frames extracted")

      const process = spawn("python3",["reconstruction.py"],{
        cwd:__dirname
      })

      process.stdout.on("data",d=>console.log(d.toString()))
      process.stderr.on("data",d=>console.error(d.toString()))

      process.on("close",code=>{

        if(code!==0){
          return res.status(500).json({error:"Reconstruction failed"})
        }

        res.json({
          model:"/model/model.ply"
        })

      })

    })
    .run()

})

app.listen(5000,"0.0.0.0",()=>{
  console.log("Server running on 5000")
})