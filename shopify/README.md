# Qibo3D — Shopify Store Integration Guide

This guide describes how to connect your Shopify storefront to **Qibo3D** so your customers can click **"View in 3D & In Your Room"** directly on product pages.

---

## 1. Quick Architecture Overview

When a customer visits a product page:
1. The **“View in 3D & In Your Room”** button passes the Shopify product's `id`, `title`, `image_url`, and `returnUrl` to your Qibo3D deployment (`/shopify/preview`).
2. Qibo3D checks its PostgreSQL database for an existing 3D model corresponding to that `shopifyProductId`.
   - **If already created:** The interactive 3D WebGL studio opens immediately with **zero duplicate AI generation calls** or token usage.
   - **If not yet created:** Customers/merchants can trigger 3D mesh synthesis with real-time pipeline status.
3. On compatible mobile devices (e.g. Android Chrome), clicking **“View in Room”** launches Google Scene Viewer (ARCore) for native floor placement and scaling.
4. On desktop, a high-contrast QR code modal allows instant phone camera handoff.
5. The **“Return to Store”** button safely returns the customer to the exact product page they came from (with open redirect prevention).

---

## 2. Step-by-Step Installation into Shopify Themes

### Step A: Add the Liquid Snippet
1. In your Shopify Admin, go to **Online Store** &rarr; **Themes**.
2. On your active theme (e.g., **Dawn**, **Refresh**, **Spotlight**, etc.), click the **&hellip;** (Actions) menu and select **Edit code**.
3. Under the **Snippets** folder in the left sidebar, click **Add a new snippet**.
4. Name the snippet:
   ```text
   qibo3d-view-in-room
   ```
5. Paste the contents of [`shopify/snippets/qibo3d-view-in-room.liquid`](./snippets/qibo3d-view-in-room.liquid) into this new snippet file and click **Save**.

---

### Step B: Place the Snippet on the Product Page
Open your main product template or block:
* For Shopify Online Store 2.0 themes (like Dawn):
  * Open `sections/main-product.liquid` or `snippets/buy-buttons.liquid`.
* Locate the **Add to Cart** button / `{%- form 'product' ... -%}` block.
* Right below or above the buy buttons, add:
  ```liquid
  {% render 'qibo3d-view-in-room',
    product: product,
    qibo3d_url: 'https://your-qibo3d-app.onrender.com'
  %}
  ```
  *(Replace `https://your-qibo3d-app.onrender.com` with your deployed Qibo3D URL, or `http://localhost:5173` during local testing).*

---

### Step C: Test the Integration
1. Go to any product page on your online store.
2. Click **View in 3D & In Your Room**.
   - It will open your Qibo3D preview in a new browser tab.
   - If a model exists, it loads in full 3D interactive OrbitControls.
   - If on Android mobile over public HTTPS, click **View in Room** to launch Google Scene Viewer.
   - Click **Return to Store** to safely navigate back to your Shopify storefront.
