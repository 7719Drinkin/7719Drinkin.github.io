import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const LEFT_BROW = [
  [-0.37, 0.28, 0.565],
  [-0.27, 0.33, 0.585],
  [-0.16, 0.31, 0.575]
];
const RIGHT_BROW = [
  [0.13, 0.3, 0.575],
  [0.24, 0.34, 0.588],
  [0.36, 0.3, 0.568]
];
const MOUTH_LINE = [
  [-0.115, -0.285, 0.575],
  [-0.045, -0.302, 0.596],
  [0.035, -0.294, 0.598],
  [0.11, -0.26, 0.578]
];
const LOWER_LIP = [
  [-0.078, -0.31, 0.578],
  [-0.01, -0.325, 0.59],
  [0.068, -0.305, 0.58]
];
const NOSE_POINTS = [
  [0, 0.03, 0.57],
  [0.008, 0.05, 0.81],
  [0.023, 0.036, 1.05],
  [0.042, 0.002, 1.29]
];

function CurvedStroke({ points, radius, color, tubularSegments = 24, radialSegments = 6 }) {
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))),
    [points]
  );

  return (
    <mesh>
      <tubeGeometry args={[curve, tubularSegments, radius, radialSegments, false]} />
      <meshStandardMaterial color={color} roughness={0.86} metalness={0} />
    </mesh>
  );
}

function TaperedCylinder({ start, end, radiusStart, radiusEnd, segments, color }) {
  const transform = useMemo(() => {
    const startPoint = new THREE.Vector3(...start);
    const endPoint = new THREE.Vector3(...end);
    const direction = endPoint.clone().sub(startPoint);
    const length = direction.length();
    const midpoint = startPoint.clone().add(endPoint).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize()
    );

    return { length, midpoint, quaternion };
  }, [end, start]);

  return (
    <mesh position={transform.midpoint} quaternion={transform.quaternion}>
      <cylinderGeometry args={[radiusEnd, radiusStart, transform.length, segments, 1, false]} />
      <meshStandardMaterial color={color} roughness={0.75} metalness={0} />
    </mesh>
  );
}

function PuppetEye({ x, quality }) {
  const segments = quality === 'quality' ? 28 : 16;
  const gazeX = 0.022;
  const gazeY = 0.024;
  const verticalSegments = Math.max(10, Math.floor(segments * 0.65));

  return (
    <group position={[x, 0.12, 0.54]}>
      <mesh scale={[0.165, 0.142, 0.058]}>
        <sphereGeometry args={[1, segments, verticalSegments]} />
        <meshStandardMaterial color="#4b2d21" roughness={0.92} metalness={0} />
      </mesh>
      <mesh position={[0, -0.004, 0.055]} scale={[0.128, 0.115, 0.071]}>
        <sphereGeometry args={[1, segments, verticalSegments]} />
        <meshStandardMaterial color="#e4d9bd" roughness={0.34} metalness={0} />
      </mesh>
      <mesh position={[gazeX, gazeY, 0.119]} scale={[0.052, 0.052, 0.022]}>
        <sphereGeometry args={[1, segments, verticalSegments]} />
        <meshStandardMaterial color="#8b5c2d" roughness={0.38} metalness={0} />
      </mesh>
      <mesh position={[gazeX + 0.004, gazeY, 0.139]} scale={[0.023, 0.023, 0.012]}>
        <sphereGeometry args={[1, segments, verticalSegments]} />
        <meshStandardMaterial color="#251813" roughness={0.28} metalness={0} />
      </mesh>
      <mesh position={[gazeX + 0.022, gazeY + 0.026, 0.148]} scale={[0.009, 0.009, 0.006]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#fff5d9" />
      </mesh>
    </group>
  );
}

function PuppetHead({ quality, selected }) {
  const headGeometry = useMemo(() => {
    const widthSegments = quality === 'quality' ? 48 : 28;
    const heightSegments = quality === 'quality' ? 36 : 20;
    const geometry = new THREE.SphereGeometry(0.5, widthSegments, heightSegments);
    const position = geometry.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      let x = position.getX(index);
      let y = position.getY(index);
      let z = position.getZ(index);
      const normalizedY = y / 0.5;
      const lowerFace = THREE.MathUtils.clamp((-normalizedY - 0.08) / 0.92, 0, 1);
      const forehead = THREE.MathUtils.clamp((normalizedY - 0.28) / 0.72, 0, 1);
      const widthFactor = 1 + forehead * 0.035 - lowerFace * 0.1;
      const depthFactor = 1 - lowerFace * 0.025;

      x *= 1.16 * widthFactor;
      y *= 1.18;
      z *= depthFactor;

      if (z > 0) {
        const faceCenter = Math.exp(-Math.pow(x / 0.4, 2))
          * Math.exp(-Math.pow((y - 0.01) / 0.46, 2));
        z += faceCenter * 0.06;
      }

      position.setXYZ(index, x, y, z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [quality]);

  useEffect(() => () => headGeometry.dispose(), [headGeometry]);

  const radialSegments = quality === 'quality' ? 14 : 8;
  const sphereSegments = quality === 'quality' ? 28 : 16;
  const sphereRows = quality === 'quality' ? 18 : 10;

  return (
    <group position={[0, 0.08, 0]} rotation={[-0.12, 0.29, -0.24]}>
      <mesh geometry={headGeometry} position={[0, 0.015, -0.05]} scale={[1.03, 1.03, 1.01]}>
        <meshStandardMaterial color="#28211d" roughness={0.92} metalness={0} />
      </mesh>
      <mesh geometry={headGeometry} position={[0, -0.005, 0.065]} scale={[0.98, 0.98, 0.95]}>
        <meshStandardMaterial color="#b87843" roughness={0.78} metalness={0} />
      </mesh>

      {[-1, 1].map((side) => (
        <group key={`ear-${side}`} position={[side * 0.57, -0.02, 0.13]} rotation={[0, side * -0.18, side * 0.06]}>
          <mesh scale={[0.09, 0.15, 0.06]}>
            <sphereGeometry args={[1, sphereSegments, sphereRows]} />
            <meshStandardMaterial color="#9b5e37" roughness={0.86} metalness={0} />
          </mesh>
          <mesh position={[0, 0, 0.052]} scale={[0.04, 0.085, 0.02]}>
            <sphereGeometry args={[1, 16, 10]} />
            <meshStandardMaterial color="#74402d" roughness={0.9} metalness={0} />
          </mesh>
        </group>
      ))}

      <mesh position={[-0.285, -0.09, 0.54]} scale={[0.16, 0.11, 0.025]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#c76d52" roughness={0.88} transparent opacity={0.26} depthWrite={false} />
      </mesh>
      <mesh position={[0.285, -0.09, 0.54]} scale={[0.16, 0.11, 0.025]}>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#c76d52" roughness={0.88} transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <PuppetEye x={-0.205} quality={quality} />
      <PuppetEye x={0.205} quality={quality} />
      <CurvedStroke points={LEFT_BROW} radius={0.0125} color="#4a2d20" />
      <CurvedStroke points={RIGHT_BROW} radius={0.0125} color="#4a2d20" />

      <TaperedCylinder start={NOSE_POINTS[0]} end={NOSE_POINTS[1]} radiusStart={0.073} radiusEnd={0.059} segments={radialSegments} color="#b97842" />
      <TaperedCylinder start={NOSE_POINTS[1]} end={NOSE_POINTS[2]} radiusStart={0.059} radiusEnd={0.046} segments={radialSegments} color="#b97842" />
      <TaperedCylinder start={NOSE_POINTS[2]} end={NOSE_POINTS[3]} radiusStart={0.046} radiusEnd={0.035} segments={radialSegments} color="#ad6c3b" />
      <mesh position={NOSE_POINTS[3]} scale={[0.05, 0.043, 0.057]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#bc7049" roughness={0.7} metalness={0} />
      </mesh>

      <CurvedStroke points={MOUTH_LINE} radius={0.009} color="#633229" tubularSegments={20} />
      <CurvedStroke points={LOWER_LIP} radius={0.0055} color="#b36c51" tubularSegments={16} />

      <mesh position={[-0.31, 0.48, 0.26]} rotation={[0.08, 0.08, 0.38]} scale={[0.23, 0.34, 0.18]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#28211d" roughness={0.93} metalness={0} />
      </mesh>
      <mesh position={[0.04, 0.57, 0.2]} rotation={[-0.02, 0, -0.08]} scale={[0.25, 0.32, 0.19]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#30251f" roughness={0.93} metalness={0} />
      </mesh>
      <mesh position={[0.34, 0.43, 0.2]} rotation={[0.1, -0.08, -0.34]} scale={[0.18, 0.28, 0.16]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#241f1c" roughness={0.93} metalness={0} />
      </mesh>

      <mesh position={[-0.2, 0.42, 0.49]} rotation={[0.22, 0.04, 0.48]} scale={[0.13, 0.27, 0.055]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#b9863f" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0.01, 0.46, 0.51]} rotation={[0.2, 0, 0.05]} scale={[0.145, 0.3, 0.06]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#c8974a" roughness={0.78} metalness={0} />
      </mesh>
      <mesh position={[0.22, 0.39, 0.49]} rotation={[0.2, -0.04, -0.43]} scale={[0.115, 0.245, 0.052]}>
        <sphereGeometry args={[1, sphereSegments, sphereRows]} />
        <meshStandardMaterial color="#aa7837" roughness={0.82} metalness={0} />
      </mesh>

      <mesh position={[0, -0.67, 0.08]}>
        <cylinderGeometry args={[0.135, 0.16, 0.22, quality === 'quality' ? 16 : 10]} />
        <meshStandardMaterial color="#75472f" roughness={0.86} metalness={0} />
      </mesh>
      <mesh position={[-0.19, -0.78, 0.16]} rotation={[0.05, -0.16, 0.42]} scale={[0.29, 0.14, 0.055]}>
        <dodecahedronGeometry args={[1, quality === 'quality' ? 1 : 0]} />
        <meshStandardMaterial color="#ddd4bd" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0.19, -0.78, 0.16]} rotation={[0.05, 0.16, -0.42]} scale={[0.29, 0.14, 0.055]}>
        <dodecahedronGeometry args={[1, quality === 'quality' ? 1 : 0]} />
        <meshStandardMaterial color="#ddd4bd" roughness={0.9} metalness={0} />
      </mesh>

      <mesh position={[-0.12, -0.83, 0.29]} rotation={[0, 0.1, 0.28]} scale={[0.16, 0.095, 0.055]}>
        <dodecahedronGeometry args={[1, quality === 'quality' ? 1 : 0]} />
        <meshStandardMaterial color="#9b3028" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0.12, -0.83, 0.29]} rotation={[0, -0.1, -0.28]} scale={[0.16, 0.095, 0.055]}>
        <dodecahedronGeometry args={[1, quality === 'quality' ? 1 : 0]} />
        <meshStandardMaterial color="#9b3028" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[0, -0.83, 0.34]} scale={[0.07, 0.07, 0.055]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#b44435" roughness={0.72} metalness={0} />
      </mesh>
      <mesh position={[0, -0.99, 0.17]} scale={[0.055, 0.055, 0.04]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#50796e" roughness={0.76} metalness={0} />
      </mesh>

      <mesh scale={[0.67, 0.8, 0.66]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

      {selected && (
        <mesh position={[0, -0.03, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.27, 0.016, 8, quality === 'quality' ? 80 : 42]} />
          <meshBasicMaterial color="#d7a27c" transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      <pointLight position={[1.25, 1.05, 2.2]} color="#f1b17a" intensity={selected ? 0.52 : 0.38} distance={5} decay={2} />
      <pointLight position={[-1.15, 0.32, 1.05]} color="#7b95a2" intensity={selected ? 0.16 : 0.1} distance={4} decay={2} />
    </group>
  );
}

export default function MusicPuppetCelestial({
  body,
  quality,
  selectedId,
  parentSelected,
  showOrbit,
  onSelect,
  registerPlanet
}) {
  const orbitPivot = useRef();
  const bodyCarrier = useRef();
  const selfSpin = useRef();
  const selected = selectedId === body.id;

  useEffect(() => {
    registerPlanet(body.id, bodyCarrier);
    return () => registerPlanet(body.id, null);
  }, [body.id, registerPlanet]);

  useFrame((state, delta) => {
    if (orbitPivot.current) orbitPivot.current.rotation.y += body.orbitSpeed * delta;
    if (selfSpin.current) {
      selfSpin.current.rotation.y += body.axialSpeed * delta;
      selfSpin.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.42) * 0.018;
    }
  });

  const select = (event) => {
    event.stopPropagation();
    onSelect(body.id);
  };

  const enter = (event) => {
    event.stopPropagation();
    if (body.route) window.location.href = body.route;
  };

  return (
    <group rotation-z={body.orbitInclination}>
      {showOrbit && (
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[body.orbitRadius, 0.011, 6, quality === 'quality' ? 160 : 72]} />
          <meshBasicMaterial color={body.accent} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      )}

      <group ref={orbitPivot} rotation-y={body.initialOrbit}>
        <group ref={bodyCarrier} position={[body.orbitRadius, 0, 0]}>
          <group
            ref={selfSpin}
            rotation-y={body.initialAxial}
            rotation-z={body.axialTilt}
            scale={body.size}
            onClick={select}
            onDoubleClick={enter}
          >
            <PuppetHead quality={quality} selected={selected} />
          </group>

          {(parentSelected || selected) && !selected && (
            <Html center distanceFactor={8} position={[0, body.size * 1.9, 0]} style={{ pointerEvents: 'none' }}>
              <div className="planet-label" style={{ '--planet-accent': body.accent }}>
                <strong>{body.title.toUpperCase()}</strong>
                <span>{body.worldName}</span>
              </div>
            </Html>
          )}
        </group>
      </group>
    </group>
  );
}
