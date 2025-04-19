import { prisma } from "../lib/prisma";
import { addVariantMetafield, handleMetafields } from "./app.helpers";

export const prismafindFirst = async (
  variantId: any,
  storeUrl: any,
  productId: any,
) => {
  try {
    const whereClause = productId
      ? { productId, variantId, storeUrl }
      : { variantId, storeUrl };
    const discount = await prisma.discount.findFirst({ where: whereClause });
    return discount || null;
  } catch (error) {
    console.error("Error finding discount:", error);
    return null;
  }
};

export const prismaFindMany = async (
  storeUrl: any,
  skip: any,
  limit: any,
  shopify: any,
) => {
  try {
    const [discounts, total] = await Promise.all([
      prisma.discount.findMany({
        where: { storeUrl },
        skip,
        take: limit,
      }),
      prisma.discount.count({
        where: { storeUrl },
      }),
    ]);
    await handleMetafields(shopify, discounts);
    return { discounts, total };
  } catch (error) {
    console.error("prismaFindMany error:", error);
    return { discounts: null, total: null };
  }
};

export const prismaCreateDiscount = async (discountData: any) => {
  try {
    await prisma.discount.create({
      data: {
        productId: discountData[0].productId,
        variantId: discountData[0].variantId,
        quantity: discountData[0].quantity,
        percentage: discountData[0].percentage,
        saleMessage: discountData[0].saleMessage,
        storeUrl: discountData[0].storeUrl,
      },
    });
    return;
  } catch (error) {
    console.error("Delete error:", error);
    return;
  }
};

export const prismaUpdateDiscount = async (
  existingDiscount: { id: any },
  discountData: any,
) => {
  try {
    await prisma.discount.update({
      where: {
        id: existingDiscount.id,
      },
      data: {
        productId: discountData[0].productId,
        variantId: discountData[0].variantId,
        quantity: discountData[0].quantity,
        percentage: discountData[0].percentage,
        saleMessage: discountData[0].saleMessage,
        storeUrl: discountData[0].storeUrl,
        customMessage: discountData[0].customMessage,
      },
    });
    return;
  } catch (error) {
    console.error("Delete error:", error);
    return;
  }
};

export const prismaDeleteMany = async (
  shopify: any,
  discountDataValue: {
    productId: any;
    variantId: any;
    quantity: any;
    percentage: any;
    saleMessage: any;
    storeUrl: any;
  },
) => {
  try {
    const discountData = [
      {
        productId: discountDataValue.productId,
        variantId: discountDataValue.variantId,
        quantity: discountDataValue.quantity,
        percentage: discountDataValue.percentage,
        saleMessage: discountDataValue.saleMessage,
        storeUrl: discountDataValue.storeUrl,
      },
    ];
    await prisma.discount.deleteMany({
      where: {
        variantId: discountData[0].variantId,
        storeUrl: discountData[0].storeUrl,
      },
    });
    const shouldDelete = true;
    await addVariantMetafield(shopify, discountData, shouldDelete);
  } catch (error) {
    console.error("Delete error:", error);
  }
};
