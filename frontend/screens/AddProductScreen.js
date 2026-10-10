import React, { useMemo, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'http://192.168.1.102:3000';

const generateProductCode = () => `SP${Date.now()}`;

export default function AddProductScreen({
  navigation,
  onAddProduct,
}) {
  const [productName, setProductName] =
    useState('');

  const [productCode, setProductCode] =
    useState(() => generateProductCode());

  const [sellingPrice, setSellingPrice] =
    useState('');

  const [purchasePrice, setPurchasePrice] =
    useState('');

  const [size, setSize] =
    useState('');

  const [stock, setStock] =
    useState('');

  const [productImage, setProductImage] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  // ==========================================
  // CALCULATE POTENTIAL PROFIT
  // ==========================================

  const potentialProfit = useMemo(() => {
    const selling =
      Number(sellingPrice) || 0;

    const purchase =
      Number(purchasePrice) || 0;

    return selling - purchase;
  }, [
    sellingPrice,
    purchasePrice,
  ]);

  // ==========================================
  // TAKE PRODUCT PHOTO
  // ==========================================

  const takeProductPhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to take a product photo.'
      );

      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });

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

      setProductImage({
        uri: asset.uri,
        dataUri: `data:${mimeType};base64,${asset.base64}`,
      });
    }
  };

  // ==========================================
  // ADD PRODUCT
  // ==========================================

  const handleAddProduct = async () => {
    if (isSaving) {
      return;
    }

    if (
      !productName.trim() ||
      !sellingPrice.trim() ||
      !purchasePrice.trim() ||
      !size.trim() ||
      !stock.trim()
    ) {
      Alert.alert(
        'Missing Information',
        'Please fill in all required fields.'
      );

      return;
    }

    const selling =
      Number(sellingPrice);

    const purchase =
      Number(purchasePrice);

    const stockQuantity =
      Number(stock);

    // Validate numbers
    if (
      isNaN(selling) ||
      isNaN(purchase) ||
      isNaN(stockQuantity)
    ) {
      Alert.alert(
        'Invalid Information',
        'Please enter valid numbers for price and stock.'
      );

      return;
    }

    // Validate positive values
    if (
      selling <= 0 ||
      purchase <= 0 ||
      stockQuantity <= 0
    ) {
      Alert.alert(
        'Invalid Information',
        'Selling price, purchase price and stock must be greater than 0.'
      );

      return;
    }

    // Purchase price cannot be higher
    // than selling price
    if (purchase > selling) {
      Alert.alert(
        'Invalid Purchase Price',
        'Purchase price cannot be higher than the selling price.'
      );

      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: productName.trim(),
            productCode: productCode.trim(),
            sellingPrice: selling,
            purchasePrice: purchase,
            size: size.trim(),
            stock: stockQuantity,
            imageData:
              productImage?.dataUri || null,
          }),
        }
      );

      let data = null;

      try {
        data = await response.json();
      } catch (jsonError) {
        data = null;
      }

      if (!response.ok) {
        const errorMessage =
          Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message ||
              'Could not save product to the server.';

        throw new Error(errorMessage);
      }

      const newProduct = {
        id: data.id,

        barcode:
          data.productCode,

        productCode:
          data.productCode,

        databaseId:
          Number(data.id),

        name:
          data.name,

        // Customer-facing selling price
        price:
          String(data.sellingPrice),

        sellingPrice:
          Number(data.sellingPrice),

        // Owner-only purchase cost
        purchasePrice:
          Number(data.purchasePrice),

        size:
          data.size,

        stock:
          Number(data.stock),

        // Product reference image is now persisted
        // in MySQL and returned by the backend.
        image:
          data.imageData ||
          productImage?.dataUri ||
          null,
      };

      // Add product to shared product list
      // only after the database save succeeds.
      onAddProduct(newProduct);

      // Prepare a fresh code for the next product.
      setProductCode(generateProductCode());

      Alert.alert(
        'Product Added',
        `Product saved successfully.\n\nBarcode: ${data.productCode}`,
        [
          {
            text: 'Product List',
            onPress: () =>
              navigation.navigate('ProductList'),
          },
          {
            text: 'View / Print Barcode',
            onPress: () =>
              navigation.navigate('ProductDetails', {
                productId: data.id,
              }),
          },
        ]
      );
    } catch (error) {
      console.error(
        'Add product API error:',
        error
      );

      Alert.alert(
        'Save Failed',
        error?.message ||
          'Could not connect to the SmartPOS backend. Please make sure the backend is running.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.content
      }
      showsVerticalScrollIndicator={false}
    >

      {/* =====================================
          HEADER
      ====================================== */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text style={styles.backIcon}>
            ‹
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>

          <Text style={styles.headerSmall}>
            SMARTPOS
          </Text>

          <Text style={styles.headerTitle}>
            Add Product
          </Text>

        </View>

        <View style={styles.headerBadge}>

          <Text style={styles.headerBadgeText}>
            NEW
          </Text>

        </View>

      </View>

      {/* =====================================
          PRODUCT INFORMATION CARD
      ====================================== */}

      <View style={styles.card}>

        <View style={styles.cardHeader}>

          <View>

            <Text style={styles.title}>
              Product Information
            </Text>

            <Text style={styles.subtitle}>
              Add product details and pricing
            </Text>

          </View>

          <View style={styles.lockBadge}>

            <Text style={styles.lockIcon}>
              🔒
            </Text>

            <Text style={styles.lockText}>
              OWNER
            </Text>

          </View>

        </View>

        {/* =====================================
            PRODUCT PHOTO
        ====================================== */}

        <Text style={styles.label}>
          Product Reference Photo
        </Text>

        <Text style={styles.helperText}>
          Optional photo used for product identification
        </Text>

        {productImage ? (

          <View style={styles.imageSection}>

            <Image
              source={{
                uri: productImage?.uri,
              }}
              style={styles.productImage}
            />

            <View style={styles.photoActions}>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={
                  takeProductPhoto
                }
              >

                <Text
                  style={styles.retakeIcon}
                >
                  📷
                </Text>

                <Text
                  style={styles.retakeText}
                >
                  Retake Photo
                </Text>

              </TouchableOpacity>

            </View>

          </View>

        ) : (

          <TouchableOpacity
            style={styles.photoButton}
            onPress={
              takeProductPhoto
            }
            activeOpacity={0.8}
          >

            <View
              style={styles.cameraCircle}
            >

              <Text
                style={styles.cameraIcon}
              >
                📷
              </Text>

            </View>

            <Text
              style={styles.photoButtonText}
            >
              Take Product Photo
            </Text>

            <Text
              style={styles.photoHint}
            >
              Recommended for photo identification
            </Text>

          </TouchableOpacity>

        )}

        {/* =====================================
            PRODUCT NAME
        ====================================== */}

        <Text style={styles.label}>
          Product Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. Panjabi RAN022"
          placeholderTextColor="#9CA3AF"
          value={productName}
          onChangeText={
            setProductName
          }
        />

        {/* =====================================
            AUTO-GENERATED PRODUCT BARCODE
        ====================================== */}

        <Text style={styles.label}>
          Product Barcode
        </Text>

        <Text style={styles.helperText}>
          SmartPOS generates a unique Code128 barcode automatically.
        </Text>

        <View style={styles.autoBarcodeBox}>
          <View>
            <Text style={styles.autoBarcodeLabel}>
              AUTO BARCODE
            </Text>

            <Text style={styles.autoBarcodeValue}>
              {productCode}
            </Text>
          </View>

          <View style={styles.autoBadge}>
            <Text style={styles.autoBadgeText}>
              CODE128
            </Text>
          </View>
        </View>

        {/* =====================================
            SELLING PRICE
        ====================================== */}

        <Text style={styles.label}>
          Selling Price
        </Text>

        <Text style={styles.fieldHint}>
          Price shown during customer sale
        </Text>

        <View
          style={styles.priceInputBox}
        >

          <Text
            style={styles.currencySymbol}
          >
            ৳
          </Text>

          <TextInput
            style={styles.priceInput}
            placeholder="e.g. 1850"
            placeholderTextColor="#9CA3AF"
            value={sellingPrice}
            onChangeText={
              setSellingPrice
            }
            keyboardType="numeric"
          />

        </View>

        {/* =====================================
            PURCHASE PRICE
        ====================================== */}

        <View style={styles.purchaseHeader}>

          <View>

            <Text style={styles.label}>
              Purchase Price
            </Text>

            <Text style={styles.fieldHint}>
              Private cost price for owner reports
            </Text>

          </View>

          <View style={styles.privateBadge}>

            <Text
              style={styles.privateBadgeText}
            >
              PRIVATE
            </Text>

          </View>

        </View>

        <View
          style={[
            styles.priceInputBox,
            styles.purchaseInputBox,
          ]}
        >

          <Text
            style={styles.currencySymbol}
          >
            ৳
          </Text>

          <TextInput
            style={styles.priceInput}
            placeholder="e.g. 1200"
            placeholderTextColor="#9CA3AF"
            value={purchasePrice}
            onChangeText={
              setPurchasePrice
            }
            keyboardType="numeric"
          />

        </View>

        <View style={styles.privateNote}>

          <Text
            style={styles.privateNoteIcon}
          >
            🔒
          </Text>

          <Text
            style={styles.privateNoteText}
          >
            Purchase price is for owner/business
            records and will not be shown to customers.
          </Text>

        </View>

        {/* =====================================
            PROFIT PREVIEW
        ====================================== */}

        {sellingPrice !== '' &&
          purchasePrice !== '' && (

            <View
              style={[
                styles.profitCard,
                potentialProfit < 0 &&
                  styles.profitCardWarning,
              ]}
            >

              <View
                style={styles.profitLeft}
              >

                <View
                  style={styles.profitIconBox}
                >

                  <Text
                    style={styles.profitIcon}
                  >
                    📈
                  </Text>

                </View>

                <View>

                  <Text
                    style={styles.profitLabel}
                  >
                    POTENTIAL GROSS PROFIT
                  </Text>

                  <Text
                    style={[
                      styles.profitAmount,
                      potentialProfit < 0 &&
                        styles.profitAmountWarning,
                    ]}
                  >
                    ৳
                    {potentialProfit.toLocaleString()}
                  </Text>

                </View>

              </View>

              <View
                style={styles.marginBox}
              >

                <Text
                  style={styles.marginLabel}
                >
                  PER ITEM
                </Text>

                <Text
                  style={styles.marginText}
                >
                  {sellingPrice &&
                  Number(sellingPrice) > 0
                    ? (
                        (potentialProfit /
                          Number(
                            sellingPrice
                          )) *
                        100
                      ).toFixed(1)
                    : '0.0'}
                  %
                </Text>

              </View>

            </View>

          )}

        {/* =====================================
            SIZE
        ====================================== */}

        <Text style={styles.label}>
          Size
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. L"
          placeholderTextColor="#9CA3AF"
          value={size}
          onChangeText={setSize}
        />

        {/* =====================================
            STOCK
        ====================================== */}

        <Text style={styles.label}>
          Initial Stock Quantity
        </Text>

        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          placeholderTextColor="#9CA3AF"
          value={stock}
          onChangeText={setStock}
          keyboardType="numeric"
        />

        {/* =====================================
            PRODUCT SUMMARY
        ====================================== */}

        {(productName ||
          productCode ||
          sellingPrice ||
          purchasePrice ||
          size ||
          stock) && (

          <View
            style={styles.summaryCard}
          >

            <Text
              style={styles.summaryTitle}
            >
              Product Summary
            </Text>

            <View
              style={styles.summaryRow}
            >

              <Text
                style={styles.summaryLabel}
              >
                Product
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
              >
                {productName ||
                  'Not set'}
              </Text>

            </View>

            <View
              style={styles.summaryRow}
            >

              <Text
                style={styles.summaryLabel}
              >
                Barcode
              </Text>

              <Text
                style={styles.summaryValue}
                numberOfLines={1}
              >
                {productCode || 'Not set'}
              </Text>

            </View>

            <View
              style={styles.summaryRow}
            >

              <Text
                style={styles.summaryLabel}
              >
                Selling Price
              </Text>

              <Text
                style={styles.summaryValue}
              >
                ৳
                {Number(
                  sellingPrice || 0
                ).toLocaleString()}
              </Text>

            </View>

            <View
              style={styles.summaryRow}
            >

              <Text
                style={styles.summaryLabel}
              >
                Purchase Price
              </Text>

              <Text
                style={styles.privateValue}
              >
                ৳
                {Number(
                  purchasePrice || 0
                ).toLocaleString()}
              </Text>

            </View>

            <View
              style={styles.summaryRow}
            >

              <Text
                style={styles.summaryLabel}
              >
                Initial Stock
              </Text>

              <Text
                style={styles.summaryValue}
              >
                {stock || '0'} pieces
              </Text>

            </View>

          </View>

        )}

        {/* =====================================
            ADD PRODUCT BUTTON
        ====================================== */}

        <TouchableOpacity
          style={[
            styles.button,
            isSaving && styles.buttonDisabled,
          ]}
          onPress={
            handleAddProduct
          }
          activeOpacity={0.85}
          disabled={isSaving}
        >

          <View
            style={styles.buttonIconBox}
          >

            <Text
              style={styles.buttonIcon}
            >
              +
            </Text>

          </View>

          <View
            style={styles.buttonTextBox}
          >

            <Text
              style={styles.buttonSmall}
            >
              {isSaving ? 'DATABASE' : 'PRODUCT'}
            </Text>

            <Text
              style={styles.buttonText}
            >
              {isSaving ? 'Saving...' : 'Add Product'}
            </Text>

          </View>

          <Text
            style={styles.buttonArrow}
          >
            →
          </Text>

        </TouchableOpacity>

        <Text style={styles.footerText}>
          Product data will be added to your SmartPOS
          inventory.
        </Text>

      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 45,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 30,
    color: '#111827',
    marginTop: -3,
  },

  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },

  headerSmall: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1.6,
  },

  headerTitle: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },

  headerBadge: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },

  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  // ==========================================
  // MAIN CARD
  // ==========================================

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },

  subtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  lockIcon: {
    fontSize: 10,
    marginRight: 4,
  },

  lockText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#6B7280',
  },

  // ==========================================
  // LABELS
  // ==========================================

  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 6,
    marginTop: 18,
  },

  helperText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: -2,
    marginBottom: 9,
  },

  fieldHint: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: -3,
    marginBottom: 7,
  },

  // ==========================================
  // PHOTO
  // ==========================================

  photoButton: {
    height: 160,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },

  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  cameraIcon: {
    fontSize: 25,
  },

  photoButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  photoHint: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 5,
  },

  imageSection: {
    alignItems: 'center',
  },

  productImage: {
    width: 180,
    height: 180,
    borderRadius: 18,
    resizeMode: 'cover',
  },

  photoActions: {
    flexDirection: 'row',
    marginTop: 12,
  },

  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
  },

  retakeIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  retakeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '800',
  },

  // ==========================================
  // INPUT
  // ==========================================

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },

  autoBarcodeBox: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 13,
    paddingHorizontal: 15,
    paddingVertical: 11,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  autoBarcodeLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },

  autoBarcodeValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 0.6,
  },

  autoBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
  },

  autoBadgeText: {
    color: '#047857',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  // ==========================================
  // PRICE INPUT
  // ==========================================

  priceInputBox: {
    height: 54,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 13,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },

  purchaseInputBox: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F8FAFC',
  },

  currencySymbol: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginRight: 9,
  },

  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  // ==========================================
  // PURCHASE HEADER
  // ==========================================

  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  privateBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },

  privateBadgeText: {
    color: '#92400E',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  privateNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 11,
    padding: 10,
    marginTop: 9,
  },

  privateNoteIcon: {
    fontSize: 11,
    marginRight: 7,
  },

  privateNoteText: {
    flex: 1,
    fontSize: 9,
    lineHeight: 14,
    color: '#6B7280',
  },

  // ==========================================
  // PROFIT PREVIEW
  // ==========================================

  profitCard: {
    marginTop: 15,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },

  profitCardWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  profitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  profitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  profitIcon: {
    fontSize: 18,
  },

  profitLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.8,
  },

  profitAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#047857',
    marginTop: 2,
  },

  profitAmountWarning: {
    color: '#DC2626',
  },

  marginBox: {
    alignItems: 'flex-end',
  },

  marginLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.7,
  },

  marginText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },

  // ==========================================
  // SUMMARY
  // ==========================================

  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  summaryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },

  summaryLabel: {
    fontSize: 10,
    color: '#6B7280',
  },

  summaryValue: {
    maxWidth: '55%',
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },

  privateValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
  },

  // ==========================================
  // ADD BUTTON
  // ==========================================

  button: {
    height: 58,
    backgroundColor: '#111827',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 22,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '500',
    marginTop: -2,
  },

  buttonTextBox: {
    flex: 1,
    marginLeft: 11,
  },

  buttonSmall: {
    color: '#9CA3AF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },

  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '500',
  },

  footerText: {
    textAlign: 'center',
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 13,
    lineHeight: 14,
  },

});