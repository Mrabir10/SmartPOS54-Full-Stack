import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

const API_BASE_URL = 'http://192.168.1.102:3000';

export default function ProductPhotoScannerScreen({
  navigation,
}) {
  const [photo, setPhoto] = useState(null);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confidence, setConfidence] = useState(null);

  const takePhoto = async () => {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required.'
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

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const imageUri = asset.uri;

    if (!asset.base64) {
      Alert.alert(
        'Photo Error',
        'Could not prepare the captured photo. Please try again.'
      );
      return;
    }

    const mimeType =
      asset.mimeType || 'image/jpeg';

    const imageData =
      `data:${mimeType};base64,${asset.base64}`;

    setPhoto(imageUri);
    setMatchedProduct(null);
    setConfidence(null);
    setSearching(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products/identify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageData,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Could not identify product.'
        );
      }

      if (!data?.matched || !data?.product) {
        setMatchedProduct(null);
        setConfidence(
          Number(data?.confidence || 0)
        );

        Alert.alert(
          'Product Not Found',
          data?.message ||
            'No sufficiently similar saved product photo was found. Try again with a clear photo and similar framing.'
        );

        return;
      }

      const product = data.product;

      const formattedProduct = {
        id: product.id,
        databaseId: Number(product.id),
        barcode: product.productCode,
        productCode: product.productCode,
        name: product.name,
        price: Number(product.sellingPrice),
        sellingPrice: Number(product.sellingPrice),
        purchasePrice: Number(product.purchasePrice),
        size: product.size || '',
        stock: Number(product.stock),
        image: product.imageData || null,
        createdAt: product.createdAt,
      };

      setMatchedProduct(formattedProduct);
      setConfidence(
        Number(data.confidence || 0)
      );
    } catch (error) {
      console.log(
        'Identify Product Error:',
        error
      );

      setMatchedProduct(null);
      setConfidence(null);

      Alert.alert(
        'Identify Failed',
        error?.message ||
          'Could not connect to the SmartPOS backend.'
      );
    } finally {
      setSearching(false);
    }
  };

  const resetScanner = () => {
    setPhoto(null);
    setMatchedProduct(null);
    setSearching(false);
    setConfidence(null);
  };

  const handleAddToCart = () => {
    if (!matchedProduct) {
      return;
    }

    if (matchedProduct.stock <= 0) {
      Alert.alert(
        'Out of Stock',
        `${matchedProduct.name} is currently out of stock.`
      );
      return;
    }

    navigation.navigate('Sales', {
      scannedProducts: [
        {
          ...matchedProduct,
          quantity: 1,
        },
      ],
      scanBatchId: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* HEADER */}
        <View style={styles.header}>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.back}>
              ‹ Back
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Identify Product
          </Text>

          <View style={{ width: 50 }} />

        </View>


        {/* CAMERA / PHOTO AREA */}
        <View style={styles.cameraCard}>

          {photo ? (
            <>
              <Image
                source={{ uri: photo }}
                style={styles.preview}
              />

              <Text style={styles.previewText}>
                Product photo captured
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.cameraIcon}>
                📷
              </Text>

              <Text style={styles.cameraTitle}>
                Identify Product by Photo
              </Text>

              <Text style={styles.cameraDescription}>
                Take a photo of a product to identify
                it from saved reference photos.
              </Text>
            </>
          )}

        </View>


        {/* TAKE PHOTO BUTTON */}
        {!photo && (
          <TouchableOpacity
            style={styles.photoButton}
            onPress={takePhoto}
          >
            <Text style={styles.photoButtonText}>
              📷  Take Product Photo
            </Text>
          </TouchableOpacity>
        )}


        {/* SEARCHING */}
        {photo && searching && (
          <View style={styles.resultCard}>

            <ActivityIndicator
              size="large"
              color="#4F46E5"
            />

            <Text style={styles.resultTitle}>
              Searching Product...
            </Text>

            <Text style={styles.resultText}>
              Checking saved product reference
              photos.
            </Text>

          </View>
        )}


        {/* NO MATCH */}
        {photo &&
          !searching &&
          !matchedProduct && (
            <View style={styles.resultCard}>

              <Text style={styles.noMatchTitle}>
                Product Not Found
              </Text>

              <Text style={styles.resultText}>
                No matching product was found.
                Please take another clear photo.
              </Text>

            </View>
          )}


        {/* MATCHED PRODUCT */}
        {matchedProduct && !searching && (
          <View style={styles.productCard}>

            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>
                ✓ Product Found
              </Text>
            </View>

            {/* PRODUCT IMAGE */}
            {matchedProduct.image && (
              <Image
                source={{
                  uri: matchedProduct.image,
                }}
                style={styles.referenceImage}
              />
            )}

            <Text style={styles.productName}>
              {matchedProduct.name}
            </Text>

            {confidence !== null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>
                  Match Confidence
                </Text>

                <Text style={styles.infoValue}>
                  {confidence}%
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Product ID
              </Text>

              <Text style={styles.infoValue}>
                {matchedProduct.id}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Price
              </Text>

              <Text style={styles.priceValue}>
                ৳{Number(
                  matchedProduct.price || 0
                ).toLocaleString()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Stock
              </Text>

              <Text
                style={[
                  styles.infoValue,
                  matchedProduct.stock <= 0 &&
                    styles.outOfStock,
                ]}
              >
                {matchedProduct.stock}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.addButton,
                matchedProduct.stock <= 0 &&
                  styles.disabledButton,
              ]}
              onPress={handleAddToCart}
              disabled={matchedProduct.stock <= 0}
            >
              <Text style={styles.addButtonText}>
                {matchedProduct.stock <= 0
                  ? 'Out of Stock'
                  : 'Add to Cart'}
              </Text>
            </TouchableOpacity>

          </View>
        )}


        {/* RETAKE */}
        {photo && (
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={resetScanner}
          >
            <Text style={styles.retakeText}>
              🔄  Take Another Photo
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
  },

  back: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  cameraCard: {
    height: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflow: 'hidden',
  },

  cameraIcon: {
    fontSize: 55,
    marginBottom: 15,
  },

  cameraTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  cameraDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },

  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  previewText: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    fontWeight: '700',
  },

  photoButton: {
    height: 55,
    backgroundColor: '#111827',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  photoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    marginTop: 20,
    alignItems: 'center',
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
    textAlign: 'center',
  },

  resultText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 20,
    textAlign: 'center',
  },

  noMatchTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
    textAlign: 'center',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
  },

  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 15,
  },

  successBadgeText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },

  referenceImage: {
    width: '100%',
    height: 180,
    borderRadius: 15,
    resizeMode: 'cover',
    marginBottom: 18,
  },

  productName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 15,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },

  infoValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },

  priceValue: {
    fontSize: 17,
    color: '#111827',
    fontWeight: '800',
  },

  outOfStock: {
    color: '#DC2626',
  },

  addButton: {
    height: 52,
    backgroundColor: '#111827',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  disabledButton: {
    backgroundColor: '#9CA3AF',
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  retakeButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },

  retakeText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },

});