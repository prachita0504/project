import { Canvas, useLoader } from "@react-three/fiber"
import { OrbitControls, Center } from "@react-three/drei"
import { PLYLoader } from "three-stdlib"
import { Suspense, useEffect } from "react"

function PointCloud({ modelUrl }) {
  const geometry = useLoader(PLYLoader, modelUrl)

  useEffect(() => {
    geometry.computeVertexNormals()
    geometry.computeBoundingSphere()
  }, [geometry])

  return (
    <Center>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.02}
          sizeAttenuation
          color="#ffffff"
        />
      </points>
    </Center>
  )
}

export default function Viewer({ modelUrl }) {
  return (
    <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
      <ambientLight intensity={0.8} />

      <Suspense fallback={null}>
        <PointCloud modelUrl={modelUrl} />
      </Suspense>

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
      />
    </Canvas>
  )
}