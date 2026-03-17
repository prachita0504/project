import { useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader"
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader"

export default function Viewer({ file }) {

  const mountRef = useRef()

  useEffect(() => {

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x111111)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    camera.position.set(0, 1, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)

    mountRef.current.innerHTML = ""
    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    // 🔥 LIGHTING (IMPORTANT)
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 1)
    directional.position.set(5, 5, 5)
    scene.add(directional)

    // 🔥 GRID (optional but helpful)
    const grid = new THREE.GridHelper(10, 10)
    scene.add(grid)

    // 🔥 LOAD MODEL
    const basePath = file.substring(0, file.lastIndexOf("/") + 1)

    const mtlLoader = new MTLLoader()
    mtlLoader.setPath(basePath)

    mtlLoader.load("model.mtl", (materials) => {

      materials.preload()

      const objLoader = new OBJLoader()
      objLoader.setMaterials(materials)
      objLoader.setPath(basePath)

      objLoader.load("model.obj", (object) => {

        // center model
        const box = new THREE.Box3().setFromObject(object)
        const center = new THREE.Vector3()
        box.getCenter(center)
        object.position.sub(center)

        scene.add(object)

      }, undefined, (err) => {
        console.error("OBJ load error:", err)
      })

    }, undefined, (err) => {
      console.error("MTL load error:", err)
    })

    // 🔥 ANIMATION LOOP
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }

    animate()

    // 🔁 RESIZE FIX
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }

  }, [file])

  return <div ref={mountRef}></div>
}