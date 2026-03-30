import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncEscrow = mutation({
  args: {
    escrowId: v.float64(),
    buyerAddress: v.string(),
    supplierAddress: v.string(),
    amountUsd: v.float64(),
    status: v.string(),
    deadlineAt: v.float64(),
    invoiceRef: v.optional(v.string()),
    eventDetails: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("escrows")
      .withIndex("by_escrowId", (q) => q.eq("escrowId", args.escrowId))
      .unique();

    if (existing) {
      if (existing.status !== args.status) {
        await ctx.db.patch(existing._id, { status: args.status });
      }
    } else {
      await ctx.db.insert("escrows", {
        escrowId: args.escrowId,
        buyerAddress: args.buyerAddress,
        supplierAddress: args.supplierAddress,
        amountUsd: args.amountUsd,
        status: args.status,
        deadlineAt: args.deadlineAt,
        invoiceRef: args.invoiceRef,
      });
    }

    // Sync TO: activity_logs (snake_case)
    await ctx.db.insert("activity_logs", {
      escrowId: args.escrowId,
      userAddress: args.buyerAddress,
      eventType: `ESCROW_${args.status.toUpperCase()}`,
      details: args.eventDetails,
      createdAt: Date.now(),
    });
  },
});

export const listMyEscrows = query({
  args: { userAddress: v.string() },
  handler: async (ctx, args) => {
    const asBuyer = await ctx.db
      .query("escrows")
      .withIndex("by_buyer", (q) => q.eq("buyerAddress", args.userAddress))
      .collect();

    const asSupplier = await ctx.db
      .query("escrows")
      .withIndex("by_supplier", (q) => q.eq("supplierAddress", args.userAddress))
      .collect();

    const all = [...asBuyer, ...asSupplier];
    return all.filter((v, i, a) => a.findIndex((t) => t.escrowId === v.escrowId) === i);
  },
});

export const getMyActivity = query({
  args: { userAddress: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activity_logs")
      .withIndex("by_user", (q) => q.eq("userAddress", args.userAddress))
      .order("desc")
      .take(args.limit);
  },
});
