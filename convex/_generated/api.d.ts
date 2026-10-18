/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dashboard_queries from "../dashboard/queries.js";
import type * as holidays_mutations from "../holidays/mutations.js";
import type * as holidays_queries from "../holidays/queries.js";
import type * as http from "../http.js";
import type * as invites_actions from "../invites/actions.js";
import type * as invites_mutations from "../invites/mutations.js";
import type * as invites_queries from "../invites/queries.js";
import type * as invoices_mutations from "../invoices/mutations.js";
import type * as invoices_queries from "../invoices/queries.js";
import type * as jobSites_mutations from "../jobSites/mutations.js";
import type * as jobSites_queries from "../jobSites/queries.js";
import type * as lib from "../lib.js";
import type * as memberships_mutations from "../memberships/mutations.js";
import type * as memberships_queries from "../memberships/queries.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as seed from "../seed.js";
import type * as tenants_mutations from "../tenants/mutations.js";
import type * as tenants_queries from "../tenants/queries.js";
import type * as timesheets_mutations from "../timesheets/mutations.js";
import type * as timesheets_queries from "../timesheets/queries.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "dashboard/queries": typeof dashboard_queries;
  "holidays/mutations": typeof holidays_mutations;
  "holidays/queries": typeof holidays_queries;
  http: typeof http;
  "invites/actions": typeof invites_actions;
  "invites/mutations": typeof invites_mutations;
  "invites/queries": typeof invites_queries;
  "invoices/mutations": typeof invoices_mutations;
  "invoices/queries": typeof invoices_queries;
  "jobSites/mutations": typeof jobSites_mutations;
  "jobSites/queries": typeof jobSites_queries;
  lib: typeof lib;
  "memberships/mutations": typeof memberships_mutations;
  "memberships/queries": typeof memberships_queries;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  seed: typeof seed;
  "tenants/mutations": typeof tenants_mutations;
  "tenants/queries": typeof tenants_queries;
  "timesheets/mutations": typeof timesheets_mutations;
  "timesheets/queries": typeof timesheets_queries;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
