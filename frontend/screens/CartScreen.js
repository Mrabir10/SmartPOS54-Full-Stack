import React, { useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
} from 'react-native';

export default function CartScreen({
  navigation,
  route,
}) {
  const [cart, setCart] = useState(
    route.params?.cart || []
  );

  const [discount, setDiscount] = useState('0');

  // ==========================================
  // DATABASE PRODUCT ID
  // ==========================================

  const getDatabaseId = (item) => {
    const id =
      item?.databaseId ??
      item?.id;

    const numericId = Number(id);

    return Number.isFinite(numericId)
      ? numericId
      : null;
  };

  // ==========================================
  // INCREASE QUANTITY
  // ==========================================

  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        const itemDatabaseId =
          getDatabaseId(item);

        return itemDatabaseId === productId
          ? {
              ...item,
              databaseId: itemDatabaseId,
              quantity: Math.min(
                Number(item.quantity) + 1,
                Number(item.stock)
              ),
            }
          : item;
      })
    );
  };

  // ==========================================
  // DECREASE QUANTITY
  // ==========================================

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          const itemDatabaseId =
            getDatabaseId(item);

          return itemDatabaseId === productId
            ? {
                ...item,
                databaseId: itemDatabaseId,
                quantity:
                  Number(item.quantity) - 1,
              }
            : item;
        })
        .filter(
          (item) =>
            Number(item.quantity) > 0
        )
    );
  };

  // ==========================================
  // REMOVE PRODUCT
  // ==========================================

  const removeProduct = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) =>
          getDatabaseId(item) !== productId
      )
    );
  };

  // ==========================================
  // CALCULATIONS
  // ==========================================

  const totalItems = cart.reduce(
    (total, item) =>
      total + Number(item.quantity),
    0
  );

  const subtotal = cart.reduce(
    (total, item) =>
      total +
      Number(item.price) *
        Number(item.quantity),
    0
  );

  const discountAmount = Math.min(
    Number(discount) || 0,
    subtotal
  );

  const grandTotal =
    subtotal - discountAmount;

  // ==========================================
  // EMPTY CART
  // ==========================================

  if (cart.length === 0) {
    return (
      <SafeAreaView style={styles.container}>

        <View style={styles.emptyContainer}>

          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIcon}>
              🛒
            </Text>
          </View>

          <Text style={styles.emptyTitle}>
            Your cart is empty
          </Text>

          <Text style={styles.emptyText}>
            Add products to start a new sale.
          </Text>

          <TouchableOpacity
            style={styles.browseButton}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text style={styles.browseText}>
              Browse Products
            </Text>
          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerSmall}>
            SMARTPOS
          </Text>

          <Text style={styles.headerTitle}>
            Your Cart
          </Text>
        </View>

        <View style={styles.itemBadge}>
          <Text style={styles.itemBadgeText}>
            {totalItems}
          </Text>
        </View>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >

        {/* CART TITLE */}

        <View style={styles.sectionHeader}>

          <View>
            <Text style={styles.sectionTitle}>
              Order Items
            </Text>

            <Text style={styles.sectionSub}>
              {totalItems} items selected
            </Text>
          </View>

          <Text style={styles.currency}>
            BDT
          </Text>

        </View>

        {/* CART ITEMS */}

        {cart.map((item) => {

          const databaseId =
            getDatabaseId(item);

          return (
            <View
              key={
                databaseId ??
                String(item.id)
              }
              style={styles.cartCard}
            >

              <View style={styles.itemTop}>

                <View style={styles.productImage}>
                  <Text
                    style={
                      styles.productEmoji
                    }
                  >
                    👕
                  </Text>
                </View>

                <View style={styles.productInfo}>

                  <Text
                    style={
                      styles.productName
                    }
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={
                      styles.productCode
                    }
                  >
                    {item.productCode ||
                      item.barcode ||
                      databaseId}{' '}
                    • Size {item.size}
                  </Text>

                  <Text
                    style={
                      styles.productPrice
                    }
                  >
                    ৳
                    {Number(
                      item.price ??
                        item.sellingPrice
                    ).toLocaleString()}
                  </Text>

                </View>

                <TouchableOpacity
                  style={
                    styles.removeButton
                  }
                  onPress={() =>
                    removeProduct(
                      databaseId
                    )
                  }
                >
                  <Text
                    style={styles.removeText}
                  >
                    ×
                  </Text>
                </TouchableOpacity>

              </View>

              {/* QUANTITY */}

              <View
                style={styles.quantityRow}
              >

                <Text
                  style={
                    styles.quantityLabel
                  }
                >
                  Quantity
                </Text>

                <View
                  style={
                    styles.quantityControl
                  }
                >

                  <TouchableOpacity
                    style={
                      styles.quantityButton
                    }
                    onPress={() =>
                      decreaseQuantity(
                        databaseId
                      )
                    }
                  >
                    <Text
                      style={
                        styles.quantityButtonText
                      }
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={styles.quantity}
                  >
                    {item.quantity}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.quantityButton
                    }
                    onPress={() =>
                      increaseQuantity(
                        databaseId
                      )
                    }
                  >
                    <Text
                      style={
                        styles.quantityButtonText
                      }
                    >
                      +
                    </Text>
                  </TouchableOpacity>

                </View>

                <Text
                  style={styles.itemTotal}
                >
                  ৳
                  {(
                    Number(
                      item.price ??
                        item.sellingPrice
                    ) *
                    Number(item.quantity)
                  ).toLocaleString()}
                </Text>

              </View>

            </View>
          );
        })}

        {/* DISCOUNT */}

        <View style={styles.discountCard}>

          <View style={styles.discountIconBox}>
            <Text
              style={styles.discountIcon}
            >
              %
            </Text>
          </View>

          <View style={styles.discountInfo}>

            <Text
              style={styles.discountTitle}
            >
              Add Discount
            </Text>

            <Text
              style={styles.discountSub}
            >
              Apply discount to this order
            </Text>

          </View>

          <View
            style={styles.discountInputBox}
          >

            <Text style={styles.taka}>
              ৳
            </Text>

            <TextInput
              style={styles.discountInput}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />

          </View>

        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>

          <Text style={styles.summaryTitle}>
            Order Summary
          </Text>

          <View style={styles.summaryRow}>

            <Text
              style={styles.summaryLabel}
            >
              Subtotal
            </Text>

            <Text
              style={styles.summaryValue}
            >
              ৳
              {subtotal.toLocaleString()}
            </Text>

          </View>

          <View style={styles.summaryRow}>

            <Text
              style={styles.summaryLabel}
            >
              Discount
            </Text>

            <Text
              style={styles.discountValue}
            >
              − ৳
              {discountAmount.toLocaleString()}
            </Text>

          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>

            <View>

              <Text
                style={styles.totalLabel}
              >
                Total
              </Text>

              <Text
                style={styles.totalSub}
              >
                {totalItems} items
              </Text>

            </View>

            <Text
              style={styles.totalValue}
            >
              ৳
              {grandTotal.toLocaleString()}
            </Text>

          </View>

        </View>

        {/* PAYMENT BUTTON */}

        <TouchableOpacity
          style={styles.paymentButton}
          onPress={() => {

            // ====================================
            // MAKE SURE EVERY ITEM HAS DATABASE ID
            // ====================================

            const safeCart = cart.map(
              (item) => ({
                ...item,
                databaseId:
                  getDatabaseId(item),
              })
            );

            // ====================================
            // DEBUG CHECK
            // ====================================

            console.log(
              'CART → PAYMENT:',
              safeCart.map((item) => ({
                name: item.name,
                id: item.id,
                databaseId:
                  item.databaseId,
                quantity:
                  item.quantity,
              }))
            );

            navigation.navigate(
              'Payment',
              {
                cart: safeCart,
                subtotal: subtotal,
                discountAmount:
                  discountAmount,
                grandTotal: grandTotal,
              }
            );
          }}
        >

          <View>

            <Text
              style={styles.paymentSmall}
            >
              PROCEED TO
            </Text>

            <Text
              style={styles.paymentText}
            >
              Payment →
            </Text>

          </View>

          <Text
            style={styles.paymentAmount}
          >
            ৳
            {grandTotal.toLocaleString()}
          </Text>

        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  header: {
    height: 78,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  backText: {
    fontSize: 29,
    color: '#111827',
    marginTop: -3,
  },

  headerSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 2,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },

  itemBadge: {
    marginLeft: 'auto',
    minWidth: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },

  itemBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },

  currency: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },

  cartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    marginBottom: 12,
  },

  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productImage: {
    width: 62,
    height: 62,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  productEmoji: {
    fontSize: 29,
  },

  productInfo: {
    flex: 1,
    marginLeft: 12,
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

  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 6,
  },

  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  removeText: {
    color: '#DC2626',
    fontSize: 22,
    lineHeight: 22,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },

  quantityLabel: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 11,
    padding: 3,
  },

  quantityButton: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quantityButtonText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },

  quantity: {
    width: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  itemTotal: {
    width: 75,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  discountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 15,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  discountIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  discountIcon: {
    fontSize: 19,
    fontWeight: '900',
    color: '#6366F1',
  },

  discountInfo: {
    flex: 1,
    marginLeft: 11,
  },

  discountTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  discountSub: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 3,
  },

  discountInputBox: {
    width: 76,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
  },

  taka: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  discountInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    paddingLeft: 4,
    textAlign: 'right',
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 19,
    marginTop: 15,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  discountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 5,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 9,
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  totalSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  paymentButton: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 18,
    minHeight: 68,
    paddingHorizontal: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  paymentSmall: {
    color: '#9CA3AF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  paymentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3,
  },

  paymentAmount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  emptyIconBox: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyIcon: {
    fontSize: 42,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
  },

  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 7,
    textAlign: 'center',
  },

  browseButton: {
    marginTop: 22,
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 13,
  },

  browseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

});