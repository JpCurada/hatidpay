import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. User Profiles
  users: defineTable({
    stellarAddress: v.string(),
    businessName: v.optional(v.string()),
    businessType: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  }).index("by_address", ["stellarAddress"]),

  // 2. Escrows
  escrows: defineTable({
    escrowId: v.float64(),
    buyerAddress: v.string(),
    supplierAddress: v.string(),
    amountUsd: v.float64(),
    status: v.string(),
    deadlineAt: v.float64(),
    invoiceRef: v.optional(v.string()),
  })
  .index("by_escrowId", ["escrowId"])
  .index("by_buyer", ["buyerAddress"])
  .index("by_supplier", ["supplierAddress"]),

  // 3. Activity Logs (SNAKE_CASE to match server preference)
  activity_logs: defineTable({
    escrowId: v.optional(v.float64()),
    userAddress: v.string(),
    eventType: v.string(),
    details: v.string(),
    createdAt: v.float64(),
  }).index("by_user", ["userAddress"]),

  // 4. On-Ramp (SNAKE_CASE)
  on_ramp_transactions: defineTable({
    userAddress: v.string(),
    anchor: v.string(),
    phpAmount: v.float64(),
    usdcAmount: v.optional(v.float64()),
    status: v.string(),
  }).index("by_user", ["userAddress"]),
});
