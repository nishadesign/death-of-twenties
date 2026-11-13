import type { StationId } from '../simulation/types';

export type StoryImage = {
  id: string;
  src: string | null;
  alt: string;
  caption?: string;
  iteration?: number;
};
export type StoryIteration = {
  id: string;
  title: string;
  prompt?: string;
  description?: string;
  imageIds?: string[];
};
export type StationStory = {
  stationId: StationId;
  subtitle?: string;
  intention?: string;
  plannedImages: StoryImage[];
  builtImages: StoryImage[];
  iterations: StoryIteration[];
  reflection?: string;
  // Opt in only when the two photographs have comparable framing.
  comparison?: { plannedId: string; builtId: string };
  sourceNote?: string;
};
