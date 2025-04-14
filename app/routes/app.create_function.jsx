export async function addVariantMetafield(shopify, discountData) {
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
    await saveVariantMetafield(shopify, discountData);
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
    await saveVariantMetafield(shopify, discountData);
  }
  return newDefinition.id;
}

// Save the Metafield for the Variant
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
            value: ${JSON.stringify(JSON.stringify(discountData))}
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
