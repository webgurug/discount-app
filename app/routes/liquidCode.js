// // script to inject in theme.liquid

// <script>
// // Function to get the variant ID from the URL
// function getVariantIdFromUrl(url) {
//   const params = new URL(url).searchParams;
//   return params.get('variant');
// }

// // Function to fetch metafield data based on the variant ID
// async function fetchMetafield(variantId) {
//   if (!variantId) return;

//   // Array of variants (generated dynamically from product data)
//   const allVariants = [
//     {% for variant in product.variants %}
//       {
//         id: {{ variant.id }},
//         title: {{ variant.title | json }},
//         discount_msg: {{ variant.metafields.discount_data_msg.discount_msg.value | json }}
//       }{% unless forloop.last %},{% endunless %}
//     {% endfor %}
//   ];

//   // Find the matching variant by ID
//   const match = allVariants.find(v => v.id == variantId);

//   if (match) {
//     // If a match is found, update the DOM with the discount message
//     document.getElementById('metafield-result').innerHTML = match.discount_msg;
//   }
// }

// // Function to handle URL change
// function handleUrlChange(url) {
//   const variantId = getVariantIdFromUrl(url);
//   console.log("Variant ID:", variantId);
//   fetchMetafield(variantId);
// }

// // Overriding history.pushState and history.replaceState to handle URL changes dynamically
// const originalPushState = history.pushState;
// const originalReplaceState = history.replaceState;

// history.pushState = function(state, title, url) {
//   originalPushState.apply(history, arguments);
//   handleUrlChange(window.location.href);
// };

// history.replaceState = function(state, title, url) {
//   originalReplaceState.apply(history, arguments);
//   handleUrlChange(window.location.href);
// };

// // Initial call to handle the URL when the page loads
// handleUrlChange(window.location.href);
// </script>

// line to add on product page where you want to show the div
// <div id="metafield-result"></div>

// this line will be added in main-product.liquid file in free themes or in paid theme , you need to check where product-variant-picker is rendering
// // add this line below this line {% render 'product-variant-picker', product: product, block: block, product_form_id: product_form_id %}
