import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader"

export default function Viewer() {

  const mountRef = useRef()

  useEffect(() => {

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000000)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    camera.position.z = 3

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const loader = new PLYLoader()

    loader.load(
      "http://192.168.31.30:5000/model/model.ply",
      (geometry) => {

        geometry.computeVertexNormals()

        const material = new THREE.PointsMaterial({
          size: 0.01,
          vertexColors: true
        })

        const points = new THREE.Points(geometry, material)

        scene.add(points)
      }
    )

    const animate = () => {

      requestAnimationFrame(animate)

      controls.update()

      renderer.render(scene, camera)

    }

    animate()

  }, [])

  return <div ref={mountRef}></div>
}