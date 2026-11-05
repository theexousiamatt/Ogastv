'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock3, Star } from 'lucide-react';
import type { Article } from '@/lib/content';
import { prettyDate } from '@/lib/content';

// Free-to-use Lagos photograph by Tunde Buremo, Unsplash.
// Decorative only when the CMS has no published hero story.
const lagosImage = 'https://images.unsplash.com/photo-1744907895363-d351aa6019ef?auto=format&fit=crop&w=1400&q=80';

export function FeaturedHero({ stories }: { stories: Article[] }) {
  const [active, setActive] = useState(0);
  const featured = stories.slice(0, 3);
  const story = featured[active];
  const hasSlides = featured.length > 1;
  const move = (direction: number) => setActive((current) => (current + direction + featured.length) % featured.length);
  return (
    <section className="ogas-home-hero" aria-label="Featured editorial story">
      <div className="ogas-home-hero__content">
        <span className="ogas-feature-chip"><Star size={13} fill="currentColor"/> Featured</span>
        <h1>{story ? story.title : <>The stories that <span>bring us closer.</span></>}</h1>
        <p>{story ? story.excerpt : 'Grassroots journalism, community perspectives, and the ideas shaping Lagos, Nigeria and the wider African continent.'}</p>
        <div className="ogas-home-hero__meta">
          {story ? <>
            <Clock3 size={13}/><time dateTime={story.date}>{prettyDate(story.date)}</time>
            {story.category && <span className="ogas-category-label">{story.category.name}</span>}
          </> : <><span className="ogas-hero-intro-dot"/> People first. Stories that matter.</>}
        </div>
        <Link className="ogas-red-button" href={story ? '/stories/' + encodeURIComponent(story.slug) : '/latest'}>
          {story ? 'Read full story' : 'Explore latest stories'} <ArrowRight size={15}/>
        </Link>
      </div>
      <div className="ogas-home-hero__visual">
        {/* Photo is editorial atmosphere only until the client publishes real reports. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story?.image?.url || lagosImage}
          alt={story ? story.image?.alt || story.title : 'An aerial view of Lagos waterways and the city'}
          loading="eager" />
        {!story && <span className="ogas-photo-credit">Lagos, Nigeria · Photo: Tunde Buremo / Unsplash</span>}
        {hasSlides && <div className="ogas-hero-controls">
          <button type="button" aria-label="Previous featured story" onClick={()=>move(-1)}><ArrowLeft size={16}/></button>
          <button type="button" aria-label="Next featured story" onClick={()=>move(1)}><ArrowRight size={16}/></button>
        </div>}
      </div>
    </section>
  );
}
