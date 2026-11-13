import type { StationStory, StoryImage } from '../stories/types';
import { getStoryImages } from '../stories/manifest';
import StoryImageCard from './StoryImageCard';

export default function DesignProcessTimeline({ story, onOpen }: { story: StationStory; onOpen: (image: StoryImage) => void }) {
  const images = getStoryImages(story);
  const planned = story.plannedImages.filter(image => image.src), built = story.builtImages.filter(image => image.src);
  if (!story.intention && !planned.length && !story.iterations.length && !built.length && !story.reflection) return null;
  return <section className="design-process" aria-labelledby="process-title"><h3 id="process-title" className="eyebrow">HOW IT CAME TO LIFE</h3><ol>
    {(story.intention || planned.length > 0) && <li><h4>Imagine</h4>{story.intention && <p>{story.intention}</p>}{planned.slice(0, 1).map(image => <StoryImageCard key={image.id} image={image} label="Concept" onOpen={onOpen} compact/>)}</li>}
    {story.iterations.length > 0 && <li><h4>Iterate</h4>{story.iterations.map(iteration => <div className="story-iteration" key={iteration.id}><h5>{iteration.title}</h5>{iteration.prompt && <blockquote><span>Human direction</span>“{iteration.prompt}”</blockquote>}{iteration.description && <p>{iteration.description}</p>}<div className="iteration-images">{iteration.imageIds?.map(id => images.find(image => image.id === id)).filter((image): image is StoryImage => Boolean(image)).map(image => <StoryImageCard key={image.id} image={image} label="Concept" onOpen={onOpen} compact/>)}</div></div>)}</li>}
    {built.length > 0 && <li><h4>Build</h4><StoryImageCard image={built[0]} label="At the party" onOpen={onOpen} compact/></li>}
    {story.reflection && <li><h4>Reflect</h4><p>{story.reflection}</p></li>}
  </ol></section>;
}
