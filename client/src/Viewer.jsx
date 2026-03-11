import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Center } from "@react-three/drei"
import { PLYLoader } from "three-stdlib"

function PointCloud({ modelUrl }) {
  const geometry = useLoader(PLYLoader, modelUrl)

  geometry.computeBoundingSphere()

  return (
    <Center>
      <points geometry={geometry}>
        <pointsMaterial size={0.03} color="white" />
      </points>
    </Center>
  )
}

export default function Viewer({ modelUrl }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 60 }}>
      <ambientLight intensity={1} />
      <PointCloud modelUrl={modelUrl} />
      <OrbitControls />
    </Canvas>
  )
}