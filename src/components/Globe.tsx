"use client";

// Interactive wireframe globe for the hero. Pure react-three-fiber + drei —
// no external textures. A point-cloud "land" shell over a glowing wire sphere,
// orbiting arcs, and gentle mouse-reactive rotation. Lazy-friendly and light.

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

function fibonacciSphere(count: number, radius: number): Float32Array {
  const pts = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    pts[i * 3] = Math.cos(theta) * r * radius;
    pts[i * 3 + 1] = y * radius;
    pts[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  return pts;
}

function GlobeMesh() {
  const group = useRef<THREE.Group>(null);
  const dots = useMemo(() => fibonacciSphere(1400, 1.6), []);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.12;
    // Ease toward a subtle tilt driven by the pointer.
    pointer.current.x += (state.pointer.x - pointer.current.x) * 0.04;
    pointer.current.y += (state.pointer.y - pointer.current.y) * 0.04;
    group.current.rotation.x = pointer.current.y * 0.35;
    group.current.rotation.z = pointer.current.x * 0.12;
  });

  const arcs = useMemo(() => {
    const out: { rot: [number, number, number] }[] = [];
    for (let i = 0; i < 5; i++) {
      out.push({
        rot: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ],
      });
    }
    return out;
  }, []);

  return (
    <group ref={group}>
      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[1.58, 48, 48]} />
        <meshBasicMaterial color="#0b0626" transparent opacity={0.55} />
      </mesh>
      {/* Wireframe shell */}
      <mesh>
        <sphereGeometry args={[1.6, 36, 36]} />
        <meshBasicMaterial
          color="#7C3AED"
          wireframe
          transparent
          opacity={0.18}
        />
      </mesh>
      {/* Land point cloud */}
      <Points positions={dots} stride={3}>
        <PointMaterial
          transparent
          color="#67e8f9"
          size={0.022}
          sizeAttenuation
          depthWrite={false}
        />
      </Points>
      {/* Orbiting rings */}
      {arcs.map((a, i) => (
        <mesh key={i} rotation={a.rot}>
          <torusGeometry args={[1.95 + i * 0.06, 0.004, 8, 120]} />
          <meshBasicMaterial
            color={i % 2 ? "#A855F7" : "#06B6D4"}
            transparent
            opacity={0.4}
          />
        </mesh>
      ))}
      {/* Atmosphere halo */}
      <mesh scale={1.18}>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#7C3AED"
          transparent
          opacity={0.06}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export default function Globe() {
  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.6} />
        <Suspense fallback={null}>
          <GlobeMesh />
        </Suspense>
      </Canvas>
    </div>
  );
}
