import { api, unwrapApi } from '$core/api';
import {
	REPUTATION_TRIGGER_CATALOG,
	type ReputationTrigger,
	type ReputationTriggerCatalogItem,
	type ReputationType
} from '@company-of-heroes/api';

export type { ReputationTrigger, ReputationTriggerCatalogItem, ReputationType };

export { REPUTATION_TRIGGER_CATALOG };

export async function listReputationTypes(): Promise<ReputationType[]> {
	return unwrapApi(api.reputation.listReputationTypes());
}
