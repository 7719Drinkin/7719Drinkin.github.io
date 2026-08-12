import * as THREE from 'three';

const MASK_VERSION = 'anime-night-mask-v1';
const NIGHT_FLOOR = 0.025;

export function installAnimeNightMask(material, bindings) {
  const previousCompile = material.onBeforeCompile;
  const previousCacheKey = material.customProgramCacheKey;

  material.onBeforeCompile = function compileAnimeNightMask(shader, renderer) {
    if (previousCompile) previousCompile.call(this, shader, renderer);

    shader.uniforms.uAnimePlanetCenter = { value: new THREE.Vector3() };
    shader.uniforms.uAnimeSunDirection = { value: new THREE.Vector3(-1, 0, 0) };

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vAnimeWorldPosition;'
    ).replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvAnimeWorldPosition = worldPosition.xyz;'
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vAnimeWorldPosition;\nuniform vec3 uAnimePlanetCenter;\nuniform vec3 uAnimeSunDirection;'
    ).replace(
      '#include <opaque_fragment>',
      `vec3 animeRadial = normalize(vAnimeWorldPosition - uAnimePlanetCenter);\nfloat animeFacing = dot(animeRadial, normalize(uAnimeSunDirection));\nfloat animeDaylight = smoothstep(0.03, 0.18, animeFacing);\noutgoingLight *= mix(${NIGHT_FLOOR.toFixed(3)}, 1.0, animeDaylight);\n#include <opaque_fragment>`
    );

    bindings.add(shader);
  };

  material.customProgramCacheKey = function animeNightMaskCacheKey() {
    const previousKey = previousCacheKey ? previousCacheKey.call(this) : '';
    return `${previousKey}|${MASK_VERSION}`;
  };
  material.needsUpdate = true;

  return () => {
    material.onBeforeCompile = previousCompile;
    material.customProgramCacheKey = previousCacheKey;
    material.needsUpdate = true;
  };
}
