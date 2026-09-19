import React from 'react';
import { PointerProvider, SelectionProvider } from './stores/selectionStore';
import { WorkspaceConfig } from './components/WorkspaceConfig';

// Packaging CAD & 3D Workspace
export const DieCuttingWorkspace: React.FC = () => {
  return (
    <PointerProvider>
      <SelectionProvider>
        <WorkspaceConfig />
      </SelectionProvider>
    </PointerProvider>
  );
};

export default DieCuttingWorkspace;
