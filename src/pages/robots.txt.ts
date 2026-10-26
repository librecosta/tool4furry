import { region } from '../config/site';
import { robotsText } from '../site/discovery';

export const GET = () => new Response(robotsText(region), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
