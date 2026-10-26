import { region } from '../../config/site';
import { securityText } from '../../site/discovery';

export const GET = () => new Response(securityText(region), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
