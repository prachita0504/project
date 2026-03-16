import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader"

export default function Viewer({ file }) {

  const mountRef = useRef()

  useEffect(() => {

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)

    const loader = new PLYLoader()

    loader.load(file, (geometry) => {

      geometry.computeVertexNormals()

      const material = new THREE.PointsMaterial({
        size: 0.01,
        vertexColors: true
      })

      const mesh = new THREE.Points(geometry, material)

      scene.add(mesh)

    })

    const animate = () => {

      requestAnimationFrame(animate)

      controls.update()

      renderer.render(scene, camera)

    }

    animate()

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
    }

  }, [file])

  return <div ref={mountRef}></div>

}