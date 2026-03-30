import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get user profile
export const getOrCreateUser = mutation({
  args: { 
    stellarAddress: v.string(), 
    businessName: v.optional(v.string()), 
    businessType: v.optional(v.string()) 
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("stellarAddress", args.stellarAddress))
      .unique();

    if (existingUser) return existingUser;

    const userId = await ctx.db.insert("users", {
      stellarAddress: args.stellarAddress,
      businessName: args.businessName || "New Business",
      businessType: args.businessType || "Retail",
    });

    // FIX: Using snake_case 'activity_logs' to match corrected schema.ts
    await ctx.db.insert("activity_logs", {
      userAddress: args.stellarAddress,
      eventType: "USER_REGISTERED",
      details: `Business profile created: ${args.businessName || "New Business"}`,
      createdAt: Date.now(),
    });

    return await ctx.db.get(userId);
  },
});

export const updateProfile = mutation({
  args: { 
    stellarAddress: v.string(),
    businessName: v.string(),
    businessType: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("stellarAddress", args.stellarAddress))
      .unique();

    if (!user) throw new Error("User not found.");

    await ctx.db.patch(user._id, {
      businessName: args.businessName,
      businessType: args.businessType,
    });
  },
});

export const getUser = query({
  args: { stellarAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_address", (q) => q.eq("stellarAddress", args.stellarAddress))
      .unique();
  },
});
