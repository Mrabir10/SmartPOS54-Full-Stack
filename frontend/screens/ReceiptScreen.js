import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function ReceiptScreen({
  route,
  navigation,
}) {
  const {
    saleNumber = '#SP0000',
    cart = [],
    subtotal = 0,
    grandTotal = 0,
    paymentMethod = 'Cash',
    paidAmount = 0,
    changeAmount = 0,
    discountAmount = 0,
  } = route.params || {};

  const now = new Date();

  const dateText = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timeText = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Receipt
        </Text>

        <View style={{ width: 42 }} />

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* Receipt Card */}
        <View style={styles.receiptCard}>

          {/* Store Header */}
          <View style={styles.storeSection}>

            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>
                S
              </Text>
            </View>

            <Text style={styles.storeName}>
              SmartPOS
            </Text>

            <Text style={styles.storeSubtitle}>
              Sales & Inventory Management
            </Text>

            <View style={styles.successBadge}>
              <Text style={styles.successText}>
                ✓ PAYMENT SUCCESSFUL
              </Text>
            </View>

          </View>

          {/* Sale Information */}
          <View style={styles.infoBox}>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Sale ID
              </Text>

              <Text style={styles.infoValue}>
                {saleNumber}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Date
              </Text>

              <Text style={styles.infoValue}>
                {dateText}
              </Text>
            </View>

            <View
              style={[
                styles.infoRow,
                styles.infoRowLast,
              ]}
            >
              <Text style={styles.infoLabel}>
                Time
              </Text>

              <Text style={styles.infoValue}>
                {timeText}
              </Text>
            </View>

          </View>

          {/* Items */}
          <Text style={styles.sectionTitle}>
            Items
          </Text>

          {cart.map((item, index) => (
            <View
              style={styles.itemRow}
              key={`${item.id}-${index}`}
            >

              <View style={styles.itemLeft}>

                <Text style={styles.itemName}>
                  {item.name}
                </Text>

                <Text style={styles.itemMeta}>
                  {item.size
                    ? `Size ${item.size}  •  `
                    : ''}
                  {item.quantity} × ৳
                  {Number(
                    item.price
                  ).toLocaleString()}
                </Text>

              </View>

              <Text style={styles.itemPrice}>
                ৳
                {(
                  Number(item.price) *
                  Number(item.quantity)
                ).toLocaleString()}
              </Text>

            </View>
          ))}

          {/* Summary */}
          <View style={styles.divider} />

          <View style={styles.summaryRow}>

            <Text style={styles.summaryLabel}>
              Subtotal
            </Text>

            <Text style={styles.summaryValue}>
              ৳
              {Number(
                subtotal
              ).toLocaleString()}
            </Text>

          </View>

          <View style={styles.summaryRow}>

            <Text style={styles.summaryLabel}>
              Discount
            </Text>

            <Text style={styles.discountValue}>
              - ৳
              {Number(
                discountAmount
              ).toLocaleString()}
            </Text>

          </View>

          <View style={styles.totalBox}>

            <Text style={styles.totalLabel}>
              Total
            </Text>

            <Text style={styles.totalValue}>
              ৳
              {Number(
                grandTotal
              ).toLocaleString()}
            </Text>

          </View>

          {/* Payment Details */}
          <Text style={styles.sectionTitle}>
            Payment Details
          </Text>

          <View style={styles.paymentBox}>

            <View style={styles.summaryRow}>

              <Text style={styles.summaryLabel}>
                Payment Method
              </Text>

              <Text style={styles.paymentMethod}>
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
              <View style={styles.summaryRow}>

                <Text style={styles.summaryLabel}>
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

          {/* Footer */}
          <View style={styles.footer}>

            <Text style={styles.thankYou}>
              Thank you for your purchase!
            </Text>

            <Text style={styles.footerText}>
              Powered by SmartPOS
            </Text>

          </View>

        </View>

        {/* New Sale */}
        <TouchableOpacity
          style={styles.newSaleButton}
          onPress={() =>
            navigation.navigate('Sales')
          }
        >
          <Text style={styles.newSaleText}>
            + New Sale
          </Text>
        </TouchableOpacity>

        {/* Dashboard */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() =>
            navigation.navigate('Dashboard')
          }
        >
          <Text style={styles.doneText}>
            Back to Dashboard
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  header: {
    height: 90,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 25,
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 34,
    color: '#202124',
    lineHeight: 38,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#17191C',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 35,
  },

  receiptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },

  storeSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  logoText: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
  },

  storeName: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },

  storeSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#7A8088',
  },

  successBadge: {
    marginTop: 15,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EAF8F0',
  },

  successText: {
    color: '#16834B',
    fontSize: 11,
    fontWeight: '800',
  },

  infoBox: {
    backgroundColor: '#F7F8FA',
    borderRadius: 15,
    padding: 14,
    marginBottom: 22,
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },

  infoRowLast: {
    marginBottom: 0,
  },

  infoLabel: {
    color: '#858B93',
    fontSize: 13,
  },

  infoValue: {
    color: '#20242A',
    fontSize: 13,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17191C',
    marginBottom: 12,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
  },

  itemLeft: {
    flex: 1,
    paddingRight: 10,
  },

  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#20242A',
  },

  itemMeta: {
    marginTop: 4,
    fontSize: 11,
    color: '#858B93',
  },

  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17191C',
  },

  divider: {
    height: 1,
    backgroundColor: '#E8EBEF',
    marginVertical: 12,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },

  summaryLabel: {
    fontSize: 13,
    color: '#777E87',
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#20242A',
  },

  discountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D9534F',
  },

  totalBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17191C',
  },

  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },

  paymentBox: {
    backgroundColor: '#F7F8FA',
    borderRadius: 15,
    padding: 13,
  },

  paymentMethod: {
    fontSize: 13,
    fontWeight: '800',
    color: '#20242A',
  },

  changeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16834B',
  },

  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF2',
  },

  thankYou: {
    fontSize: 14,
    fontWeight: '700',
    color: '#30343A',
  },

  footerText: {
    marginTop: 5,
    fontSize: 11,
    color: '#999FA7',
  },

  newSaleButton: {
    marginTop: 16,
    height: 55,
    borderRadius: 17,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  newSaleText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  doneButton: {
    height: 52,
    marginTop: 10,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE1E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  doneText: {
    color: '#343941',
    fontSize: 14,
    fontWeight: '700',
  },

});