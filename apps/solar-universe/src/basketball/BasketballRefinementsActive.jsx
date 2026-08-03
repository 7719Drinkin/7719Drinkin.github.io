import { useLayoutEffect, useRef } from 'react';
import BasketballRefinements from './BasketballRefinements.jsx';
import BasketballAtmosphereHalo from './BasketballAtmosphereHalo.jsx';

function isLegacyAtmosphere(object) {
  const uniforms = object.material?.uniforms;
  return Boolean(
    object.isMesh
    && object.material?.isShaderMaterial
    && uniforms?.uInnerStart
    && uniforms?.uInnerEnd
    && uniforms?.uOuterStart
  );
}

export default function BasketballRefinementsActive({ radius, quality }) {
  const root = useRef();

  useLayoutEffect(() => {
    root.current?.traverse((object) => {
      if (isLegacyAtmosphere(object)) object.visible = false;
    });
  }, [quality]);

  return (
    <group ref={root}>
      <BasketballRefinements radius={radius} quality={quality} />
      <BasketballAtmosphereHalo radius={radius} quality={quality} />
    </group>
  );
}
