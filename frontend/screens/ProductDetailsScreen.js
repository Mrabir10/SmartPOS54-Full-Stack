import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { captureRef } from 'react-native-view-shot';

import Barcode from 'react-native-barcode-svg';

const API_BASE_URL = 'http://192.168.1.102:3000';

export default function ProductDetailsScreen({
  navigation,
  route,
  products,
  onUpdateProduct,
  onDeleteProduct,
  onRestockProduct,
  onStockAdjustment,
}) {
  const productId = route.params?.productId;
  const barcodeLabelRef = useRef(null);

  // =====================================================
  // FIND PRODUCT FROM LOCAL PRODUCT LIST
  // =====================================================

  const localProduct = useMemo(
    () =>
      products?.find(
        (item) =>
          String(item.id) ===
          String(productId)
      ),
    [products, productId]
  );

  // =====================================================
  // PRODUCT STATE
  // =====================================================

  const [product, setProduct] = useState(
    localProduct || null
  );

  const [loadingProduct, setLoadingProduct] =
    useState(true);

  // =====================================================
  // EDIT STATE
  // =====================================================

  const [editing, setEditing] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [purchasePrice, setPurchasePrice] =
    useState('');
  const [size, setSize] = useState('');
  const [stock, setStock] = useState('');

  // =====================================================
  // RESTOCK STATE
  // =====================================================

  const [restockQuantity, setRestockQuantity] =
    useState('');

  const [
    restockPurchasePrice,
    setRestockPurchasePrice,
  ] = useState(
    localProduct
      ? String(
          localProduct.purchasePrice || ''
        )
      : ''
  );

  const [supplier, setSupplier] =
    useState('');

  // =====================================================
  // STOCK ADJUSTMENT STATE
  // =====================================================

  const [
    adjustmentType,
    setAdjustmentType,
  ] = useState('FACTORY_RETURN');

  const [
    adjustmentQuantity,
    setAdjustmentQuantity,
  ] = useState('');

  const [
    adjustmentReason,
    setAdjustmentReason,
  ] = useState('');

  // =====================================================
  // KEEP LOCAL PRODUCT PHOTO / DATA
  // =====================================================

  useEffect(() => {
    if (!localProduct) {
      return;
    }

    setProduct((currentProduct) => ({
      ...(currentProduct || {}),
      ...localProduct,
    }));
  }, [localProduct]);

  // =====================================================
  // LOAD PRODUCT FROM DATABASE
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      if (!productId) {
        if (isMounted) {
          setLoadingProduct(false);
        }

        return;
      }

      try {
        setLoadingProduct(true);

        const response = await fetch(
          `${API_BASE_URL}/products/${productId}`
        );

        if (!response.ok) {
          throw new Error(
            'Failed to load product'
          );
        }

        const data =
          await response.json();

        if (!isMounted) {
          return;
        }

        // =================================================
        // IMPORTANT:
        // Keep local photo if database has no image field.
        // =================================================

        const formattedProduct = {
          ...(localProduct || {}),

          id: data.id,

          barcode:
            data.productCode,

          productCode:
            data.productCode,

          name:
            data.name,

          price:
            Number(data.sellingPrice),

          sellingPrice:
            Number(data.sellingPrice),

          purchasePrice:
            Number(data.purchasePrice),

          size:
            data.size || '',

          stock:
            Number(data.stock),

          image:
            data.imageData ||
            localProduct?.image ||
            null,

          createdAt:
            data.createdAt,
        };

        setProduct(
          formattedProduct
        );
      } catch (error) {
        console.log(
          'Product Details Load Error:',
          error
        );

        // =================================================
        // IMPORTANT:
        // DO NOT SET PRODUCT NULL IF LOCAL PRODUCT EXISTS.
        // This prevents Product Not Found during reload.
        // =================================================

        if (
          isMounted &&
          !localProduct
        ) {
          setProduct(null);
        }
      } finally {
        if (isMounted) {
          setLoadingProduct(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // =====================================================
  // SYNC FORM WITH PRODUCT
  // =====================================================

  useEffect(() => {
    if (!product) {
      return;
    }

    setName(
      product.name || ''
    );

    setPrice(
      String(
        product.sellingPrice ??
          product.price ??
          ''
      )
    );

    setPurchasePrice(
      String(
        product.purchasePrice ??
          ''
      )
    );

    setSize(
      product.size || ''
    );

    setStock(
      String(
        product.stock ?? ''
      )
    );

    setRestockPurchasePrice(
      String(
        product.purchasePrice ??
          ''
      )
    );
  }, [product]);

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const currentPurchasePrice =
    Number(
      product?.purchasePrice || 0
    );

  const currentSellingPrice =
    Number(
      product?.sellingPrice ||
        product?.price ||
        0
    );

  const restockQtyNumber =
    Number(
      restockQuantity || 0
    );

  const restockPriceNumber =
    Number(
      restockPurchasePrice || 0
    );

  const adjustmentQtyNumber =
    Number(
      adjustmentQuantity || 0
    );

  // NO useMemo HERE
  const estimatedPurchaseTotal =
    restockQtyNumber *
    restockPriceNumber;

  const estimatedUnitProfit =
    currentSellingPrice -
    currentPurchasePrice;

  const estimatedMargin =
    currentSellingPrice > 0
      ? (
          estimatedUnitProfit /
          currentSellingPrice
        ) * 100
      : 0;

  const projectedStock = product
    ? Math.max(
        Number(product.stock) -
          adjustmentQtyNumber,
        0
      )
    : 0;

  // =====================================================
  // SAVE STOCK MOVEMENT TO DATABASE
  // =====================================================

  const saveStockMovement = async (movement) => {
    const response = await fetch(
      `${API_BASE_URL}/stock-movements`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movement),
      }
    );

    let data = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          'Stock movement could not be saved.'
      );
    }

    return data;
  };

  // =====================================================
  // RESTOCK HANDLER
  // =====================================================

  const handleRestock = async () => {
    if (!product) {
      return;
    }

    const quantity =
      Number(restockQuantity);

    const unitPurchasePrice =
      Number(
        restockPurchasePrice
      );

    const cleanSupplier =
      supplier.trim();

    if (
      !quantity ||
      quantity <= 0
    ) {
      Alert.alert(
        'Invalid Quantity',
        'Please enter a valid restock quantity.'
      );

      return;
    }

    if (
      !unitPurchasePrice ||
      unitPurchasePrice <= 0
    ) {
      Alert.alert(
        'Purchase Cost Required',
        'Please enter the purchase cost per piece.'
      );

      return;
    }

    if (!cleanSupplier) {
      Alert.alert(
        'Supplier Required',
        'Please enter the supplier name.'
      );

      return;
    }

    const previousStock =
      Number(product.stock || 0);

    const newStock =
      previousStock + quantity;

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${product.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stock: newStock,
            purchasePrice:
              unitPurchasePrice,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Failed to restock product'
        );
      }

      await saveStockMovement({
        productId: Number(product.id),
        productName: product.name,
        productCode:
          product.productCode ||
          product.barcode ||
          null,
        type: 'RESTOCK',
        quantity,
        purchasePrice:
          unitPurchasePrice,
        totalPurchaseCost:
          quantity *
          unitPurchasePrice,
        supplier: cleanSupplier,
        reason: 'Product restock',
        referenceType: 'RESTOCK',
      });

      const updatedProduct = {
        ...product,
        id: data.id,
        barcode:
          data.productCode ||
          product.barcode,
        productCode:
          data.productCode ||
          product.productCode,
        name:
          data.name ||
          product.name,
        price:
          Number(
            data.sellingPrice ??
              product.price ??
              0
          ),
        sellingPrice:
          Number(
            data.sellingPrice ??
              product.sellingPrice ??
              0
          ),
        purchasePrice:
          Number(
            data.purchasePrice ??
              unitPurchasePrice
          ),
        size:
          data.size ??
          product.size ??
          '',
        stock:
          Number(
            data.stock ??
              newStock
          ),
        image:
          data.imageData ||
          product.image ||
          null,
      };

      // Keep the existing local purchase / stock movement
      // record flow, but only after the database update succeeds.
      if (onRestockProduct) {
        onRestockProduct(
          product.id,
          quantity,
          unitPurchasePrice,
          cleanSupplier
        );
      }

      // Make local shared product state exactly match MySQL.
      if (onUpdateProduct) {
        onUpdateProduct(
          updatedProduct
        );
      }

      setProduct(
        updatedProduct
      );

      setStock(
        String(
          updatedProduct.stock
        )
      );

      setRestockPurchasePrice(
        String(
          updatedProduct.purchasePrice
        )
      );

      setRestockQuantity('');
      setSupplier('');

      Alert.alert(
        'Restock Recorded',
        `${quantity} piece(s) added successfully.\n\n` +
          `Previous Stock: ${previousStock}\n` +
          `Current Stock: ${updatedProduct.stock}\n` +
          `Purchase Cost: ৳${(
            quantity *
            unitPurchasePrice
          ).toLocaleString()}\n` +
          `Supplier: ${cleanSupplier}`
      );
    } catch (error) {
      console.log(
        'Product Restock Error:',
        error
      );

      Alert.alert(
        'Restock Failed',
        error?.message ||
          'Could not update product stock in the database.'
      );
    }
  };

  // =====================================================
  // STOCK ADJUSTMENT HANDLER
  // =====================================================

  const handleStockAdjustment = () => {
    if (!product) {
      return;
    }

    const quantity =
      Number(
        adjustmentQuantity
      );

    const cleanReason =
      adjustmentReason.trim();

    if (
      !quantity ||
      quantity <= 0
    ) {
      Alert.alert(
        'Invalid Quantity',
        'Please enter a valid adjustment quantity.'
      );

      return;
    }

    if (
      quantity >
      Number(product.stock)
    ) {
      Alert.alert(
        'Insufficient Stock',
        `You cannot remove ${quantity} piece(s). Current stock is only ${product.stock}.`
      );

      return;
    }

    if (!cleanReason) {
      Alert.alert(
        'Reason Required',
        'Please enter a reason for this stock adjustment.'
      );

      return;
    }

    const adjustmentLabels = {
      FACTORY_RETURN:
        'Factory Return',
      DAMAGED:
        'Damaged Stock',
      MISSING:
        'Missing Stock',
      ADJUSTMENT:
        'Stock Adjustment',
    };

    const selectedLabel =
      adjustmentLabels[
        adjustmentType
      ] ||
      'Stock Adjustment';

    const previousStock =
      Number(product.stock);

    const newStock =
      previousStock - quantity;

    Alert.alert(
      selectedLabel,
      `Remove ${quantity} piece(s) from stock?\n\nReason: ${cleanReason}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              const response =
                await fetch(
                  `${API_BASE_URL}/products/${product.id}`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                    body: JSON.stringify({
                      stock: newStock,
                    }),
                  }
                );

              const data =
                await response.json();

              if (!response.ok) {
                throw new Error(
                  data?.message ||
                    'Failed to update stock'
                );
              }

              await saveStockMovement({
                productId:
                  Number(product.id),
                productName:
                  product.name,
                productCode:
                  product.productCode ||
                  product.barcode ||
                  null,
                type:
                  adjustmentType,
                quantity:
                  -quantity,
                reason:
                  cleanReason,
                referenceType:
                  'ADJUSTMENT',
              });

              const updatedProduct = {
                ...product,
                id: data.id,
                barcode:
                  data.productCode ||
                  product.barcode,
                productCode:
                  data.productCode ||
                  product.productCode,
                name:
                  data.name ||
                  product.name,
                price:
                  Number(
                    data.sellingPrice ??
                      product.price ??
                      0
                  ),
                sellingPrice:
                  Number(
                    data.sellingPrice ??
                      product.sellingPrice ??
                      0
                  ),
                purchasePrice:
                  Number(
                    data.purchasePrice ??
                      product.purchasePrice ??
                      0
                  ),
                size:
                  data.size ??
                  product.size ??
                  '',
                stock:
                  Number(
                    data.stock ??
                      newStock
                  ),
                image:
                  data.imageData ||
                  product.image ||
                  null,
              };

              if (onUpdateProduct) {
                onUpdateProduct(
                  updatedProduct
                );
              }

              if (onStockAdjustment) {
                onStockAdjustment(
                  product.id,
                  quantity,
                  adjustmentType,
                  cleanReason
                );
              }

              setProduct(
                updatedProduct
              );

              setStock(
                String(
                  updatedProduct.stock
                )
              );

              setAdjustmentQuantity('');
              setAdjustmentReason('');

              Alert.alert(
                'Adjustment Recorded',
                `${quantity} piece(s) removed as ${selectedLabel.toLowerCase()}.\n\n` +
                  `Previous Stock: ${previousStock}\n` +
                  `Current Stock: ${updatedProduct.stock}\n\n` +
                  `Reason: ${cleanReason}`
              );
            } catch (error) {
              console.log(
                'Stock Adjustment Error:',
                error
              );

              Alert.alert(
                'Adjustment Failed',
                error?.message ||
                  'Could not update product stock in the database.'
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // CHANGE PRODUCT PHOTO
  // =====================================================

  const handleChangePhoto =
    async () => {
      if (!product) {
        return;
      }

      const permission =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Camera Permission',
          'Camera permission is required to change the product photo.'
        );

        return;
      }

      const result =
        await ImagePicker.launchCameraAsync(
          {
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.45,
            base64: true,
          }
        );

      if (!result.canceled) {
        const asset = result.assets[0];

        if (!asset.base64) {
          Alert.alert(
            'Photo Error',
            'Could not prepare this photo for database storage. Please try again.'
          );
          return;
        }

        const mimeType =
          asset.mimeType || 'image/jpeg';

        const imageData =
          `data:${mimeType};base64,${asset.base64}`;

        try {
          const response = await fetch(
            `${API_BASE_URL}/products/${product.id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                imageData,
              }),
            }
          );

          const data =
            await response.json();

          if (!response.ok) {
            throw new Error(
              data?.message ||
                'Failed to save product photo'
            );
          }

          const updatedProduct = {
            ...product,
            image:
              data.imageData || imageData,
          };

          if (onUpdateProduct) {
            onUpdateProduct(updatedProduct);
          }

          setProduct(updatedProduct);

          Alert.alert(
            'Photo Updated',
            'Product reference photo has been saved to the database successfully.'
          );
        } catch (error) {
          console.log(
            'Product Photo Update Error:',
            error
          );

          Alert.alert(
            'Photo Save Failed',
            error?.message ||
              'Could not save the product photo to the database.'
          );
        }
      }
    };

  // =====================================================
  // SAVE PRODUCT CHANGES
  // =====================================================

  const handleSave = () => {
    if (!product) {
      return;
    }

    const cleanName =
      name.trim();

    const cleanSize =
      size.trim();

    const sellingAmount =
      Number(price);

    const purchaseAmount =
      Number(
        purchasePrice
      );

    const stockAmount =
      Number(stock);

    if (
      !cleanName ||
      !cleanSize ||
      !price ||
      !purchasePrice ||
      stock === ''
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill in all product information.'
      );

      return;
    }

    if (
      isNaN(sellingAmount) ||
      sellingAmount <= 0
    ) {
      Alert.alert(
        'Invalid Selling Price',
        'Please enter a valid selling price.'
      );

      return;
    }

    if (
      isNaN(purchaseAmount) ||
      purchaseAmount <= 0
    ) {
      Alert.alert(
        'Invalid Purchase Cost',
        'Please enter a valid purchase cost.'
      );

      return;
    }

    if (
      isNaN(stockAmount) ||
      stockAmount < 0
    ) {
      Alert.alert(
        'Invalid Stock',
        'Stock cannot be negative.'
      );

      return;
    }

    if (
      sellingAmount <
      purchaseAmount
    ) {
      Alert.alert(
        'Price Warning',
        'Selling price is lower than purchase cost. This may create a loss on sale.',
        [
          {
            text: 'Go Back',
            style: 'cancel',
          },

          {
            text: 'Save Anyway',

            onPress: () => {
              saveProductChanges(
                cleanName,
                cleanSize,
                sellingAmount,
                purchaseAmount,
                stockAmount
              );
            },
          },
        ]
      );

      return;
    }

    saveProductChanges(
      cleanName,
      cleanSize,
      sellingAmount,
      purchaseAmount,
      stockAmount
    );
  };

  // =====================================================
  // UPDATE PRODUCT IN DATABASE
  // =====================================================

  const saveProductChanges =
    async (
      cleanName,
      cleanSize,
      sellingAmount,
      purchaseAmount,
      stockAmount
    ) => {
      if (!product) {
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/products/${product.id}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify({
                name: cleanName,

                sellingPrice:
                  sellingAmount,

                purchasePrice:
                  purchaseAmount,

                size: cleanSize,

                stock: stockAmount,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              'Failed to update product'
          );
        }

        const updatedProduct = {
          ...product,

          id: data.id,

          barcode:
            data.productCode,

          productCode:
            data.productCode,

          name:
            data.name,

          price:
            Number(
              data.sellingPrice
            ),

          sellingPrice:
            Number(
              data.sellingPrice
            ),

          purchasePrice:
            Number(
              data.purchasePrice
            ),

          size:
            data.size || '',

          stock:
            Number(data.stock),

          // Keep existing photo
          image:
            product.image ||
            null,

          createdAt:
            data.createdAt,
        };

        setProduct(
          updatedProduct
        );

        if (onUpdateProduct) {
          onUpdateProduct(
            updatedProduct
          );
        }

        setEditing(false);

        Alert.alert(
          'Product Updated',
          'Product information updated successfully in database.'
        );
      } catch (error) {
        console.log(
          'Product Update Error:',
          error
        );

        Alert.alert(
          'Update Failed',
          'Could not update product in database. Please check backend connection.'
        );
      }
    };

  // =====================================================
  // PRINT BARCODE LABEL
  // =====================================================

  const barcodeValue = String(
    product?.productCode ||
      product?.barcode ||
      product?.id ||
      ''
  );

  const handlePrintBarcode = async () => {
    if (!product || !barcodeValue) {
      Alert.alert(
        'Barcode Unavailable',
        'This product does not have a barcode to print.'
      );
      return;
    }

    try {
      const barcodeImageBase64 = await captureRef(
        barcodeLabelRef,
        {
          format: 'png',
          quality: 1,
          result: 'base64',
        }
      );

      const safeName = String(product.name || 'Product')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

      await Print.printAsync({
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                @page {
                  size: 60mm 35mm;
                  margin: 0;
                }

                html, body {
                  width: 60mm;
                  height: 35mm;
                  margin: 0;
                  padding: 0;
                  font-family: Arial, sans-serif;
                  background: white;
                }

                .label {
                  width: 60mm;
                  height: 35mm;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  padding: 2mm;
                  overflow: hidden;
                }

                .name {
                  width: 100%;
                  text-align: center;
                  font-size: 10pt;
                  font-weight: 700;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  margin-bottom: 1mm;
                }

                img {
                  width: 54mm;
                  height: auto;
                  display: block;
                }

                .code {
                  margin-top: 1mm;
                  font-size: 8pt;
                  font-weight: 700;
                  letter-spacing: 0.4mm;
                }
              </style>
            </head>
            <body>
              <div class="label">
                <div class="name">${safeName}</div>
                <img src="data:image/png;base64,${barcodeImageBase64}" />
                <div class="code">${barcodeValue}</div>
              </div>
            </body>
          </html>
        `,
      });
    } catch (error) {
      console.log('Barcode Print Error:', error);

      Alert.alert(
        'Print Failed',
        'Could not open the print dialog. Please check the printer connection and try again.'
      );
    }
  };

if (loadingProduct) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator
        size="large"
        color="#111827"
      />

      <Text style={styles.loadingText}>
        Loading product...
      </Text>
    </View>
  );
}

if (!product) {
  return (
    <View style={styles.notFound}>
      <View style={styles.notFoundIcon}>
        <Text style={styles.notFoundIconText}>
          !
        </Text>
      </View>

      <Text style={styles.notFoundTitle}>
        Product Not Found
      </Text>

      <Text style={styles.notFoundSubtitle}>
        This product may have been removed or is no longer available.
      </Text>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );
}


    // =========================
  // DELETE PRODUCT
  // =========================

  const confirmDelete = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${product.id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Failed to delete product'
        );
      }

      if (onDeleteProduct) {
        onDeleteProduct(product.id);
      }

      Alert.alert(
        'Product Deleted',
        'Product has been deleted from database successfully.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.log(
        'Product Delete Error:',
        error
      );

      Alert.alert(
        'Delete Failed',
        'Could not delete product from database. Please check backend connection.'
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={
        false
      }
    >

      {/* ================= HEADER ================= */}

      <View style={styles.header}>

        <TouchableOpacity
          style={
            styles.headerBackButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.headerBackIcon
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerCenter
          }
        >
          <Text
            style={
              styles.headerEyebrow
            }
          >
            INVENTORY
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Product Details
          </Text>
        </View>

        <View
          style={
            styles.headerPlaceholder
          }
        />

      </View>


      {/* ================= PRODUCT HERO ================= */}

      <View style={styles.heroCard}>

        <View
          style={styles.heroGlow}
        />

        {product?.image ? (
          <Image
            source={{
              uri: product.image,
            }}
            style={
              styles.productImage
            }
          />
        ) : (
          <View
            style={
              styles.productIcon
            }
          >
            <Text
              style={styles.icon}
            >
              👕
            </Text>
          </View>
        )}

        <View
          style={
            styles.productHeroInfo
          }
        >

          <View
            style={styles.codeBadge}
          >
            <Text
              style={
                styles.codeBadgeText
              }
            >
              {product.id}
            </Text>
          </View>

          <Text
            style={styles.productName}
          >
            {product.name}
          </Text>

          <Text
            style={styles.productCode}
          >
            Product ID • {product.id}
          </Text>

          <View
            style={styles.heroStats}
          >

            <View
              style={styles.heroStat}
            >
              <Text
                style={
                  styles.heroStatLabel
                }
              >
                SIZE
              </Text>

              <Text
                style={
                  styles.heroStatValue
                }
              >
                {product.size ||
                  '—'}
              </Text>
            </View>

            <View
              style={
                styles.heroDivider
              }
            />

            <View
              style={styles.heroStat}
            >
              <Text
                style={
                  styles.heroStatLabel
                }
              >
                STOCK
              </Text>

              <Text
                style={
                  styles.heroStatValue
                }
              >
                {product.stock}
              </Text>
            </View>

            <View
              style={
                styles.heroDivider
              }
            />

            <View
              style={styles.heroStat}
            >
              <Text
                style={
                  styles.heroStatLabel
                }
              >
                STATUS
              </Text>

              <View
                style={[
                  styles.heroStatusBadge,
                  product.stock === 0 &&
                    styles.heroOutBadge,
                ]}
              >
                <Text
                  style={[
                    styles.heroStatusText,
                    product.stock === 0 &&
                      styles.heroOutText,
                  ]}
                >
                  {product.stock > 0
                    ? 'Active'
                    : 'Out'}
                </Text>
              </View>
            </View>

          </View>

        </View>

      </View>


      {editing ? (

        /* ================= EDIT FORM ================= */

        <View
          style={
            styles.editContainer
          }
        >

          <View
            style={
              styles.sectionHeader
            }
          >

            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                PRODUCT MANAGEMENT
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Edit Product
              </Text>
            </View>

            <View
              style={
                styles.editBadge
              }
            >
              <Text
                style={
                  styles.editBadgeText
                }
              >
                EDIT
              </Text>
            </View>

          </View>


          {/* PRODUCT INFORMATION */}

          <View
            style={styles.formCard}
          >

            <Text
              style={
                styles.formCardTitle
              }
            >
              Product Information
            </Text>

            <Text
              style={styles.inputLabel}
            >
              Product Name
            </Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={
                setName
              }
              placeholder="Enter product name"
              placeholderTextColor="#9CA3AF"
            />

            <Text
              style={styles.inputLabel}
            >
              Size
            </Text>

            <TextInput
              style={styles.input}
              value={size}
              onChangeText={
                setSize
              }
              placeholder="e.g. M, L, XL"
              placeholderTextColor="#9CA3AF"
            />

            <Text
              style={styles.inputLabel}
            >
              Current Stock
            </Text>

            <TextInput
              style={styles.input}
              value={stock}
              onChangeText={
                setStock
              }
              keyboardType="numeric"
              placeholder="Stock quantity"
              placeholderTextColor="#9CA3AF"
            />

          </View>


          {/* PRICING */}

          <View
            style={styles.formCard}
          >

            <View
              style={
                styles.formCardHeaderRow
              }
            >

              <View>
                <Text
                  style={
                    styles.formCardTitle
                  }
                >
                  Pricing
                </Text>

                <Text
                  style={
                    styles.formCardSubtitle
                  }
                >
                  Business pricing information
                </Text>
              </View>

              <View
                style={
                  styles.privateBadge
                }
              >
                <Text
                  style={
                    styles.privateBadgeText
                  }
                >
                  🔒 OWNER
                </Text>
              </View>

            </View>


            <Text
              style={styles.inputLabel}
            >
              Purchase Cost
            </Text>

            <View
              style={
                styles.privateInputWrapper
              }
            >
              <Text
                style={
                  styles.currencyPrefix
                }
              >
                ৳
              </Text>

              <TextInput
                style={
                  styles.privateInput
                }
                value={
                  purchasePrice
                }
                onChangeText={
                  setPurchasePrice
                }
                keyboardType="numeric"
                placeholder="Purchase cost"
                placeholderTextColor="#9CA3AF"
              />
            </View>


            <Text
              style={styles.inputLabel}
            >
              Selling Price
            </Text>

            <View
              style={
                styles.inputWrapper
              }
            >
              <Text
                style={
                  styles.currencyPrefixDark
                }
              >
                ৳
              </Text>

              <TextInput
                style={
                  styles.priceInput
                }
                value={price}
                onChangeText={
                  setPrice
                }
                keyboardType="numeric"
                placeholder="Selling price"
                placeholderTextColor="#9CA3AF"
              />
            </View>

          </View>


          <TouchableOpacity
            style={
              styles.saveButton
            }
            onPress={
              handleSave
            }
          >
            <Text
              style={
                styles.saveButtonIcon
              }
            >
              ✓
            </Text>

            <Text
              style={styles.saveText}
            >
              Save Changes
            </Text>
          </TouchableOpacity>


          <TouchableOpacity
            style={
              styles.cancelButton
            }
            onPress={() =>
              setEditing(false)
            }
          >
            <Text
              style={
                styles.cancelText
              }
            >
              Cancel
            </Text>
          </TouchableOpacity>

        </View>

            ) : (

        <>
          {/* ================= DETAILS ================= */}

          {/* ================= REFERENCE PHOTO ================= */}

         {product?.image && (
            <View
              style={
                styles.imageCard
              }
            >

              <View
                style={
                  styles.cardHeaderRow
                }
              >

                <View>
                  <Text
                    style={
                      styles.cardEyebrow
                    }
                  >
                    PRODUCT MEDIA
                  </Text>

                  <Text
                    style={
                      styles.cardTitle
                    }
                  >
                    Reference Photo
                  </Text>
                </View>

                <View
                  style={
                    styles.optionalBadge
                  }
                >
                  <Text
                    style={
                      styles.optionalText
                    }
                  >
                    REFERENCE
                  </Text>
                </View>

              </View>

              <Image
                source={{
                 uri: product?.image,
                }}
                style={
                  styles.referenceImage
                }
              />

              <Text
                style={
                  styles.imageHint
                }
              >
                Saved reference image for product
                identification.
              </Text>

              <TouchableOpacity
                style={
                  styles.changePhotoButton
                }
                onPress={
                  handleChangePhoto
                }
              >
                <Text
                  style={
                    styles.changePhotoIcon
                  }
                >
                  📷
                </Text>

                <Text
                  style={
                    styles.changePhotoText
                  }
                >
                  Change Reference Photo
                </Text>
              </TouchableOpacity>

            </View>
          )}


          {/* ================= BARCODE ================= */}

          <View
            style={
              styles.barcodeCard
            }
          >

            <View
              style={
                styles.cardHeaderRow
              }
            >

              <View>
                <Text
                  style={
                    styles.cardEyebrow
                  }
                >
                  IDENTIFICATION
                </Text>

                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Product Barcode
                </Text>
              </View>

              <View
                style={
                  styles.barcodeBadge
                }
              >
                <Text
                  style={
                    styles.barcodeBadgeText
                  }
                >
                  CODE128
                </Text>
              </View>

            </View>

            <View
              style={styles.printableBarcodeLabel}
            >
              <Text
                style={styles.printableProductName}
                numberOfLines={1}
              >
                {product.name}
              </Text>

              <View
                ref={barcodeLabelRef}
                collapsable={false}
                style={styles.barcodeContainer}
              >
                <Barcode
                  value={barcodeValue}
                  format="CODE128"
                  height={52}
                  singleBarWidth={1.5}
                  lineColor="#111827"
                />
              </View>

              <View
                style={styles.barcodeValueBox}
              >
                <Text
                  style={styles.barcodeValue}
                >
                  {barcodeValue}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.printBarcodeButton}
              onPress={handlePrintBarcode}
              activeOpacity={0.85}
            >
              <Text style={styles.printBarcodeIcon}>
                🖨️
              </Text>

              <View style={styles.printBarcodeTextBox}>
                <Text style={styles.printBarcodeEyebrow}>
                  PRODUCT LABEL
                </Text>

                <Text style={styles.printBarcodeText}>
                  Print Barcode Label
                </Text>
              </View>

              <Text style={styles.printBarcodeArrow}>
                →
              </Text>
            </TouchableOpacity>

            <Text style={styles.printBarcodeHint}>
              Print this label and attach it to the product. The Sales scanner can scan this Code128 barcode.
            </Text>

          </View>


          {/* ================= PRODUCT INFORMATION ================= */}

          <View
            style={styles.card}
          >

            <View
              style={
                styles.cardHeaderRow
              }
            >
              <View>
                <Text
                  style={
                    styles.cardEyebrow
                  }
                >
                  OVERVIEW
                </Text>

                <Text
                  style={
                    styles.cardTitle
                  }
                >
                  Product Information
                </Text>
              </View>
            </View>


            {/* SELLING PRICE */}

            <View
              style={styles.infoRow}
            >

              <View>
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Selling Price
                </Text>

                <Text
                  style={
                    styles.infoHint
                  }
                >
                  Customer-facing price
                </Text>
              </View>

              <Text
                style={
                  styles.priceValue
                }
              >
                ৳
                {Number(
                  currentSellingPrice
                ).toLocaleString()}
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* PURCHASE PRICE */}

            <View
              style={
                styles.ownerInfoRow
              }
            >

              <View
                style={
                  styles.ownerInfoLeft
                }
              >

                <View
                  style={
                    styles.lockIconBox
                  }
                >
                  <Text
                    style={
                      styles.lockIcon
                    }
                  >
                    🔒
                  </Text>
                </View>

                <View>
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Purchase Cost
                  </Text>

                  <Text
                    style={
                      styles.privateHint
                    }
                  >
                    Owner only
                  </Text>
                </View>

              </View>

              <Text
                style={
                  styles.purchaseValue
                }
              >
                ৳
                {Number(
                  currentPurchasePrice
                ).toLocaleString()}
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* ESTIMATED PROFIT */}

            <View
              style={styles.infoRow}
            >

              <View>
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Est. Gross Profit / Piece
                </Text>

                <Text
                  style={
                    styles.infoHint
                  }
                >
                  Based on current product cost
                </Text>
              </View>

              <Text
                style={[
                  styles.profitValue,
                  estimatedUnitProfit <
                    0 &&
                    styles.lossValue,
                ]}
              >
                ৳
                {Number(
                  estimatedUnitProfit
                ).toLocaleString()}
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* MARGIN */}

            <View
              style={styles.infoRow}
            >

              <Text
                style={
                  styles.infoLabel
                }
              >
                Estimated Margin
              </Text>

              <Text
                style={
                  styles.marginValue
                }
              >
                {estimatedMargin.toFixed(
                  1
                )}
                %
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* SIZE */}

            <View
              style={styles.infoRow}
            >

              <Text
                style={
                  styles.infoLabel
                }
              >
                Size
              </Text>

              <Text
                style={styles.value}
              >
                {product.size ||
                  '—'}
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* STOCK */}

            <View
              style={styles.infoRow}
            >

              <View>
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Current Stock
                </Text>

                <Text
                  style={
                    styles.infoHint
                  }
                >
                  Available quantity
                </Text>
              </View>

              <Text
                style={
                  styles.stockValue
                }
              >
                {product.stock} pcs
              </Text>

            </View>


            <View
              style={styles.divider}
            />


            {/* STATUS */}

            <View
              style={styles.infoRow}
            >

              <Text
                style={
                  styles.infoLabel
                }
              >
                Inventory Status
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  product.stock === 0 &&
                    styles.outOfStockBadge,
                  product.stock > 0 &&
                    product.stock <= 5 &&
                    styles.lowStockBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    product.stock === 0 &&
                      styles.outOfStockText,
                    product.stock > 0 &&
                      product.stock <= 5 &&
                      styles.lowStockText,
                  ]}
                >
                  {product.stock === 0
                    ? 'Out of Stock'
                    : product.stock <= 5
                    ? 'Low Stock'
                    : 'In Stock'}
                </Text>
              </View>

            </View>

          </View>


          {/* ================= OWNER PRIVACY ================= */}

          <View
            style={
              styles.privacyCard
            }
          >

            <View
              style={
                styles.privacyIconBox
              }
            >
              <Text
                style={
                  styles.privacyIcon
                }
              >
                🔐
              </Text>
            </View>

            <View
              style={
                styles.privacyContent
              }
            >
              <Text
                style={
                  styles.privacyTitle
                }
              >
                Business Cost Data
              </Text>

              <Text
                style={
                  styles.privacyText
                }
              >
                Purchase cost and estimated profit are
                internal business information and should
                only be accessible to authorized owners.
              </Text>
            </View>

          </View>

                    {/* ================= RESTOCK ================= */}

          <View
            style={
              styles.restockCard
            }
          >

            <View
              style={
                styles.restockHeader
              }
            >

              <View
                style={
                  styles.restockIconBox
                }
              >
                <Text
                  style={
                    styles.restockIcon
                  }
                >
                  +
                </Text>
              </View>

              <View
                style={
                  styles.restockHeaderText
                }
              >
                <Text
                  style={
                    styles.cardEyebrow
                  }
                >
                  INVENTORY
                </Text>

                <Text
                  style={
                    styles.restockTitle
                  }
                >
                  Restock Product
                </Text>

                <Text
                  style={
                    styles.restockSubtitle
                  }
                >
                  Record a new purchase batch
                </Text>
              </View>

            </View>


            {/* CURRENT STOCK */}

            <View
              style={
                styles.currentStockBox
              }
            >

              <View>
                <Text
                  style={
                    styles.currentStockLabel
                  }
                >
                  CURRENT STOCK
                </Text>

                <Text
                  style={
                    styles.currentStockValue
                  }
                >
                  {product.stock}

                  <Text
                    style={
                      styles.currentStockUnit
                    }
                  >
                    {' '}pieces
                  </Text>
                </Text>
              </View>

              <View
                style={
                  styles.stockMiniBadge
                }
              >
                <Text
                  style={
                    styles.stockMiniBadgeText
                  }
                >
                  AVAILABLE
                </Text>
              </View>

            </View>


            {/* QUANTITY */}

            <Text
              style={styles.inputLabel}
            >
              Restock Quantity
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={
                restockQuantity
              }
              onChangeText={
                setRestockQuantity
              }
            />


            {/* PURCHASE COST */}

            <View
              style={
                styles.inputLabelRow
              }
            >

              <Text
                style={
                  styles.inputLabel
                }
              >
                Purchase Cost / Piece
              </Text>

              <View
                style={
                  styles.ownerMiniBadge
                }
              >
                <Text
                  style={
                    styles.ownerMiniBadgeText
                  }
                >
                  🔒 OWNER
                </Text>
              </View>

            </View>

            <View
              style={
                styles.privateInputWrapper
              }
            >

              <Text
                style={
                  styles.currencyPrefix
                }
              >
                ৳
              </Text>

              <TextInput
                style={
                  styles.privateInput
                }
                placeholder="Enter purchase cost"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={
                  restockPurchasePrice
                }
                onChangeText={
                  setRestockPurchasePrice
                }
              />

            </View>


            {/* SUPPLIER */}

            <Text
              style={styles.inputLabel}
            >
              Supplier Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. ABC Fashion House"
              placeholderTextColor="#9CA3AF"
              value={supplier}
              onChangeText={
                setSupplier
              }
            />


            {/* PURCHASE SUMMARY */}

            {restockQtyNumber > 0 &&
              restockPriceNumber > 0 && (
                <View
                  style={
                    styles.purchaseSummary
                  }
                >

                  <View
                    style={
                      styles.summaryHeader
                    }
                  >
                    <Text
                      style={
                        styles.summaryTitle
                      }
                    >
                      Purchase Summary
                    </Text>

                    <Text
                      style={
                        styles.summaryLive
                      }
                    >
                      LIVE
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryRow
                    }
                  >
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      Quantity
                    </Text>

                    <Text
                      style={
                        styles.summaryValue
                      }
                    >
                      {restockQtyNumber} pcs
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryRow
                    }
                  >
                    <Text
                      style={
                        styles.summaryLabel
                      }
                    >
                      Cost / Piece
                    </Text>

                    <Text
                      style={
                        styles.summaryValue
                      }
                    >
                      ৳
                      {restockPriceNumber.toLocaleString()}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.summaryDivider
                    }
                  />

                  <View
                    style={
                      styles.summaryTotalRow
                    }
                  >
                    <Text
                      style={
                        styles.summaryTotalLabel
                      }
                    >
                      Total Purchase
                    </Text>

                    <Text
                      style={
                        styles.summaryTotal
                      }
                    >
                      ৳
                      {estimatedPurchaseTotal.toLocaleString()}
                    </Text>
                  </View>

                </View>
              )}


            {/* RESTOCK BUTTON */}

            <TouchableOpacity
              style={
                styles.restockButton
              }
              onPress={
                handleRestock
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.restockButtonIcon
                }
              >
                +
              </Text>

              <Text
                style={
                  styles.restockButtonText
                }
              >
                Record Purchase & Add Stock
              </Text>
            </TouchableOpacity>

          </View>

                    {/* ================= STOCK ADJUSTMENT ================= */}

          <View
            style={
              styles.adjustmentCard
            }
          >

            <View
              style={
                styles.adjustmentHeader
              }
            >

              <View
                style={
                  styles.adjustmentIconBox
                }
              >
                <Text
                  style={
                    styles.adjustmentIcon
                  }
                >
                  −
                </Text>
              </View>

              <View
                style={
                  styles.adjustmentHeaderText
                }
              >
                <Text
                  style={
                    styles.cardEyebrow
                  }
                >
                  STOCK CONTROL
                </Text>

                <Text
                  style={
                    styles.adjustmentTitle
                  }
                >
                  Stock Adjustment
                </Text>

                <Text
                  style={
                    styles.adjustmentSubtitle
                  }
                >
                  Remove stock with a recorded reason
                </Text>
              </View>

            </View>


            {/* CURRENT STOCK */}

            <View
              style={
                styles.adjustmentStockBox
              }
            >

              <View>
                <Text
                  style={
                    styles.adjustmentStockLabel
                  }
                >
                  CURRENT STOCK
                </Text>

                <Text
                  style={
                    styles.adjustmentStockValue
                  }
                >
                  {product.stock}
                  <Text
                    style={
                      styles.adjustmentStockUnit
                    }
                  >
                    {' '}pieces
                  </Text>
                </Text>
              </View>

              <View
                style={
                  styles.removeBadge
                }
              >
                <Text
                  style={
                    styles.removeBadgeText
                  }
                >
                  STOCK OUT
                </Text>
              </View>

            </View>


            {/* ADJUSTMENT TYPE */}

            <Text
              style={
                styles.inputLabel
              }
            >
              Adjustment Type
            </Text>

            <View
              style={
                styles.adjustmentTypes
              }
            >

              <TouchableOpacity
                style={[
                  styles.adjustmentTypeButton,
                  adjustmentType ===
                    'FACTORY_RETURN' &&
                    styles.adjustmentTypeActive,
                ]}
                onPress={() =>
                  setAdjustmentType(
                    'FACTORY_RETURN'
                  )
                }
              >
                <Text
                  style={[
                    styles.adjustmentTypeIcon,
                    adjustmentType ===
                      'FACTORY_RETURN' &&
                      styles.adjustmentTypeIconActive,
                  ]}
                >
                  ↩
                </Text>

                <Text
                  style={[
                    styles.adjustmentTypeText,
                    adjustmentType ===
                      'FACTORY_RETURN' &&
                      styles.adjustmentTypeTextActive,
                  ]}
                >
                  Factory Return
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.adjustmentTypeButton,
                  adjustmentType ===
                    'DAMAGED' &&
                    styles.adjustmentTypeActive,
                ]}
                onPress={() =>
                  setAdjustmentType(
                    'DAMAGED'
                  )
                }
              >
                <Text
                  style={[
                    styles.adjustmentTypeIcon,
                    adjustmentType ===
                      'DAMAGED' &&
                      styles.adjustmentTypeIconActive,
                  ]}
                >
                  !
                </Text>

                <Text
                  style={[
                    styles.adjustmentTypeText,
                    adjustmentType ===
                      'DAMAGED' &&
                      styles.adjustmentTypeTextActive,
                  ]}
                >
                  Damaged
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.adjustmentTypeButton,
                  adjustmentType ===
                    'MISSING' &&
                    styles.adjustmentTypeActive,
                ]}
                onPress={() =>
                  setAdjustmentType(
                    'MISSING'
                  )
                }
              >
                <Text
                  style={[
                    styles.adjustmentTypeIcon,
                    adjustmentType ===
                      'MISSING' &&
                      styles.adjustmentTypeIconActive,
                  ]}
                >
                  ?
                </Text>

                <Text
                  style={[
                    styles.adjustmentTypeText,
                    adjustmentType ===
                      'MISSING' &&
                      styles.adjustmentTypeTextActive,
                  ]}
                >
                  Missing
                </Text>
              </TouchableOpacity>


              <TouchableOpacity
                style={[
                  styles.adjustmentTypeButton,
                  adjustmentType ===
                    'ADJUSTMENT' &&
                    styles.adjustmentTypeActive,
                ]}
                onPress={() =>
                  setAdjustmentType(
                    'ADJUSTMENT'
                  )
                }
              >
                <Text
                  style={[
                    styles.adjustmentTypeIcon,
                    adjustmentType ===
                      'ADJUSTMENT' &&
                      styles.adjustmentTypeIconActive,
                  ]}
                >
                  ⚙
                </Text>

                <Text
                  style={[
                    styles.adjustmentTypeText,
                    adjustmentType ===
                      'ADJUSTMENT' &&
                      styles.adjustmentTypeTextActive,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>

            </View>


            {/* QUANTITY */}

            <Text
              style={
                styles.inputLabel
              }
            >
              Quantity to Remove
            </Text>

            <TextInput
              style={
                styles.input
              }
              placeholder="Enter quantity"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={
                adjustmentQuantity
              }
              onChangeText={
                setAdjustmentQuantity
              }
            />


            {/* REASON */}

            <Text
              style={
                styles.inputLabel
              }
            >
              Reason / Note
            </Text>

            <TextInput
              style={
                styles.reasonInput
              }
              placeholder="e.g. Defective stitching, damaged during delivery..."
              placeholderTextColor="#9CA3AF"
              value={
                adjustmentReason
              }
              onChangeText={
                setAdjustmentReason
              }
              multiline
              textAlignVertical="top"
            />


            {/* LIVE STOCK PREVIEW */}

            {adjustmentQtyNumber > 0 && (
              <View
                style={
                  styles.adjustmentPreview
                }
              >

                <View
                  style={
                    styles.previewHeader
                  }
                >
                  <Text
                    style={
                      styles.previewTitle
                    }
                  >
                    Stock Impact
                  </Text>

                  <Text
                    style={
                      styles.previewLive
                    }
                  >
                    PREVIEW
                  </Text>
                </View>

                <View
                  style={
                    styles.previewStockRow
                  }
                >

                  <View
                    style={
                      styles.previewStockBlock
                    }
                  >
                    <Text
                      style={
                        styles.previewLabel
                      }
                    >
                      CURRENT
                    </Text>

                    <Text
                      style={
                        styles.previewCurrent
                      }
                    >
                      {product.stock}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.previewArrow
                    }
                  >
                    →
                  </Text>

                  <View
                    style={
                      styles.previewStockBlock
                    }
                  >
                    <Text
                      style={
                        styles.previewLabel
                      }
                    >
                      AFTER
                    </Text>

                    <Text
                      style={[
                        styles.previewAfter,
                        adjustmentQtyNumber >
                          Number(
                            product.stock
                          ) &&
                          styles.previewInvalid,
                      ]}
                    >
                      {projectedStock}
                    </Text>
                  </View>

                </View>

                {adjustmentQtyNumber >
                  Number(product.stock) && (
                  <Text
                    style={
                      styles.previewWarning
                    }
                  >
                    ⚠ Quantity cannot exceed current stock.
                  </Text>
                )}

              </View>
            )}


            {/* ADJUSTMENT BUTTON */}

            <TouchableOpacity
              style={
                styles.adjustmentButton
              }
              onPress={
                handleStockAdjustment
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.adjustmentButtonIcon
                }
              >
                −
              </Text>

              <Text
                style={
                  styles.adjustmentButtonText
                }
              >
                Record Stock Adjustment
              </Text>
            </TouchableOpacity>

            <Text
              style={
                styles.adjustmentSecurityText
              }
            >
              Every adjustment should have a valid business
              reason. This record will be used in future
              stock and business reports.
            </Text>

          </View>


          {/* ================= ACTIONS ================= */}

          <View
            style={styles.actions}
          >

            <TouchableOpacity
              style={
                styles.editButton
              }
              onPress={() =>
                setEditing(true)
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.editButtonIcon
                }
              >
                ✎
              </Text>

              <Text
                style={styles.editText}
              >
                Edit Product
              </Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={
                styles.deleteButton
              }
              onPress={
                handleDelete
              }
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.deleteButtonIcon
                }
              >
                🗑
              </Text>

              <Text
                style={styles.deleteText}
              >
                Delete Product
              </Text>
            </TouchableOpacity>

          </View>

        </>
      )}

    </ScrollView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },

  content: {
    padding: 18,
    paddingTop: 48,
    paddingBottom: 50,
  },


  // ================= HEADER =================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9ECF2',
  },

  headerBackIcon: {
    fontSize: 30,
    color: '#111827',
    lineHeight: 32,
    marginTop: -2,
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 2,
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  headerPlaceholder: {
    width: 44,
  },


  // ================= HERO =================

  heroCard: {
    backgroundColor: '#111827',
    borderRadius: 28,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
  },

  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#312E81',
    opacity: 0.28,
    right: -55,
    top: -65,
  },

  productIcon: {
    width: 112,
    height: 112,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    alignSelf: 'center',
  },

  productImage: {
    width: 112,
    height: 112,
    borderRadius: 26,
    marginBottom: 18,
    alignSelf: 'center',
    resizeMode: 'cover',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  icon: {
    fontSize: 40,
  },

  productHeroInfo: {
    alignItems: 'center',
  },

  codeBadge: {
    backgroundColor:
      'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },

  codeBadgeText: {
    color: '#C4B5FD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  productCode: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor:
      'rgba(255,255,255,0.07)',
    borderRadius: 17,
    paddingVertical: 13,
    paddingHorizontal: 12,
    width: '100%',
  },

  heroStat: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  heroStatValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  heroDivider: {
    width: 1,
    height: 30,
    backgroundColor:
      'rgba(255,255,255,0.12)',
  },

  heroStatusBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  heroStatusText: {
    color: '#6EE7B7',
    fontSize: 9,
    fontWeight: '800',
  },

  heroOutBadge: {
    backgroundColor: '#7F1D1D',
  },

  heroOutText: {
    color: '#FCA5A5',
  },


  // ================= SECTION =================

  editContainer: {
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionEyebrow: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1.6,
    marginBottom: 4,
  },

  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  editBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },

  editBadgeText: {
    color: '#4F46E5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },


  // ================= CARDS =================

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  imageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  barcodeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  cardEyebrow: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  cardHeaderSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 3,
  },

  optionalBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  optionalText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },


  // ================= IMAGE =================

  referenceImage: {
    width: '100%',
    height: 270,
    borderRadius: 17,
    resizeMode: 'cover',
  },

  imageHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 10,
    lineHeight: 17,
    textAlign: 'center',
  },

  changePhotoButton: {
    marginTop: 15,
    height: 49,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  changePhotoIcon: {
    fontSize: 16,
    marginRight: 8,
  },

  changePhotoText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },


  // ================= BARCODE =================

  barcodeBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  barcodeBadgeText: {
    color: '#15803D',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  barcodeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },

  barcodeValueBox: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 9,
  },

  barcodeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 1.5,
  },


  printableBarcodeLabel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  printableProductName: {
    maxWidth: '90%',
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 7,
    textAlign: 'center',
  },

  printBarcodeButton: {
    marginTop: 15,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  printBarcodeIcon: {
    fontSize: 20,
    marginRight: 10,
  },

  printBarcodeTextBox: {
    flex: 1,
  },

  printBarcodeEyebrow: {
    color: '#9CA3AF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },

  printBarcodeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  printBarcodeArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
  },

  printBarcodeHint: {
    marginTop: 10,
    fontSize: 10,
    lineHeight: 15,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // ================= INFORMATION =================

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    minHeight: 52,
  },

  ownerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 58,
    paddingVertical: 5,
  },

  ownerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  lockIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  lockIcon: {
    fontSize: 15,
  },

  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },

  infoHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  privateHint: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '700',
    marginTop: 3,
  },

  value: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  priceValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  purchaseValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
  },

  profitValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },

  lossValue: {
    color: '#DC2626',
  },

  marginValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },

  stockValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0F1F4',
    marginVertical: 6,
  },

  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },

  statusText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },

  lowStockBadge: {
    backgroundColor: '#FFFBEB',
  },

  lowStockText: {
    color: '#D97706',
  },

  outOfStockBadge: {
    backgroundColor: '#FEF2F2',
  },

  outOfStockText: {
    color: '#DC2626',
  },


  // ================= PRIVACY =================

  privacyCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 19,
    padding: 16,
    marginBottom: 15,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },

  privacyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  privacyIcon: {
    fontSize: 17,
  },

  privacyContent: {
    flex: 1,
  },

  privacyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4C1D95',
    marginBottom: 4,
  },

  privacyText: {
    fontSize: 10,
    color: '#6D5A91',
    lineHeight: 16,
  },


  // ================= RESTOCK =================

  restockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  restockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  restockIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  restockIcon: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '400',
  },

  restockHeaderText: {
    flex: 1,
  },

  restockTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  restockSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  currentStockBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 15,
    padding: 15,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF1F5',
  },

  currentStockLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  currentStockValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  currentStockUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  stockMiniBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  stockMiniBadgeText: {
    color: '#059669',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },


  // ================= INPUTS =================

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 8,
  },

  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  ownerMiniBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    marginBottom: 8,
  },

  ownerMiniBadgeText: {
    color: '#7C3AED',
    fontSize: 7,
    fontWeight: '800',
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FAFBFC',
    marginBottom: 14,
  },

  privateInputWrapper: {
    height: 52,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 13,
    backgroundColor: '#FAF8FF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: '#7C3AED',
    marginLeft: 15,
    marginRight: 4,
  },

  privateInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },

  inputWrapper: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 13,
    backgroundColor: '#FAFBFC',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },

  currencyPrefixDark: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
    marginLeft: 15,
    marginRight: 4,
  },

  priceInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },

  reasonInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 13,
    color: '#111827',
    backgroundColor: '#FAFBFC',
    marginBottom: 15,
    lineHeight: 19,
  },


  // ================= PURCHASE SUMMARY =================

  purchaseSummary: {
    backgroundColor: '#111827',
    borderRadius: 17,
    padding: 16,
    marginTop: 3,
    marginBottom: 14,
  },

  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  summaryLive: {
    fontSize: 7,
    fontWeight: '800',
    color: '#6EE7B7',
    backgroundColor: '#064E3B',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.8,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  summaryLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },

  summaryValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E5E7EB',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },

  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryTotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1D5DB',
  },

  summaryTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },


  // ================= RESTOCK BUTTON =================

  restockButton: {
    height: 54,
    backgroundColor: '#111827',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  restockButtonIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 8,
    marginTop: -2,
  },

  restockButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },


  // ================= STOCK ADJUSTMENT =================

  adjustmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEFF4',
  },

  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  adjustmentIconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  adjustmentIcon: {
    color: '#DC2626',
    fontSize: 27,
    fontWeight: '600',
  },

  adjustmentHeaderText: {
    flex: 1,
  },

  adjustmentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  adjustmentSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  adjustmentStockBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 15,
    padding: 15,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  adjustmentStockLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  adjustmentStockValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  adjustmentStockUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  removeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  removeBadgeText: {
    color: '#DC2626',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
  },


  // ================= ADJUSTMENT TYPES =================

  adjustmentTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 17,
  },

  adjustmentTypeButton: {
    width: '48%',
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: '#E4E7EC',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  adjustmentTypeActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  adjustmentTypeIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 27,
    marginRight: 8,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '800',
  },

  adjustmentTypeIconActive: {
    backgroundColor: '#374151',
    color: '#FFFFFF',
  },

  adjustmentTypeText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    color: '#4B5563',
  },

  adjustmentTypeTextActive: {
    color: '#FFFFFF',
  },


  // ================= ADJUSTMENT PREVIEW =================

  adjustmentPreview: {
    backgroundColor: '#111827',
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
  },

  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  previewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  previewLive: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FCD34D',
    backgroundColor: '#78350F',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.8,
  },

  previewStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewStockBlock: {
    alignItems: 'center',
    minWidth: 75,
  },

  previewLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 5,
  },

  previewCurrent: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  previewAfter: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FCA5A5',
  },

  previewInvalid: {
    color: '#F87171',
  },

  previewArrow: {
    color: '#6B7280',
    fontSize: 22,
    marginHorizontal: 22,
  },

  previewWarning: {
    color: '#FCA5A5',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 13,
  },


  // ================= ADJUSTMENT BUTTON =================

  adjustmentButton: {
    height: 54,
    backgroundColor: '#DC2626',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  adjustmentButtonIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    marginRight: 8,
  },

  adjustmentButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  adjustmentSecurityText: {
    fontSize: 9,
    color: '#9CA3AF',
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 11,
  },


  // ================= ACTIONS =================

  actions: {
    marginTop: 2,
  },

  editButton: {
    height: 54,
    backgroundColor: '#111827',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },

  editButtonIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    marginRight: 8,
  },

  editText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  deleteButton: {
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  deleteButtonIcon: {
    fontSize: 15,
    marginRight: 8,
  },

  deleteText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },


  // ================= EDIT =================

  formCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },

  formCardSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 17,
  },

  formCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  privateBadge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  privateBadgeText: {
    color: '#7C3AED',
    fontSize: 8,
    fontWeight: '800',
  },

  saveButton: {
    height: 55,
    backgroundColor: '#111827',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 2,
  },

  saveButtonIcon: {
    color: '#6EE7B7',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  cancelButton: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#EDEFF3',
  },

  cancelText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
  },


  // ================= NOT FOUND =================

  notFound: {
    flex: 1,
    backgroundColor: '#F4F6FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  notFoundIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  notFoundIconText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#DC2626',
  },

  notFoundTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 7,
  },

  notFoundSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 22,
  },

  backButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 27,
    paddingVertical: 14,
    borderRadius: 13,
  },

  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

});