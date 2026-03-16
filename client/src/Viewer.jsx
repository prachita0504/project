import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { PLYLoader } from "three-stdlib"

function PointCloud({url}){

 const geometry = useLoader(PLYLoader,url)

 return (
   <points geometry={geometry}>
     <pointsMaterial size={0.01} color="white"/>
   </points>
 )

}

export default function Viewer(){

 const model="http://192.168.31.30:5000/model/model.ply"

 return(
   <Canvas camera={{position:[0,0,4]}}>
     <ambientLight/>
     <PointCloud url={model}/>
     <OrbitControls/>
   </Canvas>
 )

}