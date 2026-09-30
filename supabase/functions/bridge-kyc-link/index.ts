// Retired: consumer onboarding must never create an identity with a provider.
// UBO/director verification remains part of the business KYB flow.
import { retiredIndividualOnboarding } from '../_shared/retired-individual-onboarding.ts';
Deno.serve(retiredIndividualOnboarding);
