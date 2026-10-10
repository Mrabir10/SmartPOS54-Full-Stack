import React, { useMemo, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';


const API_BASE_URL = 'http://192.168.1.102:3000';

export default function PaymentScreen({
  navigation,
  route,
  onCompleteSale,
}) {
  const {
    cart = [],
    subtotal = 0,
    discountAmount = 0,
    grandTotal = 0,
  } = route.params || {};

  const [paymentMethod, setPaymentMethod] =
    useState('Cash');

  const [paidAmount, setPaidAmount] =
    useState('');

  // ==========================================
  // TOTAL PURCHASE COST
  // ==========================================

  const totalPurchaseCost = useMemo(() => {
    return cart.reduce((total, item) => {
      const purchasePrice =
        Number(item.purchasePrice) || 0;

      const quantity =
        Number(item.quantity) || 0;

      return (
        total +
        purchasePrice * quantity
      );
    }, 0);
  }, [cart]);

  // ==========================================
  // GROSS PROFIT
  // ==========================================

  const grossProfit =
    Number(grandTotal) -
    Number(totalPurchaseCost);

  // ==========================================
  // CHANGE
  // ==========================================

  const changeAmount = useMemo(() => {
    const paid =
      Number(paidAmount) || 0;

    return Math.max(
      paid - grandTotal,
      0
    );
  }, [paidAmount, grandTotal]);

  const isCash =
    paymentMethod === 'Cash';

  const canComplete = isCash
    ? Number(paidAmount) >= grandTotal
    : true;

  const isInsufficient =
    isCash &&
    paidAmount !== '' &&
    Number(paidAmount) < grandTotal;

  // ==========================================
  // PAYMENT METHOD
  // ==========================================

  const selectPaymentMethod = (
    method
  ) => {
    setPaymentMethod(method);

    if (method !== 'Cash') {
      setPaidAmount('');
    }
  };

  // ==========================================
  // COMPLETE PAYMENT
  // ==========================================

 const handlePayment = async () => {
  if (!canComplete) {
    Alert.alert(
      'Insufficient Amount',
      'Paid amount is less than the total.'
    );
    return;
  }

  try {
    // ================================
    // CHECK PRODUCT IDs
    // ================================

    const saleItems = cart.map((item) => ({
      productId: Number(item.databaseId),
      quantity: Number(item.quantity),
    }));

    const invalidItem = saleItems.find(
      (item) =>
        !Number.isInteger(item.productId) ||
        item.productId <= 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
    );

    if (invalidItem) {
      console.log('INVALID SALE ITEM:', invalidItem);
      console.log('CURRENT CART:', cart);

      Alert.alert(
        'Product Error',
        'This product does not have a valid database ID. Please remove it and add the product again.'
      );

      return;
    }

    const saleNumber =
      '#SP' + Math.floor(1000 + Math.random() * 9000);

    const invoiceNumber =
      'INV-' + Date.now();

    // ================================
    // SAVE SALE TO MYSQL
    // ================================

    const response = await fetch(
      `${API_BASE_URL}/sales`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          invoiceNumber: invoiceNumber,

          paymentMethod: paymentMethod,

          items: saleItems,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message ||
              'Failed to save sale'
      );
    }

    // ================================
    // UPDATE EXISTING LOCAL SALE FLOW
    // ================================

    onCompleteSale({
      cart: cart,

      subtotal: subtotal,

      discountAmount: discountAmount,

      grandTotal: grandTotal,

      paymentMethod: paymentMethod,

      paidAmount: isCash
        ? Number(paidAmount)
        : grandTotal,

      changeAmount: changeAmount,

      saleNumber: saleNumber,

      date: new Date().toISOString(),

      // Backend sale information
      databaseSaleId: data.sale?.id,

      invoiceNumber:
        data.sale?.invoiceNumber,
    });

    // ================================
    // SUCCESS
    // ================================

    Alert.alert(
      'Payment Successful',

      `৳${grandTotal.toLocaleString()} payment completed successfully.`,

      [
        {
          text: 'Done',

          onPress: () =>
            navigation.navigate(
              'SaleComplete',
              {
                cart: cart,

                grandTotal:
                  grandTotal,

                paymentMethod:
                  paymentMethod,

                paidAmount:
                  isCash
                    ? Number(paidAmount)
                    : grandTotal,

                changeAmount:
                  changeAmount,

                saleNumber:
                  saleNumber,

                invoiceNumber:
                  data.sale?.invoiceNumber,
              }
            ),
        },
      ]
    );
  } catch (error) {
    console.log(
      'SALE DATABASE ERROR:',
      error
    );

    Alert.alert(
      'Sale Failed',

      error.message ||
        'Could not save sale to database.'
    );
  }
};

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* Header */}
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

        <View style={styles.headerCenter}>

          <Text style={styles.headerSmall}>
            SMARTPOS
          </Text>

          <Text style={styles.headerTitle}>
            Payment
          </Text>

        </View>

        <View style={styles.secureBadge}>

          <Text style={styles.secureText}>
            SECURE
          </Text>

        </View>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.content
        }
      >

        {/* Total Card */}
        <View style={styles.totalCard}>

          <Text style={styles.totalLabel}>
            TOTAL AMOUNT
          </Text>

          <Text style={styles.totalAmount}>
            ৳{grandTotal.toLocaleString()}
          </Text>

          <View style={styles.totalBottom}>

            <Text style={styles.totalItems}>
              {cart.reduce(
                (total, item) =>
                  total +
                  Number(
                    item.quantity
                  ),
                0
              )}{' '}
              items
            </Text>

            <View style={styles.dot} />

            <Text style={styles.totalStatus}>
              Ready to pay
            </Text>

          </View>

        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>
          Payment Method
        </Text>

        <View style={styles.methodRow}>

          {/* Cash */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              paymentMethod ===
                'Cash' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              selectPaymentMethod(
                'Cash'
              )
            }
          >

            <View
              style={[
                styles.methodIconBox,
                paymentMethod ===
                  'Cash' &&
                  styles.methodIconBoxActive,
              ]}
            >

              <Text
                style={styles.methodIcon}
              >
                💵
              </Text>

            </View>

            <Text
              style={[
                styles.methodName,
                paymentMethod ===
                  'Cash' &&
                  styles.methodNameActive,
              ]}
            >
              Cash
            </Text>

            <Text
              style={styles.methodSub}
            >
              Physical payment
            </Text>

          </TouchableOpacity>

          {/* Card */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              paymentMethod ===
                'Card' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              selectPaymentMethod(
                'Card'
              )
            }
          >

            <View
              style={[
                styles.methodIconBox,
                paymentMethod ===
                  'Card' &&
                  styles.methodIconBoxActive,
              ]}
            >

              <Text
                style={styles.methodIcon}
              >
                💳
              </Text>

            </View>

            <Text
              style={[
                styles.methodName,
                paymentMethod ===
                  'Card' &&
                  styles.methodNameActive,
              ]}
            >
              Card
            </Text>

            <Text
              style={styles.methodSub}
            >
              Debit / Credit
            </Text>

          </TouchableOpacity>

          {/* Mobile */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              paymentMethod ===
                'Mobile' &&
                styles.methodCardActive,
            ]}
            onPress={() =>
              selectPaymentMethod(
                'Mobile'
              )
            }
          >

            <View
              style={[
                styles.methodIconBox,
                paymentMethod ===
                  'Mobile' &&
                  styles.methodIconBoxActive,
              ]}
            >

              <Text
                style={styles.methodIcon}
              >
                📱
              </Text>

            </View>

            <Text
              style={[
                styles.methodName,
                paymentMethod ===
                  'Mobile' &&
                  styles.methodNameActive,
              ]}
            >
              Mobile
            </Text>

            <Text
              style={styles.methodSub}
            >
              bKash / Nagad
            </Text>

          </TouchableOpacity>

        </View>

        {/* Cash Payment */}
        {isCash && (
          <View style={styles.cashCard}>

            <View
              style={styles.cashHeader}
            >

              <View>

                <Text
                  style={styles.cashTitle}
                >
                  Cash Payment
                </Text>

                <Text
                  style={styles.cashSub}
                >
                  Enter the amount received
                </Text>

              </View>

              <Text
                style={styles.cashIcon}
              >
                ৳
              </Text>

            </View>

            <Text
              style={styles.inputLabel}
            >
              CUSTOMER PAID
            </Text>

            <View
              style={[
                styles.amountInputBox,
                isInsufficient &&
                  styles.amountInputBoxError,
              ]}
            >

              <Text
                style={styles.amountCurrency}
              >
                ৳
              </Text>

              <TextInput
                style={styles.amountInput}
                value={paidAmount}
                onChangeText={
                  setPaidAmount
                }
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
              />

            </View>

            {/* Insufficient Warning */}
            {isInsufficient && (
              <View
                style={styles.warningBox}
              >

                <View
                  style={
                    styles.warningIconBox
                  }
                >

                  <Text
                    style={styles.warningIcon}
                  >
                    !
                  </Text>

                </View>

                <View
                  style={
                    styles.warningContent
                  }
                >

                  <Text
                    style={styles.warningTitle}
                  >
                    Insufficient Amount
                  </Text>

                  <Text
                    style={styles.warningText}
                  >
                    Paid amount is less than the
                    total amount.
                  </Text>

                  <Text
                    style={
                      styles.warningDifference
                    }
                  >
                    Need ৳
                    {(
                      grandTotal -
                      Number(
                        paidAmount || 0
                      )
                    ).toLocaleString()}{' '}
                    more
                  </Text>

                </View>

              </View>
            )}

            {/* Quick Amounts */}
            <View
              style={styles.quickRow}
            >

              {[500, 1000, 2000].map(
                (amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={
                      styles.quickButton
                    }
                    onPress={() =>
                      setPaidAmount(
                        String(amount)
                      )
                    }
                  >

                    <Text
                      style={
                        styles.quickText
                      }
                    >
                      ৳
                      {amount.toLocaleString()}
                    </Text>

                  </TouchableOpacity>
                )
              )}

            </View>

            {/* Change */}
            <View
              style={[
                styles.changeBox,
                isInsufficient &&
                  styles.changeBoxDisabled,
              ]}
            >

              <View>

                <Text
                  style={[
                    styles.changeLabel,
                    isInsufficient &&
                      styles.changeLabelDisabled,
                  ]}
                >
                  CHANGE
                </Text>

                <Text
                  style={styles.changeSub}
                >
                  Return to customer
                </Text>

              </View>

              <Text
                style={[
                  styles.changeAmount,
                  isInsufficient &&
                    styles.changeAmountDisabled,
                ]}
              >
                ৳
                {changeAmount.toLocaleString()}
              </Text>

            </View>

          </View>
        )}

        {/* Card / Mobile Info */}
        {!isCash && (
          <View style={styles.infoCard}>

            <View
              style={styles.infoIconBox}
            >

              <Text
                style={styles.infoIcon}
              >
                {paymentMethod ===
                'Card'
                  ? '💳'
                  : '📱'}
              </Text>

            </View>

            <View
              style={styles.infoTextBox}
            >

              <Text
                style={styles.infoTitle}
              >
                {paymentMethod ===
                'Card'
                  ? 'Card Payment'
                  : 'Mobile Payment'}
              </Text>

              <Text
                style={styles.infoText}
              >
                Complete the payment using the
                customer's{' '}
                {paymentMethod ===
                'Card'
                  ? 'card'
                  : 'mobile banking'}.
              </Text>

            </View>

          </View>
        )}

        {/* Order Summary */}
        <View
          style={styles.summaryCard}
        >

          <Text
            style={styles.summaryTitle}
          >
            Order Summary
          </Text>

          <View
            style={styles.summaryRow}
          >

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

          <View
            style={styles.summaryRow}
          >

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

          <View
            style={styles.divider}
          />

          <View
            style={styles.finalRow}
          >

            <Text
              style={styles.finalLabel}
            >
              Amount Due
            </Text>

            <Text
              style={styles.finalAmount}
            >
              ৳
              {grandTotal.toLocaleString()}
            </Text>

          </View>

        </View>

        {/* Complete Payment */}
        <TouchableOpacity
          style={[
            styles.paymentButton,
            isInsufficient &&
              styles.paymentButtonWarning,
          ]}
          onPress={handlePayment}
        >

          <View>

            <Text
              style={styles.paymentSmall}
            >
              {isInsufficient
                ? 'CHECK PAYMENT'
                : 'CONFIRM'}
            </Text>

            <Text
              style={styles.paymentText}
            >
              Complete Payment
            </Text>

          </View>

          <Text
            style={styles.paymentAmount}
          >
            ৳
            {grandTotal.toLocaleString()}
          </Text>

        </TouchableOpacity>

        <Text
          style={styles.footerText}
        >
          Payment will be recorded in SmartPOS
        </Text>

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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 32,
    color: '#111827',
    marginTop: -3,
  },

  headerCenter: {
    flex: 1,
    marginLeft: 14,
  },

  headerSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.5,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },

  secureBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  secureText: {
    color: '#059669',
    fontSize: 9,
    fontWeight: '800',
  },

  content: {
    padding: 20,
    paddingBottom: 35,
  },

  totalCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 23,
    marginBottom: 25,
  },

  totalLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  totalAmount: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    marginTop: 8,
  },

  totalBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },

  totalItems: {
    color: '#D1D5DB',
    fontSize: 12,
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B7280',
    marginHorizontal: 9,
  },

  totalStatus: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  methodRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },

  methodCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  methodCardActive: {
    borderColor: '#111827',
  },

  methodIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  methodIconBoxActive: {
    backgroundColor: '#E5E7EB',
  },

  methodIcon: {
    fontSize: 21,
  },

  methodName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },

  methodNameActive: {
    color: '#111827',
  },

  methodSub: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },

  cashCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    padding: 18,
    marginBottom: 18,
  },

  cashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  cashTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  cashSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  cashIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#ECFDF5',
    color: '#059669',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingTop: 8,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 8,
  },

  amountInputBox: {
    height: 58,
    borderRadius: 15,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  amountInputBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },

  amountCurrency: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 15,
    padding: 13,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  warningIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  warningIcon: {
    color: '#DC2626',
    fontSize: 20,
    fontWeight: '900',
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },

  warningText: {
    color: '#B91C1C',
    fontSize: 11,
    marginTop: 3,
  },

  warningDifference: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  quickButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },

  quickText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },

  changeBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  changeBoxDisabled: {
    backgroundColor: '#F9FAFB',
  },

  changeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 1,
  },

  changeLabelDisabled: {
    color: '#9CA3AF',
  },

  changeSub: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 3,
  },

  changeAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },

  changeAmountDisabled: {
    color: '#9CA3AF',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  infoIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  infoIcon: {
    fontSize: 25,
  },

  infoTextBox: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },

  infoText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 17,
  },

  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 15,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    marginVertical: 8,
  },

  finalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  finalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  finalAmount: {
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
  },

  paymentButton: {
    backgroundColor: '#111827',
    borderRadius: 19,
    paddingHorizontal: 20,
    paddingVertical: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  paymentButtonWarning: {
    backgroundColor: '#991B1B',
  },

  paymentSmall: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },

  paymentText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },

  paymentAmount: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },

  footerText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 14,
  },

});