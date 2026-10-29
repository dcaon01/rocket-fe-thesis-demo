import { environment } from '../../../environments/environment';

/** Whether the website and marketing metrics pages are reachable: hidden until they have data. */
export const SHOW_WEBSITE_AND_MARKETING_METRICS = false;

// Demo mode (INTEGRATIONS_ENABLED=false), not part of the original Rocket.
/** Whether the app talks to the external integrations: off in the demo, where their actions are hidden and their live figures fall back. */
export const INTEGRATIONS_ENABLED = environment.integrationsEnabled;
