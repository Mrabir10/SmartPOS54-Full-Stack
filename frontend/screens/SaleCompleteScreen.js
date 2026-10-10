import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';

export default function SaleCompleteScreen({
  navigation,
  route,
}) {
  const {
    cart = [],
    subtotal = 0,
    discountAmount = 0,
    grandTotal = 0,
    paymentMethod = 'Cash',
    paidAmount = grandTotal,
    changeAmount = 0,
    saleNumber = '#SP0000',
  } = route.params || {};

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* Success Icon */}
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>

        {/* Success Message */}
        <Text style={styles.successTitle}>
          Payment Successful
        </Text>

        <Text style={styles.successSubtitle}>
          Your sale has been completed successfully.
        </Text>

        {/* Sale ID */}
        <View style={styles.saleIdCard}>
          <Text style={styles.saleIdLabel}>
            SALE ID
          </Text>

          <Text style={styles.saleId}>
            {saleNumber}
          </Text>

          <Text style={styles.saleIdSub}>
            {totalItems} items • {paymentMethod}
          </Text>
        </View>

        {/* Order Details */}
        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Order Details
          </Text>

          {cart.map((item, index) => (
            <View
              key={`${item.id}-${index}`}
              style={styles.itemRow}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.name}
                </Text>

                <Text style={styles.itemSub}>
                  {item.size
                    ? `Size ${item.size} • `
                    : ''}
                  Qty {item.quantity}
                </Text>
              </View>

              <Text style={styles.itemPrice}>
                ৳
                {(
                  Number(item.price) *
                  item.quantity
                ).toLocaleString()}
              </Text>
            </View>
          ))}

        </View>

        {/* Payment Summary */}
        <View style={styles.card}>

          <Text style={styles.cardTitle}>
            Payment Summary
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              ৳{Number(subtotal).toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Discount
            </Text>

            <Text style={styles.discountValue}>
              − ৳
              {Number(
                discountAmount
              ).toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ৳{Number(grandTotal).toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Payment Method
            </Text>

            <Text style={styles.summaryValue}>
              {paymentMethod}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Paid Amount
            </Text>

            <Text style={styles.summaryValue}>
              ৳
              {Number(
                paidAmount
              ).toLocaleString()}
            </Text>
          </View>

          {paymentMethod === 'Cash' && (
            <View style={styles.changeRow}>

              <Text style={styles.changeLabel}>
                Change
              </Text>

              <Text style={styles.changeValue}>
                ৳
                {Number(
                  changeAmount
                ).toLocaleString()}
              </Text>

            </View>
          )}

        </View>

        {/* Success Footer */}
        <View style={styles.footerCard}>

          <Text style={styles.footerIcon}>
            ✓
          </Text>

          <View style={styles.footerTextBox}>
            <Text style={styles.footerTitle}>
              Sale Recorded
            </Text>

            <Text style={styles.footerSubtitle}>
              This transaction has been added
              to Sales History.
            </Text>
          </View>

        </View>

        {/* View Receipt */}
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() =>
            navigation.navigate('Receipt', {
              saleNumber: saleNumber,
              cart: cart,
              subtotal: subtotal,
              discountAmount: discountAmount,
              grandTotal: grandTotal,
              paymentMethod: paymentMethod,
              paidAmount: paidAmount,
              changeAmount: changeAmount,
            })
          }
        >
          <Text style={styles.receiptButtonText}>
            View Receipt
          </Text>
        </TouchableOpacity>

        {/* New Sale */}
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={() =>
            navigation.navigate('Sales')
          }
        >
          <Text style={styles.newSaleButtonText}>
            + New Sale
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

  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },

  successCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    marginBottom: 18,
  },

  successIcon: {
    fontSize: 42,
    fontWeight: '900',
    color: '#16A34A',
  },

  successTitle: {
    fontSize: 27,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },

  successSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 7,
    textAlign: 'center',
  },

  saleIdCard: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 20,
    marginTop: 25,
    alignItems: 'center',
  },

  saleIdLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  saleId: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },

  saleIdSub: {
    color: '#D1D5DB',
    fontSize: 11,
    marginTop: 6,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginTop: 16,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 15,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  itemInfo: {
    flex: 1,
    paddingRight: 10,
  },

  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  itemSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },

  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },

  discountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  totalValue: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
  },

  changeRow: {
    backgroundColor: '#ECFDF5',
    borderRadius: 13,
    padding: 12,
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  changeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },

  changeValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },

  footerCard: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 15,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#D1FAE5',
    color: '#059669',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    paddingTop: 6,
    marginRight: 12,
  },

  footerTextBox: {
    flex: 1,
  },

  footerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },

  footerSubtitle: {
    fontSize: 10,
    color: '#047857',
    marginTop: 3,
    lineHeight: 15,
  },

  receiptButton: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 17,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },

  receiptButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  newSaleButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 17,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },

  newSaleButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
});