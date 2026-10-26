import { region } from '../config/site';
import { sitemapIndex } from '../site/discovery';

export const GET = () => new Response(sitemapIndex(region), {
  headers: { 'Content-Type': 'application/xml; charset=utf-8' },
});
