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
      window.innerWidth/window.innerHeight,
      0.1,
      1000
    )

    camera.position.set(0,0,5)

    const renderer = new THREE.WebGLRenderer({antialias:true})
    renderer.setSize(window.innerWidth,window.innerHeight)

    mountRef.current.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera,renderer.domElement)

    // light
    const light = new THREE.DirectionalLight(0xffffff,1)
    light.position.set(5,5,5)
    scene.add(light)

    const loader = new PLYLoader()

    loader.load(file,(geometry)=>{

      geometry.computeVertexNormals()

      const material = new THREE.MeshStandardMaterial({
        color:0xffffff
      })

      const mesh = new THREE.Mesh(geometry,material)

      geometry.computeBoundingBox()
      const center = new THREE.Vector3()
      geometry.boundingBox.getCenter(center)

      mesh.position.sub(center)

      scene.add(mesh)

    })

    const animate = ()=>{
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene,camera)
    }

    animate()

  },[file])

  return <div ref={mountRef}></div>
}