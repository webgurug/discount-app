//import { json } from "@remix-run/node"; // ✅ ADD THIS
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const shopify = await authenticate.admin(request);

  const query = `
    query getVariants($id: ID!) {
      product(id: $id) {
        variants(first: 20) {
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
    variables: { id: productId },
  });

  const jsonRes = await response.json();
  const variants = jsonRes.data.product?.variants.edges.map(({ node }) => node) || [];
  //console.log('==Selected Variant ===>', variants);
  return new Response(JSON.stringify({ variants }), {
    headers: { "Content-Type": "application/json" },
  });
}
