import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Center } from "@react-three/drei"
import { PLYLoader } from "three-stdlib"
import { Suspense } from "react"

function PointCloud({ url }) {

  const geometry = useLoader(PLYLoader, url)

  geometry.computeBoundingSphere()

  return (
    <Center>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.02}
          color="#ffffff"
          sizeAttenuation
        />
      </points>
    </Center>
  )
}

export default function Viewer() {

  const modelUrl = "http://192.168.31.30:5000/model/point_cloud.ply"

  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 60 }}>

      <ambientLight intensity={0.8} />

      <Suspense fallback={null}>
        <PointCloud url={modelUrl} />
      </Suspense>

      <OrbitControls enableZoom enableRotate enablePan />

    </Canvas>
  )
}