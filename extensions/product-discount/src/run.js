import { DiscountApplicationStrategy } from "../generated/api";

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

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

export function run(input) {
  const discounts = [];

  for (const line of input.cart.lines) {
    // @ts-ignore
    const variantId = line.merchandise?.id;
    // @ts-ignore
    const metafieldValue = line.merchandise?.metafield?.value;
    if (!variantId || !metafieldValue) continue;

    let rule;
    try {
      rule = JSON.parse(metafieldValue);
    } catch (e) {
      console.error(`Invalid metafield JSON for variant ${variantId}`);
      continue;
    }
    if (
      rule.variantId !== variantId ||
      typeof rule.quantity !== "number" ||
      typeof rule.percentage !== "number"
    ) {
      continue;
    }

    if (line.quantity >= rule.quantity) {
      discounts.push({
        targets: [{ cartLine: { id: line.id } }],
        value: {
          percentage: {
            value: rule.percentage.toString(),
          },
        },
        message: rule.saleMessage || "Special Discount",
      });
    }
  }

  if (discounts.length === 0) {
    console.error("No qualifying variants for discount.");
    return EMPTY_DISCOUNT;
  }

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.All,
    discounts,
  };
}
