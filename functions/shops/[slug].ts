import { renderPublicProfile } from '../../apps/web/pages-profile';
export const onRequestGet=renderPublicProfileForShop;
function renderPublicProfileForShop(context:Parameters<typeof renderPublicProfile>[0]){return renderPublicProfile(context,'shops');}
