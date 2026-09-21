'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, OrbitControls, Sparkles, useTexture } from '@react-three/drei'
import { useRef } from 'react'
import type { Group } from 'three'

function ProfessionalAvatar() {
  const texture = useTexture('/nova-professional-avatar.png')

  return (
    <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.18}>
      <mesh position={[0, -0.08, 0.72]} scale={[1.34, 1.34, 1]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.04} toneMapped={false} />
      </mesh>
    </Float>
  )
}

function AgentCore() {
  const group = useRef<Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    group.current.rotation.y += delta * 0.28
    group.current.position.y = Math.sin(state.clock.elapsedTime * 1.8) * 0.08
  })

  return (
    <Float speed={1.4} rotationIntensity={0.12} floatIntensity={0.35}>
      <group ref={group}>
        <mesh position={[0, -0.42, 0]}>
          <capsuleGeometry args={[0.5, 0.55, 8, 18]} />
          <MeshDistortMaterial color="#0f766e" emissive="#14b8a6" emissiveIntensity={0.4} roughness={0.2} metalness={0.35} distort={0.08} speed={1.8} />
        </mesh>
        <mesh position={[0, 0.35, 0]} scale={[0.92, 0.78, 0.8]}>
          <sphereGeometry args={[0.82, 32, 24]} />
          <meshStandardMaterial color="#99f6e4" roughness={0.22} metalness={0.15} />
        </mesh>
        <mesh position={[0, 0.3, 0.68]} scale={[0.78, 0.52, 0.12]}>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#083344" emissive="#155e75" emissiveIntensity={0.5} roughness={0.16} />
        </mesh>
        <mesh position={[-0.27, 0.34, 0.79]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0.27, 0.34, 0.79]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
        <mesh position={[0, 0.05, 0.8]} scale={[0.22, 0.07, 0.06]}>
          <sphereGeometry args={[1, 20, 12]} />
          <meshBasicMaterial color="#5eead4" />
        </mesh>
        <mesh position={[-0.92, 0.36, 0]} rotation={[0, 0, -0.25]}>
          <capsuleGeometry args={[0.16, 0.42, 8, 12]} />
          <meshStandardMaterial color="#14b8a6" roughness={0.3} />
        </mesh>
        <mesh position={[0.92, 0.36, 0]} rotation={[0, 0, 0.25]}>
          <capsuleGeometry args={[0.16, 0.42, 8, 12]} />
          <meshStandardMaterial color="#14b8a6" roughness={0.3} />
        </mesh>
        <mesh position={[0, 1.15, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 12]} />
          <meshStandardMaterial color="#5eead4" emissive="#14b8a6" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 1.36, 0]}>
          <sphereGeometry args={[0.1, 16, 12]} />
          <meshBasicMaterial color="#fef08a" />
        </mesh>
      </group>
    </Float>
  )
}

export function VoiceAgentScene() {
  return (
    <div className="h-40 w-40 overflow-hidden rounded-full bg-teal-950/90 shadow-[0_0_70px_rgba(20,184,166,0.28)]" aria-label="Animated 3D Nova agent avatar" role="img">
      <Canvas camera={{ position: [0, 0, 4.2], fov: 38 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.2} />
        <pointLight position={[2, 2, 3]} color="#99f6e4" intensity={5} />
        <pointLight position={[-2, -1, 2]} color="#0f766e" intensity={4} />
        <AgentCore />
        <ProfessionalAvatar />
        <Sparkles count={36} scale={4} size={2.2} speed={0.35} color="#ccfbf1" />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.8} />
      </Canvas>
    </div>
  )
}
