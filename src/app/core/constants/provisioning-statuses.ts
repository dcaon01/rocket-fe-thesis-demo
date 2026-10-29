import { TenantStatus } from '../enums/tenant-status.enum';

/** Statuses of a tenant or user the product has created: only these can be changed or deleted. */
export const ON_PRODUCT_STATUSES: string[] = [TenantStatus.Active, TenantStatus.Inactive];

/** Statuses of a tenant or user that can be removed for good: deleted on the product, or a discarded request. */
export const PURGEABLE_STATUSES: string[] = [TenantStatus.Deleted, TenantStatus.Cancelled];
