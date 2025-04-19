import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Box,
  Spinner,
  BlockStack,
  EmptySearchResult,
  Pagination,
  Button,
  ButtonGroup,
  Modal,
  Icon,
} from "@shopify/polaris";
import { DeleteIcon, EditIcon, XIcon } from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import { authenticate } from "../shopify.server";
import {
  useLoaderData,
  useNavigate,
  useLocation,
  useFetcher,
} from "@remix-run/react";
import styles from "../routes/_index/styles.module.css";
import { prismaDeleteMany, prismaFindMany } from "./app.prismaHandler";

export const loader = async ({ request }) => {
  try {
    const shopify = await authenticate.admin(request);
    const storeUrl = shopify.session.shop;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "2", 10);
    const skip = (page - 1) * limit;
    const { discounts, total } = await prismaFindMany(
      storeUrl,
      skip,
      limit,
      shopify,
    );
    if (discounts && typeof total === "number") {
      return {
        success: true,
        data: discounts,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          total,
        },
      };
    } else {
      return {
        success: false,
        data: [],
        error: "No discounts found or total count is invalid.",
      };
    }
  } catch (error) {
    console.error("Loader error:", error);
    return {
      success: false,
      data: [],
      error: "Error fetching discounts",
    };
  }
};

export const action = async ({ request }) => {
  const shopify = await authenticate.admin(request);
  const formData = await request.formData();
  const discount = formData.get("discount");
  const shouldDelete = formData.get("delete");
  try {
    const discountDataValue = JSON.parse(discount);
    if (shouldDelete) {
      await prismaDeleteMany(shopify, discountDataValue);
      return { success: true, pageDecrement: true };
    }
    return { success: true };
  } catch (error) {
    console.error("Delete error:", error);
    return { success: false };
  }
};

export default function Discounts() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const location = useLocation();
  const initialData = useLoaderData();
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discounts, setDiscounts] = useState([]);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (initialData) {
      setDiscounts(initialData.data);
      setPage(initialData?.pagination?.page);
    }
    setLoading(false);
  }, [initialData]);

  useEffect(() => {
    const success = fetcher.data?.success;
    if (success !== undefined) {
      setShowModal2(false);
    }
    if (fetcher.data?.pageDecrement) {
      if (
        Array.isArray(discounts) &&
        (discounts.length === 0 || discounts.length === 1) &&
        page > 1
      ) {
        const url = new URL(
          location.pathname + location.search,
          window.location.origin,
        );
        url.searchParams.set("page", page - 1);
        navigate(url.pathname + url.search);
      }
    }
  }, [fetcher.data]);

  const handlePageChange = (newPage) => {
    setLoading(true);
    setPage(newPage);
    const url = new URL(
      location.pathname + location.search,
      window.location.origin,
    );
    url.searchParams.set("page", newPage);
    navigate(url.pathname + url.search);
  };

  const handleEditClick = (variantId) => {
    const encodedVariantId = variantId.replace(/\//g, "@");
    navigate(`/app/editDiscount/${encodedVariantId}`);
    navigate(`/app/editDiscount/${encodedVariantId}`);
  };

  const handleDeleteClick = (discount) => {
    setSelectedDiscount(discount);
    setShowModal(true);
  };

  const handleDeleteConfirm = () => {
    setShowModal(false);
    setShowModal2(true);
    fetcher.submit(
      { discount: JSON.stringify(selectedDiscount), delete: "true" },
      { method: "POST" },
    );
  };

  const resourceName = {
    singular: "discount",
    plural: "discounts",
  };

  const emptyStateMarkup = (
    <EmptySearchResult
      title={"No discounts yet"}
      description={"Please add some variant discounts to get started."}
      withIllustration
    />
  );

  if (!isClient || !discounts) return null;

  const rowMarkup = discounts.map(
    (
      {
        id,
        productId,
        variantId,
        percentage,
        quantity,
        saleMessage,
        customMessage,
        storeUrl,
      },
      index,
    ) => (
      <IndexTable.Row id={id} key={id} position={index}>
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="bold" as="span">
            {productId}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>{variantId}</IndexTable.Cell>
        <IndexTable.Cell>
          {percentage ? `${percentage}%` : "N/A"}
        </IndexTable.Cell>
        <IndexTable.Cell>{quantity ?? "N/A"}</IndexTable.Cell>
        <IndexTable.Cell>{saleMessage ?? "N/A"}</IndexTable.Cell>
        <IndexTable.Cell>
          <div
            style={{
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
            }}
          >
            {customMessage ? customMessage : "-"}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Button
              variant="primary"
              icon={EditIcon}
              onClick={() => handleEditClick(variantId)}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              tone="critical"
              icon={DeleteIcon}
              onClick={() =>
                handleDeleteClick({
                  id,
                  productId,
                  variantId,
                  percentage,
                  quantity,
                  saleMessage,
                  customMessage,
                  storeUrl,
                })
              }
            >
              Delete
            </Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page title="Variant Discounts" fullWidth>
      <Layout>
        <Layout.Section>
          <Card>
            {loading ? (
              <Box padding="200" align="center">
                <Spinner size="large" />
              </Box>
            ) : (
              !showModal && (
                <BlockStack gap="400">
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={discounts.length}
                    emptyState={emptyStateMarkup}
                    headings={[
                      { title: "Product ID" },
                      { title: "Variant ID" },
                      { title: "Discount Value(%)" },
                      { title: "Min Quantity" },
                      { title: "Sale Message" },
                      { title: "Custom Message" },
                      { title: "Actions" },
                    ]}
                    selectable={false}
                  >
                    {rowMarkup}
                  </IndexTable>
                  {initialData?.pagination?.totalPages > 0 && (
                    <Pagination
                      onPrevious={() => {
                        handlePageChange(page - 1);
                      }}
                      onNext={() => {
                        handlePageChange(page + 1);
                      }}
                      hasNext={initialData?.pagination?.totalPages > page}
                      hasPrevious={page > 1}
                      type="table"
                      label={`Page ${page} of ${initialData?.pagination?.totalPages ?? 1}`}
                    />
                  )}
                </BlockStack>
              )
            )}
          </Card>
        </Layout.Section>
      </Layout>

      <fetcher.Form method="post" id="delete-discount-form">
        <input type="hidden" name="discountId" value={selectedDiscount?.id} />
        <Modal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Are you sure you want to delete this discount?"
          primaryAction={{
            content: "Yes, Delete",
            destructive: true,
            onAction: handleDeleteConfirm,
          }}
          secondaryActions={[
            {
              content: "No, go back",
              onAction: () => setShowModal(false),
            },
          ]}
        >
          <Modal.Section>
            <Text as="p">
              This action will remove the discount permanently from your store.
            </Text>
          </Modal.Section>
        </Modal>
      </fetcher.Form>

      {showModal2 && (
        <div className={styles.showModal2Div}>
          <div className={styles.showModal2DivInner1}>
            <p>Deleting discount...</p>
            <span
              onClick={() => setShowModal2(false)}
              className={styles.customXIcon}
            >
              <Icon source={XIcon} tone="base" />
            </span>
          </div>
          <div className={styles.showModal2DivInner2}>
            <span>
              <Spinner size="small" />
            </span>
            <div style={{ flexGrow: 1 }}>
              <Text variant="bodySm" tone="subdued">
                You can continue working — this will run in the background.
              </Text>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
