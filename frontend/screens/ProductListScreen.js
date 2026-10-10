import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL = 'http://192.168.1.102:3000';

export default function ProductListScreen({ navigation, products = [] }) {
  const [search, setSearch] = useState('');
  const [databaseProducts, setDatabaseProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getStockStatus = (stock) => {
    const quantity = Number(stock);

    if (quantity === 0) {
      return {
        text: 'Out of Stock',
        color: '#DC2626',
        background: '#FEE2E2',
      };
    }

    if (quantity <= 5) {
      return {
        text: 'Low Stock',
        color: '#D97706',
        background: '#FEF3C7',
      };
    }

    return {
      text: 'In Stock',
      color: '#16A34A',
      background: '#DCFCE7',
    };
  };

  // Load products from MySQL through NestJS API
  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/products`);

      if (!response.ok) {
        throw new Error('Failed to load products');
      }

      const data = await response.json();

      const formattedProducts = data.map((product) => ({
        id: product.id,
        barcode: product.productCode,
        name: product.name,
        price: Number(product.sellingPrice),
        sellingPrice: Number(product.sellingPrice),
        purchasePrice: Number(product.purchasePrice),
        size: product.size || '',
        stock: Number(product.stock),
        image: null,
        createdAt: product.createdAt,
      }));

      setDatabaseProducts(formattedProducts);
    } catch (error) {
      console.log('Product Load Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load database products whenever this screen opens
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
    });

    loadProducts();

    return unsubscribe;
  }, [navigation]);

  // Database products are the main source
  // Fallback to existing local products if database is empty and loading is finished
  const displayedProducts =
    databaseProducts.length > 0 || loading
      ? databaseProducts
      : products;

  // Search by product name, ID or barcode
  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return displayedProducts;
    }

    return displayedProducts.filter((product) =>
      String(product.name || '')
        .toLowerCase()
        .includes(keyword) ||
      String(product.id || '')
        .toLowerCase()
        .includes(keyword) ||
      String(product.barcode || '')
        .toLowerCase()
        .includes(keyword) ||
      String(product.productCode || '')
        .toLowerCase()
        .includes(keyword)
    );
  }, [displayedProducts, search]);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Products
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('AddProduct')}
        >
          <Text style={styles.add}>＋ Add</Text>
        </TouchableOpacity>

      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryNumber}>
          {displayedProducts.length}
        </Text>

        <Text style={styles.summaryText}>
          Total Products
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>

        <Text style={styles.searchIcon}>
          🔎
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search product, code or barcode"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
          >
            <Text style={styles.clearButton}>
              ✕
            </Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Result Count */}
      {search.length > 0 && (
        <Text style={styles.resultText}>
          {filteredProducts.length} product
          {filteredProducts.length !== 1 ? 's' : ''} found
        </Text>
      )}

      {/* Loading */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator
            size="large"
            color="#4F46E5"
          />

          <Text style={styles.loadingText}>
            Loading products...
          </Text>
        </View>
      ) : (
        /* Product List */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >

          {filteredProducts.map((product) => {

            const stockStatus = getStockStatus(product.stock);

            return (
              <TouchableOpacity
                key={String(product.id)}
                style={styles.productCard}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    productId: product.id,
                  })
                }
                activeOpacity={0.7}
              >

                <View style={styles.productIcon}>
                  <Text style={styles.icon}>
                    👕
                  </Text>
                </View>

                <View style={styles.productInfo}>

                  <Text style={styles.productName}>
                    {product.name}
                  </Text>

                  <Text style={styles.productDetails}>
                    Size {product.size || 'N/A'} • ৳
                    {Number(product.price).toLocaleString()}
                  </Text>

                  <Text style={styles.productCode}>
                    Code: {product.barcode || product.id}
                  </Text>

                  {/* Stock Status */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          stockStatus.background,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: stockStatus.color,
                        },
                      ]}
                    >
                      {stockStatus.text}
                    </Text>
                  </View>

                </View>

                <View style={styles.stockContainer}>

                  <Text style={styles.stockNumber}>
                    {product.stock}
                  </Text>

                  <Text style={styles.stockLabel}>
                    Stock
                  </Text>

                </View>

              </TouchableOpacity>
            );
          })}

          {/* No Search Result */}
          {filteredProducts.length === 0 && (
            <View style={styles.emptyState}>

              <Text style={styles.emptyIcon}>
                🔍
              </Text>

              <Text style={styles.emptyTitle}>
                No products found
              </Text>

              <Text style={styles.emptyText}>
                Try searching with another product name,
                code or barcode.
              </Text>

            </View>
          )}

        </ScrollView>
      )}

      {/* Add Product Button */}
      <TouchableOpacity
        style={styles.bottomButton}
        onPress={() => navigation.navigate('AddProduct')}
      >
        <Text style={styles.bottomButtonText}>
          + Add New Product
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  back: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
  },

  add: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },

  summary: {
    marginHorizontal: 20,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },

  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  summaryText: {
    fontSize: 13,
    color: '#D1D5DB',
    marginTop: 3,
  },

  searchContainer: {
    marginHorizontal: 20,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },

  clearButton: {
    fontSize: 16,
    color: '#6B7280',
    paddingLeft: 8,
  },

  resultText: {
    marginHorizontal: 20,
    marginBottom: 5,
    fontSize: 12,
    color: '#6B7280',
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  productIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  icon: {
    fontSize: 25,
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  productDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },

  productCode: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 7,
  },

  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },

  stockContainer: {
    alignItems: 'center',
    marginLeft: 8,
  },

  stockNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  stockLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },

  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 50,
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },

  bottomButton: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 25,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});