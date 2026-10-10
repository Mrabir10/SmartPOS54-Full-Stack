import React, { useState } from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import SalesScreen from '../screens/SalesScreen';
import AddProductScreen from '../screens/AddProductScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import CartScreen from '../screens/CartScreen';
import PaymentScreen from '../screens/PaymentScreen';
import SaleCompleteScreen from '../screens/SaleCompleteScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';
import ProductPhotoScannerScreen from '../screens/ProductPhotoScannerScreen';
import StockMovementHistoryScreen from '../screens/StockMovementHistoryScreen';
import ReportsScreen from '../screens/ReportsScreen';


const Stack =
  createNativeStackNavigator();

const initialProducts = [
  {
    id: 'RAN022',
    name: 'Panjabi RAN022',
    size: 'L',
    price: '1850',
    sellingPrice: 1850,
    purchasePrice: 0,
    stock: 10,
  },

  {
    id: 'SHT101',
    name: 'Premium Shirt',
    size: 'M',
    price: '1450',
    sellingPrice: 1450,
    purchasePrice: 0,
    stock: 5,
  },

  {
    id: 'PAN305',
    name: 'Cotton Panjabi',
    size: 'XL',
    price: '2200',
    sellingPrice: 2200,
    purchasePrice: 0,
    stock: 18,
  },
];

export default function AppNavigator() {

  // ==========================================
  // PRODUCTS
  // ==========================================

  const [products, setProducts] =
    useState(initialProducts);

  // ==========================================
  // STOCK MOVEMENTS
  // ==========================================

  const [stockMovements, setStockMovements] =
    useState([]);

  // ==========================================
  // SALES
  // ==========================================

  const [sales, setSales] =
    useState([]);

  // ==========================================
  // PURCHASE RECORDS
  // ==========================================

  const [purchases, setPurchases] =
    useState([]);

  // ==========================================
  // GENERATE PRODUCT ID
  // ==========================================

  const generateProductId = (
    productName,
    currentProducts
  ) => {

    let prefix = 'PRD';

    const name =
      productName.toLowerCase();

    if (name.includes('panjabi')) {
      prefix = 'PAN';

    } else if (
      name.includes('shirt')
    ) {
      prefix = 'SHT';

    } else if (
      name.includes('t-shirt') ||
      name.includes('tshirt')
    ) {
      prefix = 'TST';
    }

    const samePrefixProducts =
      currentProducts.filter(
        (product) =>
          product.id.startsWith(prefix)
      );

    let maxNumber = 0;

    samePrefixProducts.forEach(
      (product) => {

        const numberPart =
          parseInt(
            product.id.replace(
              prefix,
              ''
            ),
            10
          );

        if (
          !isNaN(numberPart) &&
          numberPart > maxNumber
        ) {
          maxNumber = numberPart;
        }

      }
    );

    const nextNumber =
      maxNumber + 1;

    return `${prefix}${String(
      nextNumber
    ).padStart(3, '0')}`;
  };

  // ==========================================
  // ADD PRODUCT
  // ==========================================

  const addProduct = (
    newProduct
  ) => {

    setProducts(
      (currentProducts) => {

        const databaseId =
          Number(newProduct.id);

        const normalizedProduct = {
          ...newProduct,

          // Keep the real database ID returned by the backend.
          id: Number.isFinite(databaseId)
            ? databaseId
            : newProduct.id,

          databaseId:
            Number.isFinite(databaseId)
              ? databaseId
              : newProduct.databaseId,

          productCode:
            newProduct.productCode ??
            newProduct.barcode ??
            '',

          barcode:
            newProduct.productCode ??
            newProduct.barcode ??
            '',

          price: String(
            newProduct.sellingPrice ??
              newProduct.price ??
              0
          ),

          sellingPrice:
            Number(
              newProduct.sellingPrice ??
                newProduct.price ??
                0
            ),

          purchasePrice:
            Number(
              newProduct.purchasePrice ??
                0
            ),
        };

        return [
          ...currentProducts,
          normalizedProduct,
        ];
      }
    );
  };

  // ==========================================
  // UPDATE PRODUCT
  // ==========================================

  const updateProduct = (
    updatedProduct
  ) => {

    setProducts(
      (currentProducts) =>
        currentProducts.map(
          (product) =>
            product.id ===
            updatedProduct.id
              ? updatedProduct
              : product
        )
    );
  };

  // ==========================================
  // RESTOCK PRODUCT
  // ==========================================

  const restockProduct = (
    productId,
    quantity,
    purchasePrice,
    supplier
  ) => {

    const currentProduct =
      products.find(
        (product) =>
          product.id === productId
      );

    if (!currentProduct) {
      return;
    }

    const restockQuantity =
      Number(quantity);

    const unitPurchasePrice =
      Number(purchasePrice);

    const cleanSupplier =
      supplier
        ? supplier.trim()
        : 'Unknown Supplier';

    if (
      !restockQuantity ||
      restockQuantity <= 0
    ) {
      return;
    }

    if (
      !unitPurchasePrice ||
      unitPurchasePrice <= 0
    ) {
      return;
    }

    // ========================================
    // TOTAL PURCHASE COST
    // ========================================

    const totalPurchaseCost =
      restockQuantity *
      unitPurchasePrice;

    const movementDate =
      new Date().toISOString();

    // ========================================
    // UPDATE PRODUCT
    // ========================================

    const updatedProduct = {
      ...currentProduct,

      stock:
        Number(
          currentProduct.stock
        ) +
        restockQuantity,

      purchasePrice:
        unitPurchasePrice,
    };

    setProducts(
      (currentProducts) =>
        currentProducts.map(
          (product) =>
            product.id === productId
              ? updatedProduct
              : product
        )
    );

    // ========================================
    // STOCK MOVEMENT
    // ========================================

    const movement = {

      id:
        `SM-${Date.now()}-${productId}`,

      productId,

      productName:
        currentProduct.name,

      type:
        'RESTOCK',

      quantity:
        restockQuantity,

      purchasePrice:
        unitPurchasePrice,

      totalPurchaseCost:
        totalPurchaseCost,

      supplier:
        cleanSupplier,

      date:
        movementDate,
    };

    setStockMovements(
      (currentMovements) => [
        ...currentMovements,
        movement,
      ]
    );

    // ========================================
    // PURCHASE RECORD
    // ========================================

    const purchaseRecord = {

      id:
        `PUR-${Date.now()}-${productId}`,

      productId,

      productName:
        currentProduct.name,

      supplier:
        cleanSupplier,

      quantity:
        restockQuantity,

      unitPurchasePrice:
        unitPurchasePrice,

      totalPurchaseCost:
        totalPurchaseCost,

      date:
        movementDate,
    };

    setPurchases(
      (currentPurchases) => [
        ...currentPurchases,
        purchaseRecord,
      ]
    );
  };

  // ==========================================
  // RECORD STOCK ADJUSTMENT
  // ==========================================

  const recordStockAdjustment = (
    productId,
    quantity,
    type,
    reason
  ) => {
    const currentProduct =
      products.find(
        (product) =>
          String(product.id) ===
          String(productId)
      );

    const movement = {
      id:
        `SM-${Date.now()}-${productId}`,
      productId,
      productName:
        currentProduct?.name ||
        `Product ${productId}`,
      type,
      quantity:
        -Number(quantity),
      reason:
        reason || '',
      date:
        new Date().toISOString(),
    };

    setStockMovements(
      (currentMovements) => [
        ...currentMovements,
        movement,
      ]
    );
  };

  // ==========================================
  // DELETE PRODUCT
  // ==========================================

  const deleteProduct = (
    productId
  ) => {

    setProducts(
      (currentProducts) =>
        currentProducts.filter(
          (product) =>
            product.id !== productId
        )
    );
  };

  // ==========================================
  // COMPLETE SALE
  // ==========================================

  const completeSale = (
    sale
  ) => {

    const cart =
      sale.cart;

    // ========================================
    // UPDATE STOCK
    // ========================================

    setProducts(
      (currentProducts) =>
        currentProducts.map(
          (product) => {

            const soldItem =
              cart.find(
                (item) =>
                  item.id ===
                  product.id
              );

            if (!soldItem) {
              return product;
            }

            return {

              ...product,

              stock:
                Math.max(
                  Number(
                    product.stock
                  ) -
                  Number(
                    soldItem.quantity
                  ),
                  0
                ),
            };
          }
        )
    );

    // ========================================
    // SALE DATE
    // ========================================

    const saleDate =
      new Date().toISOString();

    // ========================================
    // STOCK MOVEMENTS
    // ========================================

    const newMovements =
      cart.map(
        (item) => ({

          id:
            `SM-${Date.now()}-${item.id}`,

          productId:
            item.id,

          productName:
            item.name,

          type:
            'SALE',

          quantity:
            -Number(
              item.quantity
            ),

          date:
            saleDate,
        })
      );

    setStockMovements(
      (currentMovements) => [
        ...currentMovements,
        ...newMovements,
      ]
    );

    // ========================================
    // SAVE SALE
    // ========================================

    setSales(
      (currentSales) => [
        ...currentSales,
        sale,
      ]
    );
  };

  // ==========================================
  // NAVIGATION
  // ==========================================

  return (

    <NavigationContainer>

      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >

        {/* ==================================
            LOGIN
        =================================== */}

        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        {/* ==================================
            DASHBOARD
        =================================== */}

        <Stack.Screen
          name="Dashboard"
        >
          {(props) => (

            <DashboardScreen
              {...props}
              products={products}
              sales={sales}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            SALES
        =================================== */}

        <Stack.Screen
          name="Sales"
        >
          {(props) => (

            <SalesScreen
              {...props}
              products={products}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            CART
        =================================== */}

        <Stack.Screen
          name="Cart"
        >
          {(props) => (

            <CartScreen
              {...props}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            PAYMENT
        =================================== */}

        <Stack.Screen
          name="Payment"
        >
          {(props) => (

            <PaymentScreen
              {...props}
              onCompleteSale={
                completeSale
              }
            />

          )}
        </Stack.Screen>

        {/* ==================================
            SALE COMPLETE
        =================================== */}

        <Stack.Screen
          name="SaleComplete"
        >
          {(props) => (

            <SaleCompleteScreen
              {...props}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            RECEIPT
        =================================== */}

        <Stack.Screen
          name="Receipt"
          component={ReceiptScreen}
        />

        {/* ==================================
            BARCODE SCANNER
        =================================== */}

        <Stack.Screen
          name="BarcodeScanner"
        >
          {(props) => (

            <BarcodeScannerScreen
              {...props}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            PRODUCT PHOTO SCANNER
        =================================== */}

        <Stack.Screen
          name="ProductPhotoScanner"
        >
          {(props) => (

            <ProductPhotoScannerScreen
              {...props}
              products={products}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            SALES HISTORY
        =================================== */}

        <Stack.Screen
          name="SalesHistory"
        >
          {(props) => (

            <SalesHistoryScreen
              {...props}
              sales={sales}
            />

          )}
        </Stack.Screen>

        {/* ==================================
            STOCK MOVEMENT HISTORY
        =================================== */}

        <Stack.Screen
          name="StockMovementHistory"
        >
          {(props) => (

            <StockMovementHistoryScreen
              {...props}
              stockMovements={
                stockMovements
              }
            />

          )}
        </Stack.Screen>

        {/* ==================================
            BUSINESS REPORTS
        =================================== */}

        <Stack.Screen
          name="Reports"
        >
          {(props) => (

            <ReportsScreen
              {...props}

              products={
                products
              }

              sales={
                sales
              }

              purchases={
                purchases
              }

              stockMovements={
                stockMovements
              }

            />

          )}
        </Stack.Screen>

        {/* ==================================
            ADD PRODUCT
        =================================== */}

        <Stack.Screen
          name="AddProduct"
        >
          {(props) => (

            <AddProductScreen
              {...props}
              onAddProduct={
                addProduct
              }
            />

          )}
        </Stack.Screen>

        {/* ==================================
            PRODUCT LIST
        =================================== */}

        <Stack.Screen
          name="ProductList"
        >
          {(props) => (

            <ProductListScreen
              {...props}
              products={
                products
              }
            />

          )}
        </Stack.Screen>

        {/* ==================================
            PRODUCT DETAILS
        =================================== */}

        <Stack.Screen
          name="ProductDetails"
        >
          {(props) => (

            <ProductDetailsScreen
              {...props}

              products={
                products
              }

              onUpdateProduct={
                updateProduct
              }

              onDeleteProduct={
                deleteProduct
              }

              onRestockProduct={
                restockProduct
              }

              onStockAdjustment={
                recordStockAdjustment
              }

            />

          )}
        </Stack.Screen>

      </Stack.Navigator>

    </NavigationContainer>
  );
}