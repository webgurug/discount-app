import {
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text,
  BlockStack, Select,
} from "@shopify/polaris";  

import { useState, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react"; // Import TitleBar from app-bridge-react
import { prisma } from '../lib/prisma';
import { useActionData, Form, useNavigation } from "@remix-run/react";
import { Banner } from "@shopify/polaris";
import { addVariantMetafield } from "./app.create_function";
//import { json } from '@remix-run/node';
//import { LinksFunction, json } from '@remix-run/node';
// Loader to fetch all products
export async function loader({ request }) {
  const shopify = await authenticate.admin(request);
  const query = `
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  `;

  const response = await shopify.admin.graphql(query);
  const json = await response.json();
  const products = json.data.products.edges.map(edge => edge.node);
  return { products };
}
//// Save Information ////
export async function action({ request }) {
  const shopify = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = formData.get("productId");
  // console.log('=====ProID=====>', productId);
  const variantId = formData.get("variantId");
  const quantity = parseInt(formData.get("quantity"), 10);
  const percentage = parseFloat(formData.get("percentage"));
  const saleMessage = formData.get("salemsg");

  // Simple validation (optional)
  if (!productId || !variantId || !quantity || !percentage || !saleMessage) {
    return new Response(JSON.stringify({
      success: false,
      error: "Missing required fields",
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const discountData = [
      {
        productId,
        variantId,
        quantity,
        percentage,
        saleMessage,
      },
    ];
    await addVariantMetafield(shopify, discountData);
    await prisma.discount.create({
      data: {
        productId,
        variantId,
        quantity,
        percentage,
        saleMessage,
        storeUrl: shopify.session.shop,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Discount added successfully!",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("❌ Prisma error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Error saving discount",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Optional: Redirect or return JSON
  //return redirect("/discounts"); // or return null
}

// 🧠 UI Component
export default function AddVariant() {

  const actionData = useActionData();
  //console.log("===actionData==>", actionData); 
  const navigation = useNavigation();
  const formRef = useRef(null);

  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [variants, setVariants] = useState([]);

  const productOptions = products.map((product) => ({
    label: product.title,
    value: product.id,
  }));

  const handleProductChange = (value) => {
    setSelectedProduct(value);
    setVariants([]); // Reset previous variants
    setSelectedVariant(""); // Reset previous variant
    fetcher.load(`/get-variants?productId=${encodeURIComponent(value)}`);
  };

  const handleVariantChange = (value) => {
    setSelectedVariant(value);
  };

  // ✅ Use useEffect instead of inline check
  useEffect(() => {
    if (fetcher.data?.variants) {
      setVariants(fetcher.data.variants);
    }
  }, [fetcher.data]);

  const variantOptions = variants.map((variant) => ({
    label: `${variant.title} - $${variant.price}`,
    value: variant.id,
  }));

  // 🧼 Form Reset After Successful Submission
  useEffect(() => {
    if (actionData?.success) {
      formRef.current?.reset();
      setSelectedProduct("");
      setSelectedVariant("");
      setVariants([]);
    }
  }, [actionData]);

  return (
    <Page>
      <TitleBar title="Add Product Variant" />
        {actionData?.success && (
          <Banner
            title="Success"
            status="success"
            onDismiss={() => null}
          >
            <p>{actionData.message}</p>
          </Banner>
        )}

        {actionData?.error && (
          <Banner
            title="Error"
            status="critical"
            onDismiss={() => null}
          >
            <p>{actionData.error}</p>
          </Banner>
        )}
      <Layout>
        <Layout.Section>
          <Card sectioned title="Add Discount">
          <fetcher.Form method="post" ref={formRef}>
            <BlockStack gap="400">
              {/* Product Select */}
              <Select
                label="Select a Product"
                name="productId"
                options={productOptions}
                onChange={handleProductChange}
                value={selectedProduct}
                placeholder="Select a product"
              />

              {/* Variant Select - re-rendered using key */}
              {variantOptions.length > 0 && (
                <Select
                  key={selectedProduct} // force re-render on product change
                  label="Select a Variant"
                  name="variantId"
                  options={variantOptions}
                  onChange={handleVariantChange}
                  value={selectedVariant}
                  placeholder="Select a variant"
                />
              )}

              {/* Minimum Quantity */}
              <div className="form-group">
                <label htmlFor="quantity">Minimum quantity of items:</label>
                <input
                  type="number"
                  name="quantity"
                  id="quantity"
                  required
                  min={1}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              {/* Discount Percentage */}
              <div className="form-group">
                <label htmlFor="percentage">Discount Percentage:</label>
                <input
                  type="number"
                  name="percentage"
                  id="percentage"
                  required
                  min={1}
                  max={100}
                  style={{ width: "100%", padding: "8px" }}
                />
              </div>

              {/* Sale Message */}
              <div className="form-group">
                <label htmlFor="salemsg">Sale Message:</label>
                <textarea
                  name="salemsg"
                  id="salemsg"
                  required
                  rows={3}
                  style={{ width: "100%", padding: "8px" }}
                ></textarea>
              </div>

              {/* Submit Button */}
              <div className="form-group">
                <input
                  type="submit"
                  value="Add Discount"
                  style={{
                    backgroundColor: "#008060",
                    color: "#fff",
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                />
              </div>
            </BlockStack>
            </fetcher.Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}