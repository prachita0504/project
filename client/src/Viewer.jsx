import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader"

export default function Viewer({ file }) {

  const mountRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {

    if (!file) {
      setError("Model file not found")
      return
    }

    const width = window.innerWidth
    const height = window.innerHeight

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(
      75,
      width / height,
      0.1,
      1000
    )

    camera.position.set(0,0,3)

    const renderer = new THREE.WebGLRenderer({ antialias:true })
    renderer.setSize(width, height)

    const mount = mountRef.current
    if (!mount) return

    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const loader = new PLYLoader()

    let points = null

    loader.load(

      file,

      (geometry) => {

        setLoading(false)

        geometry.computeVertexNormals()

        const material = new THREE.PointsMaterial({
          size: 0.02,
          vertexColors: true
        })

        points = new THREE.Points(geometry, material)

        // center model
        geometry.computeBoundingBox()

        const center = new THREE.Vector3()
        geometry.boundingBox.getCenter(center)

        points.position.sub(center)

        // auto scale
        const size = new THREE.Vector3()
        geometry.boundingBox.getSize(size)

        const maxAxis = Math.max(size.x, size.y, size.z)
        points.scale.multiplyScalar(3 / maxAxis)

        scene.add(points)

      },

      undefined,

      (err) => {
        console.error(err)
        setError("Failed to load model.ply")
        setLoading(false)
      }

    )

    const animate = () => {

      requestAnimationFrame(animate)

      controls.update()

      renderer.render(scene, camera)

    }

    animate()

    const handleResize = () => {

      const w = window.innerWidth
      const h = window.innerHeight

      camera.aspect = w / h
      camera.updateProjectionMatrix()

      renderer.setSize(w, h)

    }

    window.addEventListener("resize", handleResize)

    return () => {

      window.removeEventListener("resize", handleResize)

      if (renderer) renderer.dispose()

      if (
        mountRef.current &&
        renderer.domElement &&
        mountRef.current.contains(renderer.domElement)
      ) {
        mountRef.current.removeChild(renderer.domElement)
      }

    }

  }, [file])

  if (error) {
    return <p style={{color:"red"}}>{error}</p>
  }

  if (loading) {
    return <p>Loading 3D model...</p>
  }

  return <div ref={mountRef}></div>

}