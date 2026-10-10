import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';

const API_BASE_URL =
  'http://192.168.1.102:3000';

export default function SalesScreen({
  navigation,
  route,
  products = [],
}) {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);

  const [databaseProducts, setDatabaseProducts] =
    useState([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  // ==========================================
  // LOAD PRODUCTS FROM DATABASE
  // ==========================================

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await fetch(
        `${API_BASE_URL}/products`
      );

      if (!response.ok) {
        throw new Error(
          'Failed to load products'
        );
      }

      const data = await response.json();

      const formattedProducts = data.map(
        (product) => ({
          id: product.id,

          // IMPORTANT:
          // This is the real MySQL product ID
          databaseId: Number(product.id),

          barcode:
            product.productCode,

          productCode:
            product.productCode,

          name: product.name,

          price: Number(
            product.sellingPrice
          ),

          sellingPrice: Number(
            product.sellingPrice
          ),

          purchasePrice: Number(
            product.purchasePrice
          ),

          size: product.size || '',

          stock: Number(
            product.stock
          ),

          createdAt:
            product.createdAt,

          // Photo intentionally left alone
          image: null,
        })
      );

      setDatabaseProducts(
        formattedProducts
      );
    } catch (error) {
      console.log(
        'Sales Product Load Error:',
        error
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load when SalesScreen opens
  useEffect(() => {
    loadProducts();

    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          loadProducts();
        }
      );

    return unsubscribe;
  }, [navigation]);

  // ==========================================
  // MERGE PRODUCTS RETURNED BY BARCODE SCANNER
  // ==========================================

  useEffect(() => {
    const scannedProducts =
      route?.params?.scannedProducts;

    if (
      !Array.isArray(scannedProducts) ||
      scannedProducts.length === 0
    ) {
      return;
    }

    setCart((currentCart) => {
      let updatedCart = [...currentCart];

      scannedProducts.forEach(
        (scannedProduct) => {
          const productDatabaseId =
            Number(
              scannedProduct.databaseId ??
                scannedProduct.id
            );

          const stock = Number(
            scannedProduct.stock ?? 0
          );

          const scannedQuantity = Math.max(
            1,
            Number(
              scannedProduct.quantity ?? 1
            )
          );

          if (
            !Number.isFinite(productDatabaseId) ||
            stock <= 0
          ) {
            return;
          }

          const existingIndex =
            updatedCart.findIndex(
              (item) =>
                Number(
                  item.databaseId ?? item.id
                ) === productDatabaseId
            );

          if (existingIndex >= 0) {
            const existingItem =
              updatedCart[existingIndex];

            updatedCart[existingIndex] = {
              ...existingItem,
              ...scannedProduct,
              databaseId: productDatabaseId,
              quantity: Math.min(
                Number(existingItem.quantity) +
                  scannedQuantity,
                stock
              ),
            };
          } else {
            updatedCart.push({
              ...scannedProduct,
              databaseId: productDatabaseId,
              quantity: Math.min(
                scannedQuantity,
                stock
              ),
            });
          }
        }
      );

      return updatedCart;
    });

    navigation.setParams({
      scannedProducts: undefined,
      scanBatchId: undefined,
    });
  }, [
    route?.params?.scanBatchId,
    route?.params?.scannedProducts,
    navigation,
  ]);

  // ==========================================
  // USE DATABASE PRODUCTS
  // ==========================================

  const availableProducts =
    databaseProducts.length > 0 ||
    loadingProducts
      ? databaseProducts
      : products;

  // ==========================================
  // SEARCH PRODUCTS
  // ==========================================

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return availableProducts;
    }

    const keyword =
      search.toLowerCase().trim();

    return availableProducts.filter(
      (product) =>
        String(
          product.name || ''
        )
          .toLowerCase()
          .includes(keyword) ||

        String(
          product.id ?? ''
        )
          .toLowerCase()
          .includes(keyword) ||

        String(
          product.databaseId ?? ''
        )
          .toLowerCase()
          .includes(keyword) ||

        String(
          product.barcode || ''
        )
          .toLowerCase()
          .includes(keyword) ||

        String(
          product.productCode || ''
        )
          .toLowerCase()
          .includes(keyword)
    );
  }, [
    search,
    availableProducts,
  ]);

  // ==========================================
  // ADD PRODUCT TO CART
  // ==========================================

  const addToCart = (product) => {
    const productDatabaseId =
      Number(
        product.databaseId ??
          product.id
      );

    setCart((currentCart) => {
      const existingProduct =
        currentCart.find(
          (item) =>
            Number(
              item.databaseId
            ) === productDatabaseId
        );

      if (existingProduct) {
        return currentCart.map(
          (item) =>
            Number(
              item.databaseId
            ) === productDatabaseId
              ? {
                  ...item,
                  quantity:
                    Math.min(
                      item.quantity + 1,
                      Number(
                        product.stock
                      )
                    ),
                }
              : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,

          // IMPORTANT
          // Keep real DB ID inside cart
          databaseId:
            productDatabaseId,

          quantity: 1,
        },
      ];
    });
  };

  // ==========================================
  // INCREASE QUANTITY
  // ==========================================

  const increaseQuantity = (
    productDatabaseId
  ) => {
    setCart((currentCart) =>
      currentCart.map(
        (item) =>
          Number(
            item.databaseId
          ) ===
          Number(
            productDatabaseId
          )
            ? {
                ...item,
                quantity:
                  Math.min(
                    item.quantity + 1,
                    Number(
                      item.stock
                    )
                  ),
              }
            : item
      )
    );
  };

  // ==========================================
  // DECREASE QUANTITY
  // ==========================================

  const decreaseQuantity = (
    productDatabaseId
  ) => {
    setCart((currentCart) =>
      currentCart
        .map(
          (item) =>
            Number(
              item.databaseId
            ) ===
            Number(
              productDatabaseId
            )
              ? {
                  ...item,
                  quantity:
                    item.quantity - 1,
                }
              : item
        )
        .filter(
          (item) =>
            item.quantity > 0
        )
    );
  };

  // ==========================================
  // CART CALCULATIONS
  // ==========================================

  const totalItems =
    cart.reduce(
      (total, item) =>
        total +
        Number(item.quantity),
      0
    );

  const subtotal =
    cart.reduce(
      (total, item) =>
        total +
        Number(
          item.price ??
            item.sellingPrice ??
            0
        ) *
          Number(
            item.quantity
          ),
      0
    );

  // ==========================================
  // UI
  // ==========================================

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* HEADER */}

      <View style={styles.header}>

        <View>
          <Text
            style={styles.smallTitle}
          >
            SMARTPOS
          </Text>

          <Text
            style={styles.title}
          >
            New Sale
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.closeButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={styles.closeText}
          >
            ×
          </Text>
        </TouchableOpacity>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* GREETING CARD */}

        <View
          style={
            styles.greetingCard
          }
        >

          <View>

            <Text
              style={
                styles.greeting
              }
            >
              Ready for your next
              sale? 👋
            </Text>

            <Text
              style={
                styles.greetingSub
              }
            >
              Select a product to
              add it to the cart.
            </Text>

          </View>

          <View
            style={
              styles.cartBubble
            }
          >

            <Text
              style={
                styles.cartBubbleIcon
              }
            >
              🛒
            </Text>

            <Text
              style={
                styles.cartBubbleNumber
              }
            >
              {totalItems}
            </Text>

          </View>

        </View>

        {/* SEARCH */}

        <View
          style={
            styles.searchBox
          }
        >

          <Text
            style={
              styles.searchIcon
            }
          >
            🔍
          </Text>

          <TextInput
            style={
              styles.searchInput
            }
            placeholder="Search product or barcode"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={
              setSearch
            }
          />

          <TouchableOpacity
            style={
              styles.scanButton
            }
            onPress={() =>
              navigation.navigate(
                'BarcodeScanner'
              )
            }
          >
            <Text
              style={
                styles.scanIcon
              }
            >
              ▣
            </Text>
          </TouchableOpacity>

        </View>

        {/* SECTION HEADER */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <Text
            style={
              styles.sectionTitle
            }
          >
            Products
          </Text>

          <Text
            style={
              styles.productCount
            }
          >
            {loadingProducts
              ? 'Loading...'
              : `${filteredProducts.length} available`}
          </Text>

        </View>

        {/* LOADING */}

        {loadingProducts && (
          <View
            style={
              styles.loadingBox
            }
          >

            <ActivityIndicator
              size="small"
              color="#6366F1"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading products...
            </Text>

          </View>
        )}

        {/* PRODUCTS */}

        {!loadingProducts && (
          <View
            style={
              styles.productGrid
            }
          >

            {filteredProducts.map(
              (product) => {

                const cartItem =
                  cart.find(
                    (item) =>
                      Number(
                        item.databaseId
                      ) ===
                      Number(
                        product.databaseId
                      )
                  );

                return (
                  <View
                    key={
                      product.databaseId
                    }
                    style={
                      styles.productCard
                    }
                  >

                    {/* PRODUCT ICON */}

                    <View
                      style={
                        styles.productImage
                      }
                    >

                      <Text
                        style={
                          styles.productEmoji
                        }
                      >
                        👕
                      </Text>

                      {Number(
                        product.stock
                      ) <= 5 && (
                        <View
                          style={
                            styles.stockBadge
                          }
                        >
                          <Text
                            style={
                              styles.stockBadgeText
                            }
                          >
                            Low
                          </Text>
                        </View>
                      )}

                    </View>

                    {/* PRODUCT INFO */}

                    <Text
                      style={
                        styles.productName
                      }
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>

                    <Text
                      style={
                        styles.productCode
                      }
                    >
                      {product.productCode ||
                        product.barcode ||
                        product.databaseId}
                      {' • '}
                      Size {product.size}
                    </Text>

                    <View
                      style={
                        styles.productBottom
                      }
                    >

                      <View>

                        <Text
                          style={
                            styles.price
                          }
                        >
                          ৳
                          {Number(
                            product.price ??
                              product.sellingPrice ??
                              0
                          ).toLocaleString()}
                        </Text>

                        <Text
                          style={
                            styles.stock
                          }
                        >
                          {Number(
                            product.stock
                          )}{' '}
                          in stock
                        </Text>

                      </View>

                      {/* ADD BUTTON */}

                      <TouchableOpacity
                        style={[
                          styles.addButton,

                          Number(
                            product.stock
                          ) === 0 &&
                            styles.disabledButton,
                        ]}
                        disabled={
                          Number(
                            product.stock
                          ) === 0
                        }
                        onPress={() =>
                          addToCart(
                            product
                          )
                        }
                      >

                        <Text
                          style={
                            styles.addButtonText
                          }
                        >
                          {cartItem
                            ? `+ ${cartItem.quantity}`
                            : '+ Add'}
                        </Text>

                      </TouchableOpacity>

                    </View>

                  </View>
                );
              }
            )}

          </View>
        )}

        {/* EMPTY SEARCH */}

        {!loadingProducts &&
          filteredProducts.length ===
            0 && (
            <View
              style={
                styles.emptyState
              }
            >

              <Text
                style={
                  styles.emptyIcon
                }
              >
                🔎
              </Text>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                No products found
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Try another product name
                or barcode.
              </Text>

            </View>
          )}

      </ScrollView>

      {/* CART BAR */}

      {cart.length > 0 && (
        <View
          style={styles.cartBar}
        >

          <View
            style={
              styles.cartInfo
            }
          >

            <View
              style={
                styles.cartIconBox
              }
            >
              <Text
                style={
                  styles.cartIcon
                }
              >
                🛒
              </Text>
            </View>

            <View>

              <Text
                style={
                  styles.cartItems
                }
              >
                {totalItems} items
              </Text>

              <Text
                style={
                  styles.cartTotal
                }
              >
                ৳
                {subtotal.toLocaleString()}
              </Text>

            </View>

          </View>

          <TouchableOpacity
            style={
              styles.viewCartButton
            }
            onPress={() =>
              navigation.navigate(
                'Cart',
                {
                  cart: cart,
                }
              )
            }
          >

            <Text
              style={
                styles.viewCartText
              }
            >
              View Cart →
            </Text>

          </TouchableOpacity>

        </View>
      )}

    </SafeAreaView>
  );
}


// ==========================================
// STYLES
// ==========================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor:
        '#F5F7FB',
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 15,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      backgroundColor:
        '#FFFFFF',
    },

    smallTitle: {
      fontSize: 10,
      fontWeight: '800',
      color: '#6366F1',
      letterSpacing: 2,
    },

    title: {
      fontSize: 25,
      fontWeight: '900',
      color: '#111827',
      marginTop: 2,
    },

    closeButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        '#F3F4F6',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    closeText: {
      fontSize: 28,
      color: '#374151',
      lineHeight: 30,
    },

    content: {
      padding: 20,
      paddingBottom: 130,
    },

    greetingCard: {
      backgroundColor:
        '#111827',
      borderRadius: 22,
      padding: 20,
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },

    greeting: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '800',
    },

    greetingSub: {
      color: '#9CA3AF',
      fontSize: 12,
      marginTop: 6,
      maxWidth: 230,
    },

    cartBubble: {
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor:
        '#FFFFFF',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    cartBubbleIcon: {
      fontSize: 21,
    },

    cartBubbleNumber: {
      position: 'absolute',
      top: -5,
      right: -5,
      minWidth: 21,
      height: 21,
      borderRadius: 11,
      backgroundColor:
        '#6366F1',
      color: '#FFFFFF',
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '800',
      paddingTop: 3,
    },

    searchBox: {
      height: 58,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      paddingLeft: 16,
      paddingRight: 7,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 1,
      borderColor:
        '#E5E7EB',
    },

    searchIcon: {
      fontSize: 18,
      marginRight: 9,
    },

    searchInput: {
      flex: 1,
      fontSize: 14,
      color: '#111827',
    },

    scanButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor:
        '#111827',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    scanIcon: {
      color: '#FFFFFF',
      fontSize: 19,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      marginBottom: 13,
    },

    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: '#111827',
    },

    productCount: {
      fontSize: 11,
      color: '#6B7280',
      fontWeight: '600',
    },

    loadingBox: {
      alignItems: 'center',
      justifyContent:
        'center',
      paddingVertical: 50,
    },

    loadingText: {
      marginTop: 10,
      fontSize: 12,
      color: '#6B7280',
      fontWeight: '600',
    },

    productGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
    },

    productCard: {
      width: '48%',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 20,
      padding: 13,
      marginBottom: 14,
    },

    productImage: {
      height: 115,
      borderRadius: 16,
      backgroundColor:
        '#F3F4F6',
      justifyContent:
        'center',
      alignItems: 'center',
      marginBottom: 12,
      position: 'relative',
    },

    productEmoji: {
      fontSize: 47,
    },

    stockBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor:
        '#FEF3C7',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 8,
    },

    stockBadgeText: {
      color: '#92400E',
      fontSize: 9,
      fontWeight: '800',
    },

    productName: {
      fontSize: 14,
      fontWeight: '800',
      color: '#111827',
    },

    productCode: {
      fontSize: 10,
      color: '#9CA3AF',
      marginTop: 4,
    },

    productBottom: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-end',
      marginTop: 13,
    },

    price: {
      fontSize: 15,
      fontWeight: '900',
      color: '#111827',
    },

    stock: {
      fontSize: 9,
      color: '#6B7280',
      marginTop: 3,
    },

    addButton: {
      backgroundColor:
        '#111827',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },

    addButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    disabledButton: {
      backgroundColor:
        '#D1D5DB',
    },

    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },

    emptyIcon: {
      fontSize: 42,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#111827',
      marginTop: 12,
    },

    emptyText: {
      fontSize: 12,
      color: '#9CA3AF',
      marginTop: 5,
    },

    cartBar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 18,
      height: 72,
      borderRadius: 20,
      backgroundColor:
        '#111827',
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    cartInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    cartIconBox: {
      width: 47,
      height: 47,
      borderRadius: 15,
      backgroundColor:
        '#FFFFFF',
      justifyContent:
        'center',
      alignItems: 'center',
      marginRight: 10,
    },

    cartIcon: {
      fontSize: 20,
    },

    cartItems: {
      color: '#9CA3AF',
      fontSize: 11,
      fontWeight: '600',
    },

    cartTotal: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '900',
      marginTop: 2,
    },

    viewCartButton: {
      backgroundColor:
        '#6366F1',
      paddingHorizontal: 17,
      paddingVertical: 13,
      borderRadius: 13,
    },

    viewCartText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
    },

  });