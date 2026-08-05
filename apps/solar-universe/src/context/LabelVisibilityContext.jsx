import { createContext, useContext } from 'react';

const LabelVisibilityContext = createContext(true);

export function LabelVisibilityProvider({ visible, children }) {
  return (
    <LabelVisibilityContext.Provider value={visible}>
      {children}
    </LabelVisibilityContext.Provider>
  );
}

export function useLabelVisibility() {
  return useContext(LabelVisibilityContext);
}
