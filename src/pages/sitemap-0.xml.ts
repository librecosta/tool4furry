import { region } from '../config/site';
import { sitemapXML } from '../site/discovery';

export const GET = () => new Response(sitemapXML(region), {
  headers: { 'Content-Type': 'application/xml; charset=utf-8' },
});
