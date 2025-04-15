import { Card, Layout, Page, BlockStack, Select } from "@shopify/polaris";
import { useState, useEffect, useRef } from "react";
import { authenticate } from "../shopify.server";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import { prisma } from "../lib/prisma";
import { addVariantMetafield } from "./app.create_function";
import { Frame, Toast } from "@shopify/polaris";

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
  const products = json.data.products.edges.map((edge) => edge.node);
  return { products };
}
//// Save Information ////
export async function action({ request }) {
  const formData = await request.formData();
  const shopify = await authenticate.admin(request);

  const productId = formData.get("productId");
  // console.log('=====ProID=====>', productId);
  const variantId = formData.get("variantId");
  const quantity = parseInt(formData.get("quantity"), 10);
  const percentage = parseFloat(formData.get("percentage"));
  const saleMessage = formData.get("salemsg");
  const storeUrl = shopify.session.shop;
  // Simple validation (optional)
  if (!productId || !variantId || !quantity || !percentage || !saleMessage) {
    return {
      status: 400,
      success: false,
      error: "Missing required fields",
    };
  }

  try {
    const discountData = [
      {
        productId,
        variantId,
        quantity,
        percentage,
        saleMessage,
        storeUrl,
      },
    ];
    await addVariantMetafield(shopify, discountData);
    const existingDiscount = await prisma.discount.findFirst({
      where: {
        productId,
        variantId,
        storeUrl,
      },
    });

    if (existingDiscount) {
      return {
        status: 400,
        success: false,
        message: "Discount already exists!",
      };
    } else {
      await prisma.discount.create({
        data: {
          productId,
          variantId,
          quantity,
          percentage,
          saleMessage,
          storeUrl,
        },
      });
      return {
        status: 200,
        success: true,
        message: "Discount added successfully!",
      };
    }
  } catch (error) {
    console.error("❌ Prisma error:", error);
    return {
      status: 500,
      success: false,
      error: "Error saving discount",
    };
  }

  // Optional: Redirect or return JSON
  //return redirect("/discounts"); // or return null
}

// 🧠 UI Component
export default function AddVariant() {
  const formRef = useRef(null);
  const { products } = useLoaderData();
  const fetcher = useFetcher();
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedVariant, setSelectedVariant] = useState("");
  const [variants, setVariants] = useState([]);
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");

  // Form Reset After Successful Submission
  useEffect(() => {
    if (fetcher.data?.variants) {
      setVariants(fetcher.data.variants);
    }
    if (fetcher.data?.message) {
      formRef.current?.reset();
      setSelectedProduct("");
      setSelectedVariant("");
      setVariants([]);
    }
    if (fetcher.data?.success) {
      setToastContent(fetcher.data.message || "Discount added successfully!");
      setToastActive(true);
    } else if (fetcher.data?.message === "Discount already exists!") {
      setToastContent(fetcher.data.message || "Discount already exists!");
      setToastActive(true);
    } else if (fetcher.data?.error) {
      setToastContent(fetcher.data.error || "Something went wrong!");
      setToastActive(true);
    }
  }, [fetcher.data]);

  const productOptions = products.map((product) => ({
    label: product.title,
    value: product.id,
  }));

  const variantOptions = variants.map((variant) => ({
    label: `${variant.title} - $${variant.price}`,
    value: variant.id,
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
  return (
    <Frame>
      {toastActive && (
        <Toast
          content={toastContent}
          onDismiss={() => setToastActive(false)}
          duration={2000}
        />
      )}
      <Page>
        <TitleBar title="Add Product Variant" />
        <Layout>
          <Layout.Section>
            <Card sectioned title="Add Discount">
              <fetcher.Form method="post" ref={formRef}>
                <BlockStack gap="400">
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
                  {/* <div className="form-group">
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
                  </div> */}

                  <div className="form-group">
                    <button
                      type="submit"
                      disabled={fetcher.state === "submitting"}
                      style={{
                        backgroundColor:
                          fetcher.state === "submitting"
                            ? "#b3b9b7"
                            : "#008060",
                        color: fetcher.state === "submitting" ? "#000" : "#fff",
                        padding: "10px 16px",
                        border: "none",
                        borderRadius: "4px",
                        cursor:
                          fetcher.state === "submitting"
                            ? "not-allowed"
                            : "pointer",
                        minWidth: "140px",
                      }}
                    >
                      {fetcher.state === "submitting"
                        ? "Adding..."
                        : "Add Discount"}
                    </button>
                  </div>
                </BlockStack>
              </fetcher.Form>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    </Frame>
  );
}
