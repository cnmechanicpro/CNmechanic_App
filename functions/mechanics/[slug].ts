import { renderPublicProfile } from '../../apps/web/pages-profile';
export const onRequestGet=renderPublicProfileForMechanic;
function renderPublicProfileForMechanic(context:Parameters<typeof renderPublicProfile>[0]){return renderPublicProfile(context,'mechanics');}
