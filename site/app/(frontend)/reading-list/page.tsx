import type { Metadata } from 'next';
import SavedStories from './SavedStories';
export const metadata:Metadata={title:'Your reading list',description:'Stories saved in this browser for later reading.',
  robots:{index:false,follow:false}};
export default function ReadingListPage(){return <SavedStories/>;}
