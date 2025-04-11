// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Use JSDoc annotations for type safety
/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant} ProductVariant
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

// Replace this with your actual rules
const variantDiscountRules = {
  "gid://shopify/ProductVariant/50246121259319": {
    threshold: 5,
    percentage: "50.0",
    message: "50% off for buying 3 or more!",
  },
  "gid://shopify/ProductVariant/50246121292087": {
    threshold: 3,
    percentage: "60.0",
    message: "60% off for buying 3 or more!",
  },
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

export function run(input) {
  //console.log('====Prisma====>', prisma);
  const discounts = [];
  for (const line of input.cart.lines) {
    const variantId = line.merchandise?.id;
    if (!variantId) continue; // Skip if variant ID is missing

    //const rule = variantDiscountRules[variantId]; // Check discount rules for this variant
    const rule = variantDiscountRules[variantId]; // Check discount rules for this variant
   // console.log('====Rules====>', rule.threshold);
    if (!rule) continue; // Skip if no rule exists for this variant

    if (line.quantity >= rule.threshold) {
      discounts.push({
        targets: [{ cartLine: { id: line.id } }],
        value: {
          percentage: {
            value: rule.percentage.toString(), // Ensure it's a string
          },
        },
        message: rule.message || "Special Discount", // Default message
      });
    }
  }

  if (discounts.length === 0) {
    console.error("No qualifying variants for discount.");
    return EMPTY_DISCOUNT;
  }

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All, // Change to 'Maximum' or 'All' if needed
    discounts,
  };
}
