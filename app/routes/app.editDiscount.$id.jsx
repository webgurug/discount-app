import {
  Page,
  Layout,
  Card,
  BlockStack,
  Frame,
  Toast,
  Select,
} from "@shopify/polaris";
import { useState, useEffect, useRef } from "react";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import {
  addVariantMetafield,
  addVariantMetafieldForCustomMsg,
  fetchProductById,
} from "./app.helpers";
import { prismafindFirst, prismaUpdateDiscount } from "./app.prismaHandler";

export const loader = async ({ request, params }) => {
  try {
    const shopify = await authenticate.admin(request);
    const storeUrl = shopify.session.shop;
    const variantId = params.id.replace(/@/g, "/");
    const existingDiscount = await prismafindFirst(variantId, storeUrl);
    if (existingDiscount && existingDiscount.productId) {
      const returnedData = await fetchProductById(
        shopify,
        existingDiscount.productId,
        existingDiscount.variantId,
      );
      return {
        returnedData: returnedData,
        variantDiscount: existingDiscount,
      };
    } else {
      return {
        variantDiscount: null,
      };
    }
  } catch (error) {
    console.error("Error fetching variant discount:", error);
    return {
      variantDiscount: null,
    };
  }
};

export async function action({ request }) {
  const formData = await request.formData();
  const shopify = await authenticate.admin(request);
  const productId = formData.get("productId");
  const variantId = formData.get("variantId");
  const quantity = parseInt(formData.get("quantity"), 10);
  const percentage = parseFloat(formData.get("percentage"));
  const saleMessage = formData.get("salemsg");
  const customMessage = formData.get("custommsg");
  const storeUrl = shopify.session.shop;
  if (
    !productId ||
    !variantId ||
    !quantity ||
    !percentage ||
    !saleMessage ||
    !customMessage
  ) {
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
        customMessage,
      },
    ];
    const discountDataWithoutCustomMsg = discountData.map(
      ({ customMessage, ...rest }) => rest,
    );
    await addVariantMetafield(shopify, discountDataWithoutCustomMsg);
    const metaFieldData = {
      variantId,
      customMessage,
    };
    await addVariantMetafieldForCustomMsg(shopify, metaFieldData);
    const existingDiscount = await prismafindFirst(
      variantId,
      storeUrl,
      productId,
    );
    if (existingDiscount) {
      await prismaUpdateDiscount(existingDiscount, discountData);
      return {
        status: 200,
        success: true,
        message: "Discount updated successfully!",
      };
    } else {
      return {
        status: 404,
        success: false,
        message: "Discount not found!",
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
}

export default function EditDiscount() {
  const formRef = useRef(null);
  const { variantDiscount, returnedData } = useLoaderData();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [initialData, setinitialData] = useState({});
  const [toastActive, setToastActive] = useState(false);
  const [toastContent, setToastContent] = useState("");

  useEffect(() => {
    if (fetcher.data?.success) {
      setToastContent(fetcher.data.message || "Discount updated successfully!");
      setToastActive(true);
      if (fetcher.data?.message === "Discount updated successfully!") {
        setTimeout(() => {
          navigate("/app/discounts");
        }, [500]);
      }
    } else if (fetcher.data?.error) {
      setToastContent(fetcher.data.error || "Something went wrong!");
      setToastActive(true);
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (variantDiscount && variantDiscount?.productId && returnedData) {
      setinitialData({
        ...variantDiscount,
        ...returnedData,
      });
    } else {
      setToastContent("No discount found to edit!");
      setToastActive(true);
      setTimeout(() => {
        navigate("/app/discounts");
      }, [1000]);
    }
  }, [variantDiscount]);

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
        <TitleBar title="Edit Variant Discount" />
        <Layout>
          <Layout.Section>
            <Card sectioned title="Edit Discount">
              <fetcher.Form method="post" ref={formRef}>
                <BlockStack gap="400">
                  <Select
                    label="Select a Product"
                    name="productId"
                    value={initialData.productTitle}
                    options={[
                      {
                        label: initialData.productTitle,
                        value: initialData.productId,
                      },
                    ]}
                    onChange={(e) => {}}
                  />

                  <Select
                    label="Select a Variant"
                    name="variantId"
                    value={initialData.variantTitle}
                    options={[
                      {
                        label:`${initialData.variantTitle} - $${initialData.variantPrice}`,
                        value: initialData.variantId,
                      },
                    ]}
                    onChange={(e) => {}}
                  />

                  {/* Minimum Quantity */}
                  <div className="form-group">
                    <label htmlFor="quantity">Minimum quantity of items:</label>
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      value={initialData.quantity}
                      required
                      onChange={(e) =>
                        setinitialData((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value),
                        }))
                      }
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
                      value={initialData.percentage}
                      required
                      onChange={(e) =>
                        setinitialData((prev) => ({
                          ...prev,
                          percentage: parseFloat(e.target.value),
                        }))
                      }
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
                      value={initialData.saleMessage}
                      required
                      onChange={(e) =>
                        setinitialData((prev) => ({
                          ...prev,
                          saleMessage: e.target.value,
                        }))
                      }
                      rows={3}
                      style={{ width: "100%", padding: "8px" }}
                    ></textarea>
                  </div>

                  <div className="form-group">
                    <label htmlFor="custommsg">Custom Variant Message:</label>
                    <textarea
                      name="custommsg"
                      id="custommsg"
                      value={initialData?.customMessage}
                      required
                      onChange={(e) =>
                        setinitialData((prev) => ({
                          ...prev,
                          customMessage: e.target.value,
                        }))
                      }
                      rows={3}
                      style={{ width: "100%", padding: "8px" }}
                    ></textarea>
                  </div>
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
                        ? "Saving..."
                        : "Save Discount"}
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
