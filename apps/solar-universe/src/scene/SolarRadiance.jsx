import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const HDR_WHITE = new THREE.Color(5.6, 5.15, 4.1);
const HDR_WARM = new THREE.Color(2.7, 2.05, 1.15);

function createRadialTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);

  // Keep the radiance concentrated close to the photosphere. A fast falloff
  // avoids the large, flat orange disc that previously covered the grid.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.14, 'rgba(255,255,248,.96)');
  gradient.addColorStop(0.3, 'rgba(255,236,178,.48)');
  gradient.addColorStop(0.46, 'rgba(255,182,82,.1)');
  gradient.addColorStop(0.68, 'rgba(255,130,45,.018)');
  gradient.addColorStop(1, 'rgba(255,100,25,0)');

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

  const longGradient = vertical
    ? context.createLinearGradient(0, 0, 0, height)
    : context.createLinearGradient(0, 0, width, 0);

  longGradient.addColorStop(0, 'rgba(255,230,160,0)');
  longGradient.addColorStop(0.45, 'rgba(255,244,205,.025)');
  longGradient.addColorStop(0.492, 'rgba(255,255,248,.45)');
  longGradient.addColorStop(0.5, 'rgba(255,255,255,.9)');
  longGradient.addColorStop(0.508, 'rgba(255,255,248,.45)');
  longGradient.addColorStop(0.55, 'rgba(255,244,205,.025)');
  longGradient.addColorStop(1, 'rgba(255,230,160,0)');

  const crossGradient = vertical
    ? context.createLinearGradient(0, 0, width, 0)
    : context.createLinearGradient(0, 0, 0, height);
  crossGradient.addColorStop(0, 'rgba(255,255,255,0)');
  crossGradient.addColorStop(0.46, 'rgba(255,255,255,.025)');
  crossGradient.addColorStop(0.5, 'rgba(255,255,255,1)');
  crossGradient.addColorStop(0.54, 'rgba(255,255,255,.025)');
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
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.32) * 0.008;
    const selectedBoost = selected ? 1.05 : 1;

    if (aura.current) {
      aura.current.scale.setScalar((3.05 + visualPower * 0.26) * pulse * selectedBoost);
      aura.current.material.opacity = THREE.MathUtils.clamp(
        0.035 + visualPower * 0.026 + (selected ? 0.018 : 0),
        0.035,
        0.13
      );
    }

    if (core.current) {
      core.current.scale.setScalar((1.78 + visualPower * 0.2) * pulse);
      core.current.material.opacity = THREE.MathUtils.clamp(
        0.58 + visualPower * 0.105,
        0.6,
        0.9
      );
    }

    const streakOpacity = quality === 'quality'
      ? THREE.MathUtils.clamp(0.025 + visualPower * 0.035, 0.025, 0.13)
      : THREE.MathUtils.clamp(0.012 + visualPower * 0.018, 0.012, 0.065);

    if (horizontal.current) horizontal.current.material.opacity = streakOpacity;
    if (vertical.current) vertical.current.material.opacity = streakOpacity * 0.48;
  });

  return (
    <group>
      <sprite ref={aura} scale={[3.35, 3.35, 1]} renderOrder={-1} raycast={() => null}>
        <spriteMaterial
          map={radialTexture}
          color={HDR_WARM}
          transparent
          opacity={0.065}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={core} scale={[2, 2, 1]} renderOrder={1} raycast={() => null}>
        <spriteMaterial
          map={radialTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={horizontal} scale={[6.4, 0.34, 1]} renderOrder={2} raycast={() => null}>
        <spriteMaterial
          map={horizontalTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.055}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>

      <sprite ref={vertical} scale={[0.24, 4.8, 1]} renderOrder={2} raycast={() => null}>
        <spriteMaterial
          map={verticalTexture}
          color={HDR_WHITE}
          transparent
          opacity={0.026}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  );
}
