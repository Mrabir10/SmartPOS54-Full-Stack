import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

import { CameraView, useCameraPermissions } from 'expo-camera';

const API_BASE_URL = 'http://192.168.1.102:3000';

const formatProduct = (product) => ({
  id: product.id,
  databaseId: Number(product.id),
  barcode: String(product.productCode ?? '').trim(),
  productCode: String(product.productCode ?? '').trim(),
  name: product.name,
  price: Number(product.sellingPrice),
  sellingPrice: Number(product.sellingPrice),
  purchasePrice: Number(product.purchasePrice),
  size: product.size || '',
  stock: Number(product.stock),
  createdAt: product.createdAt,
  image: null,
});

const normalizeBarcode = (value) =>
  String(value ?? '').trim();

export default function BarcodeScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedProducts, setScannedProducts] = useState([]);
  const [databaseProducts, setDatabaseProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [scanStatus, setScanStatus] = useState('idle');

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setLoadError('');

      const response = await fetch(`${API_BASE_URL}/products`);

      if (!response.ok) {
        throw new Error('Could not load products from the server.');
      }

      const data = await response.json();
      const formattedProducts = Array.isArray(data)
        ? data.map(formatProduct)
        : [];

      setDatabaseProducts(formattedProducts);
    } catch (error) {
      console.log('Barcode product load error:', error);
      setLoadError(
        'Could not connect to the SmartPOS backend. Check that the backend is running and the API IP address is correct.'
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const findProductByBarcode = (data, type) => {
    const scannedCode = normalizeBarcode(data);

    let found = databaseProducts.find(
      (product) =>
        normalizeBarcode(product.productCode) === scannedCode ||
        normalizeBarcode(product.barcode) === scannedCode
    );

    // On some devices UPC-A can be reported as EAN-13 with a leading zero.
    if (!found && type === 'ean13' && scannedCode.startsWith('0')) {
      const withoutLeadingZero = scannedCode.slice(1);

      found = databaseProducts.find(
        (product) =>
          normalizeBarcode(product.productCode) === withoutLeadingZero ||
          normalizeBarcode(product.barcode) === withoutLeadingZero
      );
    }

    return found;
  };

  const handleBarcodeScan = ({ data, type }) => {
    if (scanned || loadingProducts) {
      return;
    }

    setScanned(true);

    const scannedCode = normalizeBarcode(data);

    console.log('Barcode:', scannedCode);
    console.log('Type:', type);

    const foundProduct = findProductByBarcode(scannedCode, type);

    if (!foundProduct) {
      setScanStatus('error');
      setScanMessage(`Product not found for barcode: ${scannedCode}`);
      return;
    }

    if (Number(foundProduct.stock) <= 0) {
      setScanStatus('error');
      setScanMessage(`${foundProduct.name} is out of stock.`);
      return;
    }

    const productDatabaseId = Number(
      foundProduct.databaseId ?? foundProduct.id
    );

    const alreadyScannedProduct = scannedProducts.find(
      (item) =>
        Number(item.databaseId ?? item.id) === productDatabaseId
    );

    if (
      alreadyScannedProduct &&
      Number(alreadyScannedProduct.quantity) >=
        Number(foundProduct.stock)
    ) {
      setScanStatus('error');
      setScanMessage(
        `Stock limit reached for ${foundProduct.name}.`
      );
      return;
    }

    setScannedProducts((currentProducts) => {
      const existingProduct = currentProducts.find(
        (item) =>
          Number(item.databaseId ?? item.id) === productDatabaseId
      );

      if (existingProduct) {
        return currentProducts.map((item) =>
          Number(item.databaseId ?? item.id) === productDatabaseId
            ? {
                ...item,
                quantity: Math.min(
                  Number(item.quantity) + 1,
                  Number(foundProduct.stock)
                ),
              }
            : item
        );
      }

      return [
        ...currentProducts,
        {
          ...foundProduct,
          quantity: 1,
        },
      ];
    });

    setScanStatus('success');
    setScanMessage(
      `${foundProduct.name} added. Barcode: ${scannedCode}`
    );
  };

  const totalItems = scannedProducts.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  const scanNextProduct = () => {
    setScanMessage('');
    setScanStatus('idle');
    setScanned(false);
  };

  const doneScanning = () => {
    const params = {
      scannedProducts,
      scanBatchId: Date.now(),
    };

    if (typeof navigation.popTo === 'function') {
      navigation.popTo('Sales', params);
      return;
    }

    navigation.navigate('Sales', params);
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>

          <Text style={styles.permissionTitle}>
            Camera Permission Required
          </Text>

          <Text style={styles.permissionText}>
            SmartPOS needs camera access to scan product barcodes.
          </Text>

          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>
              Allow Camera
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Scan Products</Text>

        <View style={styles.headerCart}>
          <Text style={styles.headerCartText}>🛒 {totalItems}</Text>
        </View>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'code128',
              'code39',
              'code93',
              'itf14',
              'codabar',
              'qr',
            ],
          }}
          onBarcodeScanned={
            scanned || loadingProducts || loadError
              ? undefined
              : handleBarcodeScan
          }
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />

            <Text style={styles.scanText}>
              Place barcode inside the frame
            </Text>
          </View>
        </CameraView>
      </View>

      <View style={styles.bottomContainer}>
        <Text style={styles.instructionTitle}>Scan Product Barcode</Text>

        {loadingProducts ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#6366F1" />
            <Text style={styles.instructionText}>
              Loading products from database...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadProducts}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.instructionText}>
            Scan products one by one. The scanner matches the camera
            barcode with the productCode saved in MySQL.
          </Text>
        )}

        {!!scanMessage && (
          <View
            style={[
              styles.scanResult,
              scanStatus === 'success'
                ? styles.scanResultSuccess
                : styles.scanResultError,
            ]}
          >
            <Text
              style={[
                styles.scanResultText,
                scanStatus === 'success'
                  ? styles.scanResultTextSuccess
                  : styles.scanResultTextError,
              ]}
            >
              {scanMessage}
            </Text>
          </View>
        )}

        {scannedProducts.length > 0 && (
          <View style={styles.scannedInfo}>
            <Text style={styles.scannedInfoTitle}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} scanned
            </Text>

            {scannedProducts.map((item) => (
              <Text
                key={String(item.databaseId ?? item.id)}
                style={styles.scannedProduct}
              >
                • {item.name} × {item.quantity}
              </Text>
            ))}
          </View>
        )}

        {scanned && !loadingProducts && !loadError && (
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={scanNextProduct}
          >
            <Text style={styles.scanAgainText}>Scan Next Product</Text>
          </TouchableOpacity>
        )}

        {scannedProducts.length > 0 && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={doneScanning}
          >
            <Text style={styles.doneButtonText}>
              Done — View Cart ({totalItems})
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
    color: '#666666',
  },

  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  permissionIcon: {
    fontSize: 50,
    marginBottom: 20,
  },

  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 10,
    textAlign: 'center',
  },

  permissionText: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },

  permissionButton: {
    width: '100%',
    backgroundColor: '#111111',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },

  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  backButton: {
    marginTop: 15,
    paddingVertical: 10,
  },

  backButtonText: {
    color: '#555555',
    fontSize: 15,
    fontWeight: '600',
  },

  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  backIcon: {
    fontSize: 34,
    color: '#111111',
    lineHeight: 34,
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111111',
  },

  headerCart: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  headerCartText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111111',
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scanFrame: {
    width: 280,
    height: 160,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 16,
  },

  scanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  bottomContainer: {
    paddingHorizontal: 22,
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
  },

  instructionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 5,
  },

  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#777777',
    lineHeight: 20,
  },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  errorBox: {
    marginTop: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 18,
  },

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
    backgroundColor: '#111111',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  scanResult: {
    marginTop: 12,
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
  },

  scanResultSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },

  scanResultError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },

  scanResultText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  scanResultTextSuccess: {
    color: '#047857',
  },

  scanResultTextError: {
    color: '#B91C1C',
  },

  scannedInfo: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
  },

  scannedInfoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 5,
  },

  scannedProduct: {
    fontSize: 12,
    color: '#555555',
    marginTop: 3,
  },

  scanAgainButton: {
    marginTop: 12,
    backgroundColor: '#111111',
    paddingVertical: 13,
    borderRadius: 11,
    alignItems: 'center',
  },

  scanAgainText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  doneButton: {
    marginTop: 10,
    backgroundColor: '#6366F1',
    paddingVertical: 13,
    borderRadius: 11,
    alignItems: 'center',
  },

  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
