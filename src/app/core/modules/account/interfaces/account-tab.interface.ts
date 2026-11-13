/**
 * Section of the account dialog, also used as the value of the `profilo` query param.
 */
export type AccountTab = 'dati' | 'sicurezza';

/**
 * Sections of the account dialog, in display order.
 */
export const ACCOUNT_TABS: { id: AccountTab; label: string; description: string; icon: string }[] = [
  { id: 'dati', label: 'Dati personali', description: 'Nome, cognome e foto che vedono i colleghi.', icon: 'lucideUserRound' },
  { id: 'sicurezza', label: 'Sicurezza', description: 'Cambia la password di accesso. Dopo la modifica dovrai rientrare.', icon: 'lucideShieldCheck' },
];
