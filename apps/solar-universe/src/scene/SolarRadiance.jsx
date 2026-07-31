import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HDR_WHITE = new THREE.Color(5.6, 5.15, 4.1);
const HDR_WARM = new THREE.Color(3.4, 2.45, 1.25);

function createRadialTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.12, 'rgba(255,255,248,.98)');
  gradient.addColorStop(0.3, 'rgba(255,240,190,.72)');
  gradient.addColorStop(0.58, 'rgba(255,176,78,.22)');
  gradient.addColorStop(1, 'rgba(255,110,30,0)');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createStreakTexture(vertical = false) {
  const width = vertical ? 128 : 1024;
  const height = vertical ? 1024 : 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  const centerX = width / 2;
  const centerY = height / 2;
  const longGradient = vertical
    ? context.createLinearGradient(0, 0, 0, height)
    : context.createLinearGradient(0, 0, width, 0);

  longGradient.addColorStop(0, 'rgba(255,230,160,0)');
  longGradient.addColorStop(0.42, 'rgba(255,244,205,.06)');
  longGradient.addColorStop(0.49, 'rgba(255,255,248,.7)');
  longGradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  longGradient.addColorStop(0.51, 'rgba(255,255,248,.7)');
  longGradient.addColorStop(0.58, 'rgba(255,244,205,.06)');
  longGradient.addColorStop(1, 'rgba(255,230,160,0)');

  const crossGradient = vertical
    ? context.createLinearGradient(0, 0, width, 0)
    : context.createLinearGradient(0, 0, 0, height);
  crossGradient.addColorStop(0, 'rgba(255,255,255,0)');
  crossGradient.addColorStop(0.42, 'rgba(255,255,255,.08)');
  crossGradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  crossGradient.addColorStop(0.58, 'rgba(255,255,255,.08)');
  crossGradient.addColorStop(1, 'rgba(255,255,255,0)');

  context.globalCompositeOperation = 'source-over';
  context.fillStyle = longGradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = crossGradient;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export default function SolarRadiance({ brightness = 1, selected = false, quality = 'quality' }) {
  const aura = useRef();
  const core = useRef();
  const horizontal = useRef();
  const vertical = useRef();
  const radialTexture = useMemo(createRadialTexture, []);
  const horizontalTexture = useMemo(() => createStreakTexture(false), []);
  const verticalTexture = useMemo(() => createStreakTexture(true), []);

  useFrame(({ clock }) => {
    const visualPower = Math.pow(THREE.MathUtils.clamp(brightness, 0.25, 2.5), 1.3);
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.32) * 0.012;
    const selectedBoost = selected ? 1.12 : 1;

    if (aura.current) {
      aura.current.scale.setScalar((5.8 + visualPower * 0.9) * pulse * selectedBoost);
      aura.current.material.opacity = THREE.MathUtils.clamp(
        0.2 + visualPower * 0.16 + (selected ? 0.08 : 0),
        0.18,
        0.72
      );
    }

    if (core.current) {
      core.current.scale.setScalar((2.05 + visualPower * 0.42) * pulse);
      core.current.material.opacity = THREE.MathUtils.clamp(
        0.66 + visualPower * 0.15,
        0.68,
        0.98
      );
    }

    const streakOpacity = quality === 'quality'
      ? THREE.MathUtils.clamp(0.08 + visualPower * 0.11, 0.08, 0.42)
      : THREE.MathUtils.clamp(0.04 + visualPower * 0.06, 0.04, 0.2);

    if (horizontal.current) horizontal.current.material.opacity = streakOpacity;
    if (vertical.current) vertical.current.material.opacity = streakOpacity * 0.62;
  });

  return (
    <group>
      <sprite ref={aura} scale={[6.7, 6.7, 1]} renderOrder={-1} raycast={() => null}>
        <spriteMaterial
          map={radialTexture}
          color={HDR_WARM}
          transparent
          opacity={0.36}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={core} scale={[2.5, 2.5, 1]} renderOrder={1} raycast={() => null}>
        <spriteMaterial
          map={radialTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.86}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={horizontal} scale={[9.2, 0.74, 1]} renderOrder={2} raycast={() => null}>
        <spriteMaterial
          map={horizontalTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={vertical} scale={[0.52, 7.2, 1]} renderOrder={2} raycast={() => null}>
        <spriteMaterial
          map={verticalTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
