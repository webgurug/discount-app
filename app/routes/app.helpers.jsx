export async function createFunction(shopify) {
  const query = `
  query {
    shopifyFunctions(first: 50) {
      edges {
        node {
        app{
        title
        }
        id
        title
        apiType
        }
      }
    }
  }
`;
  const response = await shopify.admin.graphql(query);
  const json = await response.json();
  const productDiscountFunction = json?.data?.shopifyFunctions?.edges.find(
    (edge) => edge.node.apiType === "product_discounts",
  )?.node;

  if (productDiscountFunction) {
    const createAutomaticDiscountMutation = `#graphql
  mutation discountAutomaticAppCreate($automaticAppDiscount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount {
        discountId
      }
      userErrors {
        field
        message
      }
    }
  }
`;

    const variables = {
      automaticAppDiscount: {
        title: "Automatic Discount Sale",
        functionId: productDiscountFunction.id,
        startsAt: "2025-04-01T00:00:00",
      },
    };
    await shopify.admin.graphql(createAutomaticDiscountMutation, {
      variables,
    });
  }
}

export async function addVariantMetafield(
  shopify,
  discountData,
  shouldDelete = false,
) {
  const definitionCheckQuery = `#graphql
      query {
        metafieldDefinitions(first: 1, namespace: "discount_data", key: "discount_info", ownerType: PRODUCTVARIANT) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

  const definitionCheckRes = await shopify.admin.graphql(definitionCheckQuery);
  const checkJson = await definitionCheckRes.json();
  const existingDefinition =
    checkJson?.data?.metafieldDefinitions?.edges?.[0]?.node;
  if (existingDefinition) {
    if (shouldDelete) await deleteVariantMetafield(shopify, discountData);
    else await saveVariantMetafield(shopify, discountData);
    return existingDefinition.id;
  }

  const createDefinitionMutation = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
        }
        userErrors {
          field
          message
          code
        }
      }
    }`;

  const definitionVariables = {
    definition: {
      name: "Discount Info",
      namespace: "discount_data",
      key: "discount_info",
      description: "Discount information related to product variants.",
      type: "multi_line_text_field",
      ownerType: "PRODUCTVARIANT",
    },
  };

  const createRes = await shopify.admin.graphql(createDefinitionMutation, {
    variables: definitionVariables,
  });

  const createJson = await createRes.json();
  const newDefinition =
    createJson?.data?.metafieldDefinitionCreate?.createdDefinition;
  if (!newDefinition) {
    return "Failed to create metafield definition.";
  } else {
    if (shouldDelete) await deleteVariantMetafield(shopify, discountData);
    else await saveVariantMetafield(shopify, discountData);
  }
  return newDefinition.id;
}

async function saveVariantMetafield(shopify, discounts) {
  for (let discountData of discounts) {
    console.log(discountData.variantId, "discountData.variantId?>>>>>>>>>>>>>");
    const metafieldMutation = `#graphql
        mutation variantMetafieldsSet {
          metafieldsSet(metafields: [{
            ownerId: "${discountData.variantId}",
            namespace: "discount_data",
            key: "discount_info",
            type: "multi_line_text_field",
            value: ${discountData ? JSON.stringify(JSON.stringify(discountData)) : ""}
          }]) {
            metafields {
              id
              key
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

    const metafieldRes = await shopify.admin.graphql(metafieldMutation);
    const metafieldJson = await metafieldRes.json();
    if (metafieldJson?.data?.metafieldsSet?.userErrors?.length) {
      return "Error setting metafield";
    }
  }
}

async function deleteVariantMetafield(shopify, discounts) {
  for (let discountData of discounts) {
    console.log(
      discountData.variantId,
      "discountData.variantId?>>>>>>>>>>delete>>>",
    );
    const metafieldMutation = `#graphql
      mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          deletedMetafields {
            key
            namespace
            ownerId
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      metafields: [
        {
          ownerId: discountData.variantId,
          namespace: "discount_data",
          key: "discount_info",
        },
      ],
    };

    const metafieldRes = await shopify.admin.graphql(metafieldMutation, {
      variables,
    });

    const metafieldJson = await metafieldRes.json();
    const errors = metafieldJson?.data?.metafieldsDelete?.userErrors;
    await deleteVariantMetafieldCustomMessage(shopify, discounts);
    if (errors && errors.length > 0) {
      console.error("Metafield delete error:", errors);
      return "Error deleting metafield";
    }
  }
}

async function deleteVariantMetafieldCustomMessage(shopify, discounts) {
  for (let discountData of discounts) {
    console.log(
      discountData.variantId,
      "discountData.variantId?>>>>>>>>>>delete>>>",
    );
    const metafieldMutation = `#graphql
      mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $metafields) {
          deletedMetafields {
            key
            namespace
            ownerId
          }
          userErrors {
            field
            message
          }
        }
      }`;

    const variables = {
      metafields: [
        {
          ownerId: discountData.variantId,
          namespace: "discount_data_msg",
          key: "discount_msg",
        },
      ],
    };

    const metafieldRes = await shopify.admin.graphql(metafieldMutation, {
      variables,
    });

    const metafieldJson = await metafieldRes.json();
    const errors = metafieldJson?.data?.metafieldsDelete?.userErrors;
    if (errors && errors.length > 0) {
      console.error("Metafield delete error:", errors);
      return "Error deleting metafield";
    }
  }
}

export async function handleMetafields(shopify, discounts) {
  if (discounts && discounts.length > 0) {
    for (let discount of discounts) {
      const discountData = {
        productId: discount.productId,
        variantId: discount.variantId,
        quantity: discount.quantity,
        percentage: discount.percentage,
        saleMessage: discount.saleMessage,
        storeUrl: discount.storeUrl,
      };

      const query = `#graphql
        query ProductVariantMetafield($namespace: String!, $key: String!, $ownerId: ID!) {
        productVariant(id: $ownerId) {
        linerMaterial: metafield(namespace: $namespace, key: $key) {
        value
        }
        }
        }`;

      const response = await shopify.admin.graphql(query, {
        variables: {
          namespace: "discount_data",
          key: "discount_info",
          ownerId: discountData.variantId,
        },
      });
      const json = await response.json();
      const metafield = json.data.productVariant?.linerMaterial?.value;
      if (metafield) {
        const skipKeys = ["id", "createdAt", "updatedAt"];
        const allMatch = metafield
          ? Object.entries(JSON.parse(metafield)).every(([key, value]) => {
              const isSkipped = skipKeys.includes(key);
              const isMatch = String(discountData[key]) === String(value);
              return isSkipped || isMatch;
            })
          : null;
        if (!allMatch) {
          await addVariantMetafield(shopify, [discountData]);
        }
      } else await addVariantMetafield(shopify, [discountData]);
    }
  }
}

export async function fetchProductById(shopify, productId, variantID) {
  const query = `#graphql
  query GetProductWithVariants($productId: ID!) {
    product(id: $productId) {
      title
      variants(first: 50) {
        edges {
          node {
            id
            title
            price
          }
        }
      }
    }
  }
  `;
  const response = await shopify.admin.graphql(query, {
    variables: {
      productId: productId,
    },
  });
  const json = await response.json();
  const productData = json.data.product;
  const matchedVariant = productData.variants?.edges.find(
    (edge) => edge?.node?.id === variantID,
  );
  const returnData = {
    productTitle: productData.title,
    variantTitle: matchedVariant?.node?.title || null,
    variantPrice: matchedVariant?.node?.price || null,
  };
  return returnData;
}

export async function addVariantMetafieldForCustomMsg(shopify, data) {
  const definitionCheckQuery = `#graphql
      query {
        metafieldDefinitions(first: 1, namespace: "discount_data_msg", key: "discount_msg", ownerType: PRODUCTVARIANT) {
          edges {
            node {
              id
              name
            }
          }
        }
      }
    `;

  const definitionCheckRes = await shopify.admin.graphql(definitionCheckQuery);
  const checkJson = await definitionCheckRes.json();
  const existingDefinition =
    checkJson?.data?.metafieldDefinitions?.edges?.[0]?.node;
  if (existingDefinition) {
    await saveVariantMetafieldCustomMsg(shopify, data);
    return existingDefinition.id;
  }

  const createDefinitionMutation = `#graphql
    mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
        }
        userErrors {
          field
          message
          code
        }
      }
    }`;

  const definitionVariables = {
    definition: {
      name: "Discount Message",
      namespace: "discount_data_msg",
      key: "discount_msg",
      description: "Discount custom message related to product variants.",
      type: "multi_line_text_field",
      ownerType: "PRODUCTVARIANT",
    },
  };

  const createRes = await shopify.admin.graphql(createDefinitionMutation, {
    variables: definitionVariables,
  });

  const createJson = await createRes.json();
  const newDefinition =
    createJson?.data?.metafieldDefinitionCreate?.createdDefinition;
  if (!newDefinition) {
    return "Failed to create metafield definition.";
  } else {
    await saveVariantMetafieldCustomMsg(shopify, data);
  }
  return newDefinition.id;
}

async function saveVariantMetafieldCustomMsg(shopify, data) {
  const metafieldMutation = `#graphql
        mutation variantMetafieldsSet {
          metafieldsSet(metafields: [{
            ownerId: "${data.variantId}",
            namespace: "discount_data_msg",
            key: "discount_msg",
            type: "multi_line_text_field",
            value: ${data ? JSON.stringify(data.customMessage) : ""}
          }]) {
            metafields {
              id
              key
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

  const metafieldRes = await shopify.admin.graphql(metafieldMutation);
  const metafieldJson = await metafieldRes.json();
  if (metafieldJson?.data?.metafieldsSet?.userErrors?.length) {
    return "Error setting metafield";
  }
}
