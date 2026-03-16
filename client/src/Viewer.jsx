import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader"

export default function Viewer({ file }) {

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

    camera.position.set(0,0,5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const loader = new PLYLoader()

    loader.load(file, (geometry) => {

      geometry.computeVertexNormals()

      const material = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true
      })

      const points = new THREE.Points(geometry, material)

      // center model
      geometry.computeBoundingBox()
      const center = new THREE.Vector3()
      geometry.boundingBox.getCenter(center)
      points.position.sub(center)

      // scale model
      points.scale.set(5,5,5)

      scene.add(points)

    })

    const animate = () => {

      requestAnimationFrame(animate)

      controls.update()

      renderer.render(scene, camera)

    }

    animate()

    return () => {
      mountRef.current.removeChild(renderer.domElement)
    }

  }, [file])

  return <div ref={mountRef}></div>

}