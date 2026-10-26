import { region } from '../config/site';
import { llmsText } from '../site/discovery';

export const GET = () => new Response(llmsText(region), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
