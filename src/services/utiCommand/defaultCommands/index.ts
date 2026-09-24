import { UtiCommandItem } from '../types';
import { jobAndRenderCommands } from './jobAndRenderCommands';
import { systemAndBuildCommands } from './systemAndBuildCommands';
import { industryCommands } from './industryCommands';

export const DEFAULT_TOOLX_UTICOMMANDS: UtiCommandItem[] = [
  ...jobAndRenderCommands,
  ...systemAndBuildCommands,
  ...industryCommands
];

export * from './jobAndRenderCommands';
export * from './systemAndBuildCommands';
export * from './industryCommands';
