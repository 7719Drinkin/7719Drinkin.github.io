import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MAX_MASSES = 4;

export default function GravityGrid({ interests, planetRefs, quality }) {
  const material = useRef();
  const tempWorld = useMemo(() => new THREE.Vector3(), []);
  const centers = useMemo(
    () => Array.from({ length: MAX_MASSES }, () => new THREE.Vector2()),
    []
  );
  const strengths = useMemo(() => new Float32Array([2.8, 0.62, 0.42, 0.48]), []);
  const radii = useMemo(() => new Float32Array([3.25, 1.18, 1.0, 1.08]), []);
  const uniforms = useMemo(() => ({
    uCenters: { value: centers },
    uStrengths: { value: strengths },
    uRadii: { value: radii },
    uOpacity: { value: quality === 'quality' ? 0.72 : 0.52 }
  }), [centers, quality, radii, strengths]);

  useFrame(() => {
    if (!material.current) return;
    centers[0].set(0, 0);
    interests.slice(0, MAX_MASSES - 1).forEach((interest, index) => {
      const object = planetRefs.current.get(interest.id)?.current;
      if (!object) return;
      object.getWorldPosition(tempWorld);
      centers[index + 1].set(tempWorld.x, -tempWorld.z);
    });
    material.current.uniforms.uOpacity.value = quality === 'quality' ? 0.72 : 0.52;
  });

  const segments = quality === 'quality' ? 128 : 64;

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.035} renderOrder={-3}>
      <planeGeometry args={[46, 46, segments, segments]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
        vertexShader={`
          uniform vec2 uCenters[${MAX_MASSES}];
          uniform float uStrengths[${MAX_MASSES}];
          uniform float uRadii[${MAX_MASSES}];
          varying vec2 vCoordinate;
          varying float vDepth;
          varying float vSlope;

          float massWell(vec2 point, vec2 center, float strength, float radius) {
            vec2 delta = point - center;
            float distanceSquared = dot(delta, delta);
            return strength * exp(-distanceSquared / (2.0 * radius * radius));
          }

          void main() {
            vec3 displaced = position;
            float depth = 0.0;
            for (int index = 0; index < ${MAX_MASSES}; index++) {
              depth += massWell(position.xy, uCenters[index], uStrengths[index], uRadii[index]);
            }
            displaced.z -= depth;
            vCoordinate = position.xy;
            vDepth = depth;
            vSlope = length(vec2(dFdx(depth), dFdy(depth)));
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          varying vec2 vCoordinate;
          varying float vDepth;
          varying float vSlope;

          float gridLine(vec2 coordinate, float spacing, float thickness) {
            vec2 scaled = coordinate / spacing;
            vec2 distanceToLine = abs(fract(scaled - .5) - .5) / fwidth(scaled);
            float nearest = min(distanceToLine.x, distanceToLine.y);
            return 1.0 - min(nearest / thickness, 1.0);
          }

          void main() {
            float minor = gridLine(vCoordinate, .52, 1.1);
            float major = gridLine(vCoordinate, 2.08, 1.5);
            float depthGlow = smoothstep(.08, 2.8, vDepth);
            float slopeGlow = smoothstep(.015, .38, vSlope);
            float line = max(minor * .42, major * .95);
            vec3 flatColor = vec3(.19, .28, .42);
            vec3 wellColor = vec3(.47, .66, .94);
            vec3 color = mix(flatColor, wellColor, clamp(depthGlow * .75 + slopeGlow * .38, 0.0, 1.0));
            float alpha = line * (.13 + depthGlow * .24 + slopeGlow * .18) * uOpacity;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </mesh>
  );
}
