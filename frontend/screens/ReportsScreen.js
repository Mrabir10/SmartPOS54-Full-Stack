import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'http://192.168.1.102:3000';

export default function ReportsScreen({
  navigation,
  sales: localSales = [],
  purchases: localPurchases = [],
  stockMovements: localStockMovements = [],
}) {
  const [period, setPeriod] = useState('Today');
  const [exporting, setExporting] = useState(false);

  const [dbSales, setDbSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [salesError, setSalesError] = useState('');
  const [dbMovements, setDbMovements] = useState([]);
  const [databaseLoaded, setDatabaseLoaded] = useState(false);

  // ==========================================
  // LOAD BUSINESS DATA FROM DATABASE
  // ==========================================

  const loadBusinessData = useCallback(async () => {
    try {
      setLoadingSales(true);
      setSalesError('');

      const [
        salesResponse,
        movementsResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/sales?_=${Date.now()}`
        ),
        fetch(
          `${API_BASE_URL}/stock-movements?_=${Date.now()}`
        ),
      ]);

      if (!salesResponse.ok) {
        throw new Error(
          `Sales API Error: ${salesResponse.status}`
        );
      }

      if (!movementsResponse.ok) {
        throw new Error(
          `Stock Movement API Error: ${movementsResponse.status}`
        );
      }

      const salesData =
        await salesResponse.json();

      const movementData =
        await movementsResponse.json();

      const formattedSales = Array.isArray(salesData)
        ? salesData.map((sale) => ({
            id: sale.id,
            saleNumber:
              sale.invoiceNumber ||
              `SP${String(sale.id).padStart(4, '0')}`,
            invoiceNumber:
              sale.invoiceNumber ||
              `SP${String(sale.id).padStart(4, '0')}`,
            date: sale.createdAt,
            grandTotal: Number(
              sale.totalAmount || 0
            ),
            totalPurchaseCost: Number(
              sale.totalPurchaseCost || 0
            ),
            grossProfit: Number(
              sale.grossProfit || 0
            ),
            paymentMethod:
              sale.paymentMethod || 'Cash',
            itemCount: Number(
              sale.itemsCount || 0
            ),
          }))
        : [];

      const formattedMovements = Array.isArray(movementData)
        ? movementData.map((movement) => ({
            ...movement,
            productId: String(
              movement.productId ?? ''
            ),
            quantity: Number(
              movement.quantity || 0
            ),
            purchasePrice:
              movement.purchasePrice === null ||
              movement.purchasePrice === undefined
                ? 0
                : Number(movement.purchasePrice),
            totalPurchaseCost:
              movement.totalPurchaseCost === null ||
              movement.totalPurchaseCost === undefined
                ? 0
                : Number(movement.totalPurchaseCost),
            date:
              movement.date ||
              movement.createdAt,
          }))
        : [];

      setDbSales(formattedSales);
      setDbMovements(formattedMovements);
      setDatabaseLoaded(true);
    } catch (error) {
      console.log(
        'Reports Database Load Error:',
        error
      );

      setSalesError(
        'Could not connect to business report database.'
      );

      setDatabaseLoaded(false);
    } finally {
      setLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    loadBusinessData();
  }, [loadBusinessData]);

  useEffect(() => {
    const unsubscribe =
      navigation?.addListener?.(
        'focus',
        loadBusinessData
      );

    return unsubscribe;
  }, [navigation, loadBusinessData]);

  // ==========================================
  // DATABASE DATA FIRST
  // ==========================================

  const reportSales = useMemo(() => {
    return databaseLoaded
      ? dbSales
      : localSales;
  }, [
    databaseLoaded,
    dbSales,
    localSales,
  ]);

  const stockMovements = useMemo(() => {
    return databaseLoaded
      ? dbMovements
      : localStockMovements;
  }, [
    databaseLoaded,
    dbMovements,
    localStockMovements,
  ]);

  const purchases = useMemo(() => {
    if (!databaseLoaded) {
      return localPurchases;
    }

    return dbMovements
      .filter(
        (movement) =>
          movement.type === 'RESTOCK'
      )
      .map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        productName: movement.productName,
        supplier:
          movement.supplier ||
          'Unknown Supplier',
        quantity: Math.abs(
          Number(movement.quantity || 0)
        ),
        unitPurchasePrice:
          Number(
            movement.purchasePrice || 0
          ),
        totalPurchaseCost:
          Number(
            movement.totalPurchaseCost || 0
          ),
        date: movement.date,
      }));
  }, [
    databaseLoaded,
    dbMovements,
    localPurchases,
  ]);

  // ==========================================
  // BANGLADESH DATE HELPERS
  // ==========================================

  const toDhakaDate = (dateValue) => {
    if (!dateValue) {
      return null;
    }

    let date;

    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string') {
      const text = dateValue.trim();
      const hasTimezone =
        /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
      const mysqlLike = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/
      );

      if (mysqlLike && !hasTimezone) {
        const [, year, month, day, hour, minute, second] =
          mysqlLike;

        date = new Date(
          `${year}-${month}-${day}T${hour}:${minute}:${second}+06:00`
        );
      } else {
        date = new Date(text);
      }
    } else {
      date = new Date(dateValue);
    }

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Date(
      date.getTime() +
        6 * 60 * 60 * 1000
    );
  };

  const getDhakaParts = (dateValue) => {
    const date = toDhakaDate(dateValue);

    if (!date) {
      return null;
    }

    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
      time: date.getTime(),
    };
  };

  const matchesPeriod = (dateValue) => {
    const value = getDhakaParts(dateValue);
    const now = getDhakaParts(new Date());

    if (!value || !now) {
      return false;
    }

    if (period === 'Today') {
      return (
        value.year === now.year &&
        value.month === now.month &&
        value.day === now.day
      );
    }

    if (period === 'This Month') {
      return (
        value.year === now.year &&
        value.month === now.month
      );
    }

    if (period === 'This Year') {
      return value.year === now.year;
    }

    if (period === 'This Week') {
      const nowDate = toDhakaDate(new Date());
      const valueDate = toDhakaDate(dateValue);

      if (!nowDate || !valueDate) {
        return false;
      }

      const diffToMonday =
        now.weekday === 0
          ? 6
          : now.weekday - 1;

      const mondayTime =
        Date.UTC(
          now.year,
          now.month,
          now.day
        ) -
        diffToMonday *
          24 * 60 * 60 * 1000;

      const nextMondayTime =
        mondayTime +
        7 * 24 * 60 * 60 * 1000;

      const valueDayTime = Date.UTC(
        value.year,
        value.month,
        value.day
      );

      return (
        valueDayTime >= mondayTime &&
        valueDayTime < nextMondayTime
      );
    }

    return false;
  };

  // ==========================================
  // FILTER SALES
  // ==========================================

  const filteredSales =
    useMemo(() => {
      return reportSales.filter(
        (sale) =>
          matchesPeriod(
            sale.date
          )
      );
    }, [
      reportSales,
      period,
    ]);

  // ==========================================
  // FILTER PURCHASES
  // ==========================================

  const filteredPurchases =
    useMemo(() => {
      return purchases.filter(
        (purchase) =>
          matchesPeriod(
            purchase.date
          )
      );
    }, [
      purchases,
      period,
    ]);

  // ==========================================
  // FILTER STOCK MOVEMENTS
  // ==========================================

  const filteredMovements =
    useMemo(() => {
      return stockMovements.filter(
        (movement) =>
          matchesPeriod(
            movement.date
          )
      );
    }, [
      stockMovements,
      period,
    ]);

  // ==========================================
  // TOTAL SALES
  // ==========================================

  const totalSales =
    useMemo(() => {
      return filteredSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.grandTotal || 0
          ),
        0
      );
    }, [filteredSales]);

  // ==========================================
  // TOTAL PURCHASE COST
  // ==========================================

  const totalPurchaseCost =
    useMemo(() => {
      return filteredPurchases.reduce(
        (total, purchase) =>
          total +
          Number(
            purchase.totalPurchaseCost ||
              0
          ),
        0
      );
    }, [
      filteredPurchases,
    ]);

  // ==========================================
  // COST OF SOLD PRODUCTS
  // ==========================================

  const soldPurchaseCost =
    useMemo(() => {
      return filteredSales.reduce(
        (total, sale) =>
          total +
          Number(
            sale.totalPurchaseCost ||
              0
          ),
        0
      );
    }, [filteredSales]);

  // ==========================================
  // GROSS PROFIT
  // ==========================================

  const grossProfit =
    useMemo(() => {
      return filteredSales.reduce(
        (total, sale) => {
          const saleAmount =
            Number(
              sale.grandTotal || 0
            );

          const cost =
            Number(
              sale.totalPurchaseCost ||
                0
            );

          const profit =
            sale.grossProfit !==
            undefined
              ? Number(
                  sale.grossProfit
                )
              : sale.totalPurchaseCost !==
                undefined
              ? saleAmount -
                cost
              : 0;

          return (
            total + profit
          );
        },
        0
      );
    }, [filteredSales]);

  // ==========================================
  // SOLD PIECES
  // ==========================================

  const soldPieces =
    useMemo(() => {
      return filteredSales.reduce(
        (total, sale) => {
          /*
           * Older local sales may contain cart.
           * Database sales currently expose
           * itemsCount = number of sale items.
           *
           * For database-backed reports we use
           * itemsCount when cart is unavailable.
           */

          const quantity =
            sale.cart
              ? sale.cart.reduce(
                  (
                    itemTotal,
                    item
                  ) =>
                    itemTotal +
                    Number(
                      item.quantity ||
                        0
                    ),
                  0
                )
              : Number(
                  sale.itemCount ||
                    sale.itemsCount ||
                    0
                );

          return (
            total + quantity
          );
        },
        0
      );
    }, [filteredSales]);

  // ==========================================
  // RESTOCKED PIECES
  // ==========================================

  const restockedPieces =
    useMemo(() => {
      return filteredPurchases.reduce(
        (total, purchase) =>
          total +
          Number(
            purchase.quantity ||
              0
          ),
        0
      );
    }, [
      filteredPurchases,
    ]);

  // ==========================================
  // TRANSACTION COUNT
  // ==========================================

  const transactionCount =
    filteredSales.length;

  // ==========================================
  // PROFIT MARGIN
  // ==========================================

  const profitMargin =
    totalSales > 0
      ? (
          (grossProfit /
            totalSales) *
          100
        ).toFixed(1)
      : '0.0';

  // ==========================================
  // MONTHLY YEARLY REPORT
  // ==========================================

  const monthlyReport =
    useMemo(() => {
      const currentYear =
        getDhakaParts(new Date())?.year ||
        new Date().getFullYear();

      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      return monthNames.map(
        (
          monthName,
          index
        ) => {
          const monthSales =
            reportSales.filter(
              (sale) => {
                if (!sale.date) {
                  return false;
                }

                const date =
                  getDhakaParts(
                    sale.date
                  );

                return (
                  date?.year ===
                    currentYear &&
                  date?.month ===
                    index
                );
              }
            );

          const monthPurchases =
            purchases.filter(
              (purchase) => {
                if (
                  !purchase.date
                ) {
                  return false;
                }

                const date =
                  getDhakaParts(
                    purchase.date
                  );

                return (
                  date?.year ===
                    currentYear &&
                  date?.month ===
                    index
                );
              }
            );

          const salesAmount =
            monthSales.reduce(
              (
                total,
                sale
              ) =>
                total +
                Number(
                  sale.grandTotal ||
                    0
                ),
              0
            );

          const purchaseAmount =
            monthPurchases.reduce(
              (
                total,
                purchase
              ) =>
                total +
                Number(
                  purchase.totalPurchaseCost ||
                    0
                ),
              0
            );

          const profit =
            monthSales.reduce(
              (
                total,
                sale
              ) => {
                const saleAmount =
                  Number(
                    sale.grandTotal ||
                      0
                  );

                const cost =
                  Number(
                    sale.totalPurchaseCost ||
                      0
                  );

                const saleProfit =
                  sale.grossProfit !==
                  undefined
                    ? Number(
                        sale.grossProfit
                      )
                    : sale.totalPurchaseCost !==
                      undefined
                    ? saleAmount -
                      cost
                    : 0;

                return (
                  total +
                  saleProfit
                );
              },
              0
            );

          const sold =
            monthSales.reduce(
              (
                total,
                sale
              ) =>
                total +
                (
                  sale.cart
                    ? sale.cart.reduce(
                        (
                          itemTotal,
                          item
                        ) =>
                          itemTotal +
                          Number(
                            item.quantity ||
                              0
                          ),
                        0
                      )
                    : Number(
                        sale.itemCount ||
                          sale.itemsCount ||
                          0
                      )
                ),
              0
            );

          const restocked =
            monthPurchases.reduce(
              (
                total,
                purchase
              ) =>
                total +
                Number(
                  purchase.quantity ||
                    0
                ),
              0
            );

          return {
            monthName,
            sales:
              salesAmount,
            purchases:
              purchaseAmount,
            profit,
            sold,
            restocked,
            hasData:
              salesAmount > 0 ||
              purchaseAmount > 0 ||
              sold > 0 ||
              restocked > 0,
          };
        }
      );
    }, [
      reportSales,
      purchases,
    ]);

  // ==========================================
  // YEAR TOTALS
  // ==========================================

  const yearlySummary =
    useMemo(() => {
      return monthlyReport.reduce(
        (
          summary,
          month
        ) => ({
          sales:
            summary.sales +
            month.sales,

          purchases:
            summary.purchases +
            month.purchases,

          profit:
            summary.profit +
            month.profit,

          sold:
            summary.sold +
            month.sold,

          restocked:
            summary.restocked +
            month.restocked,
        }),
        {
          sales: 0,
          purchases: 0,
          profit: 0,
          sold: 0,
          restocked: 0,
        }
      );
    }, [monthlyReport]);

  // ==========================================
  // CSV HELPERS
  // ==========================================

  const csvEscape =
    (value) => {
      if (
        value === null ||
        value === undefined
      ) {
        return '';
      }

      const text =
        String(value);

      return `"${text.replace(
        /"/g,
        '""'
      )}"`;
    };

  const formatDateTime =
    (dateValue) => {
      if (!dateValue) {
        return '';
      }

      const date =
        new Date(dateValue);

      if (
        isNaN(
          date.getTime()
        )
      ) {
        return '';
      }

      return date.toLocaleString();
    };

  // ==========================================
  // EXPORT CSV
  // ==========================================

  const exportCSV =
    async () => {
      try {
        setExporting(true);

        if (
          filteredSales.length ===
            0 &&
          filteredPurchases.length ===
            0
        ) {
          Alert.alert(
            'No Data',
            `There is no business data available for ${period}.`
          );

          setExporting(false);
          return;
        }

        const now =
          new Date();

        const fileDate =
          now
            .toISOString()
            .slice(0, 10);

        const safePeriod =
          period
            .replace(
              /\s+/g,
              '_'
            )
            .toLowerCase();

        const fileName =
          `SmartPOS54_${safePeriod}_report_${fileDate}.csv`;

        let csv = '';

        csv +=
          'SMARTPOS54 BUSINESS REPORT\n';

        csv +=
          `Report Period,${csvEscape(
            period
          )}\n`;

        csv +=
          `Generated At,${csvEscape(
            now.toLocaleString()
          )}\n`;

        csv += '\n';

        csv +=
          'BUSINESS SUMMARY\n';

        csv +=
          'Metric,Amount\n';

        csv +=
          `Total Sales,${csvEscape(
            totalSales.toFixed(2)
          )}\n`;

        csv +=
          `Purchase Cost,${csvEscape(
            totalPurchaseCost.toFixed(2)
          )}\n`;

        csv +=
          `Cost of Sold Products,${csvEscape(
            soldPurchaseCost.toFixed(
              2
            )
          )}\n`;

        csv +=
          `Gross Profit,${csvEscape(
            grossProfit.toFixed(2)
          )}\n`;

        csv +=
          `Profit Margin,${csvEscape(
            `${profitMargin}%`
          )}\n`;

        csv +=
          `Sold Pieces,${csvEscape(
            soldPieces
          )}\n`;

        csv +=
          `Restocked Pieces,${csvEscape(
            restockedPieces
          )}\n`;

        csv +=
          `Sales Transactions,${csvEscape(
            transactionCount
          )}\n`;

        csv += '\n';

        csv +=
          'SALES DETAILS\n';

        csv +=
          'Sale Number,Date,Payment Method,Items Sold,Sales Amount,Purchase Cost,Gross Profit\n';

        filteredSales.forEach(
          (sale) => {
            const itemsSold =
              sale.cart
                ? sale.cart.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      Number(
                        item.quantity ||
                          0
                      ),
                    0
                  )
                : Number(
                    sale.itemCount ||
                      sale.itemsCount ||
                      0
                  );

            const saleAmount =
              Number(
                sale.grandTotal ||
                  0
              );

            const saleCost =
              Number(
                sale.totalPurchaseCost ||
                  0
              );

            const saleProfit =
              sale.grossProfit !==
              undefined
                ? Number(
                    sale.grossProfit
                  )
                : sale.totalPurchaseCost !==
                  undefined
                ? saleAmount -
                  saleCost
                : 0;

            csv +=
              `${csvEscape(
                sale.saleNumber ||
                  ''
              )},`;

            csv +=
              `${csvEscape(
                formatDateTime(
                  sale.date
                )
              )},`;

            csv +=
              `${csvEscape(
                sale.paymentMethod ||
                  ''
              )},`;

            csv +=
              `${csvEscape(
                itemsSold
              )},`;

            csv +=
              `${csvEscape(
                saleAmount.toFixed(
                  2
                )
              )},`;

            csv +=
              `${csvEscape(
                saleCost.toFixed(
                  2
                )
              )},`;

            csv +=
              `${csvEscape(
                saleProfit.toFixed(
                  2
                )
              )}\n`;
          }
        );

        csv += '\n';

        csv +=
          'PURCHASE DETAILS\n';

        csv +=
          'Date,Product,Supplier,Quantity,Purchase Price,Total Purchase Cost\n';

        filteredPurchases.forEach(
          (purchase) => {
            csv +=
              `${csvEscape(
                formatDateTime(
                  purchase.date
                )
              )},`;

            csv +=
              `${csvEscape(
                purchase.productName ||
                  purchase.name ||
                  purchase.productId ||
                  ''
              )},`;

            csv +=
              `${csvEscape(
                purchase.supplier ||
                  ''
              )},`;

            csv +=
              `${csvEscape(
                Number(
                  purchase.quantity ||
                    0
                )
              )},`;

            csv +=
              `${csvEscape(
                Number(
                  purchase.purchasePrice ||
                    0
                ).toFixed(2)
              )},`;

            csv +=
              `${csvEscape(
                Number(
                  purchase.totalPurchaseCost ||
                    0
                ).toFixed(2)
              )}\n`;
          }
        );

        csv += '\n';

        csv +=
          'STOCK MOVEMENT SUMMARY\n';

        csv +=
          'Movement Type,Count\n';

        const saleMovements =
          filteredMovements.filter(
            (movement) =>
              String(
                movement.type ||
                  ''
              ).toUpperCase() ===
              'SALE'
          ).length;

        const restockMovements =
          filteredMovements.filter(
            (movement) =>
              String(
                movement.type ||
                  ''
              ).toUpperCase() ===
              'RESTOCK'
          ).length;

        csv +=
          `SALE MOVEMENTS,${csvEscape(
            saleMovements
          )}\n`;

        csv +=
          `RESTOCK MOVEMENTS,${csvEscape(
            restockMovements
          )}\n`;

        csv +=
          `TOTAL MOVEMENTS,${csvEscape(
            filteredMovements.length
          )}\n`;

        csv += '\n';

        if (
          period ===
          'This Year'
        ) {
          csv +=
            'YEARLY MONTHLY PERFORMANCE\n';

          csv +=
            'Month,Sales,Purchase Cost,Gross Profit,Sold Pieces,Restocked Pieces\n';

          monthlyReport.forEach(
            (month) => {
              csv +=
                `${csvEscape(
                  month.monthName
                )},`;

              csv +=
                `${csvEscape(
                  month.sales.toFixed(
                    2
                  )
                )},`;

              csv +=
                `${csvEscape(
                  month.purchases.toFixed(
                    2
                  )
                )},`;

              csv +=
                `${csvEscape(
                  month.profit.toFixed(
                    2
                  )
                )},`;

              csv +=
                `${csvEscape(
                  month.sold
                )},`;

              csv +=
                `${csvEscape(
                  month.restocked
                )}\n`;
            }
          );

          csv += '\n';

          csv +=
            'YEAR TOTALS\n';

          csv +=
            `Year Sales,${csvEscape(
              yearlySummary.sales.toFixed(
                2
              )
            )}\n`;

          csv +=
            `Year Purchase Cost,${csvEscape(
              yearlySummary.purchases.toFixed(
                2
              )
            )}\n`;

          csv +=
            `Year Gross Profit,${csvEscape(
              yearlySummary.profit.toFixed(
                2
              )
            )}\n`;

          csv +=
            `Year Sold Pieces,${csvEscape(
              yearlySummary.sold
            )}\n`;

          csv +=
            `Year Restocked Pieces,${csvEscape(
              yearlySummary.restocked
            )}\n`;
        }

        const fileUri =
          FileSystem.cacheDirectory +
          fileName;

        await FileSystem.writeAsStringAsync(
          fileUri,
          csv,
          {
            encoding:
              FileSystem.EncodingType
                .UTF8,
          }
        );

        const canShare =
          await Sharing.isAvailableAsync();

        if (!canShare) {
          Alert.alert(
            'Export Ready',
            `CSV report created successfully:\n${fileName}`
          );

          setExporting(false);
          return;
        }

        await Sharing.shareAsync(
          fileUri,
          {
            mimeType:
              'text/csv',

            dialogTitle:
              'Share SmartPOS54 Report',

            UTI:
              'public.comma-separated-values-text',
          }
        );
      } catch (error) {
        console.log(
          'CSV Export Error:',
          error
        );

        Alert.alert(
          'Export Failed',
          'Something went wrong while creating the CSV report.'
        );
      } finally {
        setExporting(false);
      }
    };

  // ==========================================
  // PERIOD LABEL
  // ==========================================

  const periodDescription =
    period === 'Today'
      ? "Today's business performance"
      : period === 'This Week'
      ? "This week's business performance"
      : period === 'This Month'
      ? "This month's business performance"
      : "This year's business performance";

  return (
    <SafeAreaView
      style={styles.container}
    >
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
            SMARTPOS54
          </Text>

          <Text style={styles.headerTitle}>
            Business Reports
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.exportButton,
            exporting &&
              styles.exportButtonDisabled,
          ]}
          onPress={exportCSV}
          disabled={exporting}
        >
          <Text style={styles.exportIcon}>
            {exporting ? '…' : '⇩'}
          </Text>

          <Text style={styles.exportText}>
            {exporting
              ? 'EXPORTING'
              : 'CSV'}
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
        <View style={styles.intro}>
          <Text style={styles.introTitle}>
            Business Overview
          </Text>

          <Text style={styles.introText}>
            {periodDescription}
          </Text>
        </View>

        {/* DATABASE STATUS */}

        {loadingSales && (
          <View style={styles.loadingCard}>
            <ActivityIndicator
              size="small"
              color="#111827"
            />

            <Text style={styles.loadingText}>
              Loading sales from database...
            </Text>
          </View>
        )}

        {!loadingSales &&
          salesError !== '' && (
            <TouchableOpacity
              style={styles.errorCard}
              onPress={loadSales}
            >
              <Text style={styles.errorIcon}>
                !
              </Text>

              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>
                  Database connection issue
                </Text>

                <Text style={styles.errorText}>
                  {salesError} Tap to retry.
                </Text>
              </View>
            </TouchableOpacity>
          )}

        <View style={styles.periodCard}>
          <Text style={styles.periodLabel}>
            REPORT PERIOD
          </Text>

          <View style={styles.periodRow}>
            {[
              'Today',
              'This Week',
              'This Month',
              'This Year',
            ].map((item) => {
              const active =
                period === item;

              return (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.periodButton,
                    active &&
                      styles.periodButtonActive,
                  ]}
                  onPress={() =>
                    setPeriod(item)
                  }
                >
                  <Text
                    style={[
                      styles.periodText,
                      active &&
                        styles.periodTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.profitCard}>
          <View style={styles.profitCardTop}>
            <View>
              <Text
                style={styles.profitCardLabel}
              >
                GROSS PROFIT
              </Text>

              <Text
                style={styles.profitAmount}
              >
                ৳
                {grossProfit.toLocaleString()}
              </Text>
            </View>

            <View
              style={styles.profitIconBox}
            >
              <Text
                style={styles.profitIcon}
              >
                ↗
              </Text>
            </View>
          </View>

          <View style={styles.profitBottom}>
            <Text style={styles.marginText}>
              {profitMargin}% profit margin
            </Text>

            <Text
              style={styles.transactionText}
            >
              {transactionCount} transactions
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconBox,
                styles.salesIconBox,
              ]}
            >
              <Text style={styles.statIcon}>
                ৳
              </Text>
            </View>

            <Text style={styles.statLabel}>
              TOTAL SALES
            </Text>

            <Text style={styles.statValue}>
              ৳
              {totalSales.toLocaleString()}
            </Text>

            <Text style={styles.statSub}>
              Revenue generated
            </Text>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconBox,
                styles.purchaseIconBox,
              ]}
            >
              <Text style={styles.statIcon}>
                ↓
              </Text>
            </View>

            <Text style={styles.statLabel}>
              PURCHASE COST
            </Text>

            <Text
              style={[
                styles.statValue,
                styles.purchaseValue,
              ]}
            >
              ৳
              {totalPurchaseCost.toLocaleString()}
            </Text>

            <Text style={styles.statSub}>
              Inventory purchased
            </Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Inventory Activity
              </Text>

              <Text
                style={styles.sectionSub}
              >
                Stock movement for{' '}
                {period.toLowerCase()}
              </Text>
            </View>

            <View
              style={styles.movementBadge}
            >
              <Text
                style={
                  styles.movementBadgeText
                }
              >
                {filteredMovements.length}
              </Text>
            </View>
          </View>

          <View style={styles.activityRow}>
            <View
              style={styles.activityItem}
            >
              <View
                style={[
                  styles.activityIcon,
                  styles.soldIcon,
                ]}
              >
                <Text>↑</Text>
              </View>

              <View>
                <Text
                  style={styles.activityLabel}
                >
                  SOLD
                </Text>

                <Text
                  style={styles.activityValue}
                >
                  {soldPieces}
                </Text>

                <Text
                  style={styles.activitySub}
                >
                  pieces
                </Text>
              </View>
            </View>

            <View
              style={styles.verticalDivider}
            />

            <View
              style={styles.activityItem}
            >
              <View
                style={[
                  styles.activityIcon,
                  styles.restockIcon,
                ]}
              >
                <Text>↓</Text>
              </View>

              <View>
                <Text
                  style={styles.activityLabel}
                >
                  RESTOCKED
                </Text>

                <Text
                  style={styles.activityValue}
                >
                  {restockedPieces}
                </Text>

                <Text
                  style={styles.activitySub}
                >
                  pieces
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text
                style={styles.sectionTitle}
              >
                Financial Breakdown
              </Text>

              <Text
                style={styles.sectionSub}
              >
                How your sales performed
              </Text>
            </View>
          </View>

          <View style={styles.breakdownRow}>
            <View
              style={styles.breakdownLeft}
            >
              <View
                style={[
                  styles.breakdownDot,
                  styles.salesDot,
                ]}
              />

              <Text
                style={styles.breakdownLabel}
              >
                Sales Revenue
              </Text>
            </View>

            <Text
              style={styles.breakdownValue}
            >
              ৳
              {totalSales.toLocaleString()}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <View
              style={styles.breakdownLeft}
            >
              <View
                style={[
                  styles.breakdownDot,
                  styles.costDot,
                ]}
              />

              <Text
                style={styles.breakdownLabel}
              >
                Cost of Sold Products
              </Text>
            </View>

            <Text
              style={styles.breakdownCost}
            >
              ৳
              {soldPurchaseCost.toLocaleString()}
            </Text>
          </View>

          <View
            style={styles.breakdownDivider}
          />

          <View style={styles.breakdownRow}>
            <View
              style={styles.breakdownLeft}
            >
              <View
                style={[
                  styles.breakdownDot,
                  styles.profitDot,
                ]}
              />

              <Text
                style={[
                  styles.breakdownLabel,
                  styles.profitLabel,
                ]}
              >
                Gross Profit
              </Text>
            </View>

            <Text
              style={styles.breakdownProfit}
            >
              ৳
              {grossProfit.toLocaleString()}
            </Text>
          </View>
        </View>

        {period === 'This Year' && (
          <View
            style={styles.monthlyCard}
          >
            <View
              style={styles.sectionHeader}
            >
              <View>
                <Text
                  style={styles.sectionTitle}
                >
                  Monthly Performance
                </Text>

                <Text
                  style={styles.sectionSub}
                >
                  Month-by-month performance for{' '}
                  {new Date().getFullYear()}
                </Text>
              </View>

              <View
                style={styles.yearBadge}
              >
                <Text
                  style={
                    styles.yearBadgeText
                  }
                >
                  {new Date().getFullYear()}
                </Text>
              </View>
            </View>

            <View
              style={styles.yearSummary}
            >
              <View
                style={
                  styles.yearSummaryItem
                }
              >
                <Text
                  style={
                    styles.yearSummaryLabel
                  }
                >
                  YEAR SALES
                </Text>

                <Text
                  style={
                    styles.yearSummaryValue
                  }
                >
                  ৳
                  {yearlySummary.sales.toLocaleString()}
                </Text>
              </View>

              <View
                style={
                  styles.yearSummaryItem
                }
              >
                <Text
                  style={
                    styles.yearSummaryLabel
                  }
                >
                  YEAR PROFIT
                </Text>

                <Text
                  style={[
                    styles.yearSummaryValue,
                    styles.yearProfitValue,
                  ]}
                >
                  ৳
                  {yearlySummary.profit.toLocaleString()}
                </Text>
              </View>
            </View>

            {monthlyReport.map(
              (
                month,
                index
              ) => (
                <View
                  key={
                    month.monthName
                  }
                  style={[
                    styles.monthRow,
                    index ===
                      monthlyReport.length -
                        1 &&
                      styles.lastMonthRow,
                  ]}
                >
                  <View
                    style={
                      styles.monthNameBox
                    }
                  >
                    <View
                      style={[
                        styles.monthNumber,
                        month.hasData &&
                          styles.monthNumberActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthNumberText,
                          month.hasData &&
                            styles.monthNumberTextActive,
                        ]}
                      >
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          '0'
                        )}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={
                          styles.monthName
                        }
                      >
                        {
                          month.monthName
                        }
                      </Text>

                      <Text
                        style={
                          styles.monthPieces
                        }
                      >
                        Sold{' '}
                        {
                          month.sold
                        }{' '}
                        • Restocked{' '}
                        {
                          month.restocked
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.monthFinancial
                    }
                  >
                    <Text
                      style={
                        styles.monthSales
                      }
                    >
                      ৳
                      {month.sales.toLocaleString()}
                    </Text>

                    <Text
                      style={
                        styles.monthProfit
                      }
                    >
                      Profit ৳
                      {month.profit.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        <View
          style={styles.exportInfoCard}
        >
          <View
            style={styles.exportInfoIcon}
          >
            <Text
              style={
                styles.exportInfoIconText
              }
            >
              ⇩
            </Text>
          </View>

          <View
            style={
              styles.exportInfoContent
            }
          >
            <Text
              style={styles.exportInfoTitle}
            >
              Export Business Report
            </Text>

            <Text
              style={styles.exportInfoText}
            >
              Tap CSV above to export the
              selected period's sales,
              purchases, profit and inventory
              activity.
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>
            ℹ
          </Text>

          <View
            style={styles.infoContent}
          >
            <Text
              style={styles.infoTitle}
            >
              Owner Report
            </Text>

            <Text
              style={styles.infoText}
            >
              Reports are calculated from your
              recorded sales and purchase
              transactions. Historical sales use
              the purchase cost saved at the time
              of sale.
            </Text>
          </View>
        </View>

        {filteredSales.length === 0 &&
          filteredPurchases.length === 0 && (
            <View
              style={styles.emptyCard}
            >
              <Text
                style={styles.emptyIcon}
              >
                📊
              </Text>

              <Text
                style={styles.emptyTitle}
              >
                No business data yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Complete sales or record
                purchases to see reports for
                this period.
              </Text>
            </View>
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

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 32,
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
    fontSize: 21,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },

  exportButton: {
    backgroundColor: '#111827',
    minWidth: 53,
    height: 42,
    paddingHorizontal: 9,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  exportButtonDisabled: {
    opacity: 0.55,
  },

  exportIcon: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 16,
  },

  exportText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 2,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  intro: {
    marginBottom: 15,
  },

  introTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },

  introText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },

  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    marginLeft: 9,
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 15,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#FEE2E2',
    textAlign: 'center',
    lineHeight: 28,
    color: '#DC2626',
    fontWeight: '900',
  },

  errorContent: {
    flex: 1,
    marginLeft: 9,
  },

  errorTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#991B1B',
  },

  errorText: {
    fontSize: 9,
    color: '#B91C1C',
    marginTop: 2,
  },

  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 12,
    marginBottom: 14,
  },

  periodLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 9,
    marginLeft: 3,
  },

  periodRow: {
    flexDirection: 'row',
  },

  periodButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 2,
  },

  periodButtonActive: {
    backgroundColor: '#111827',
  },

  periodText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
  },

  periodTextActive: {
    color: '#FFFFFF',
  },

  profitCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
  },

  profitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  profitCardLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  profitAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 6,
  },

  profitIconBox: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profitIcon: {
    color: '#34D399',
    fontSize: 25,
    fontWeight: '800',
  },

  profitBottom: {
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  marginText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },

  transactionText: {
    color: '#9CA3AF',
    fontSize: 10,
  },

  statsGrid: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginHorizontal: 4,
  },

  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  salesIconBox: {
    backgroundColor: '#ECFDF5',
  },

  purchaseIconBox: {
    backgroundColor: '#FFF7ED',
  },

  statIcon: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },

  statLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.6,
  },

  statValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginTop: 5,
  },

  purchaseValue: {
    color: '#B45309',
  },

  statSub: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 17,
    marginBottom: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },

  sectionSub: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 3,
  },

  movementBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  movementBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#4B5563',
  },

  activityRow: {
    flexDirection: 'row',
    marginTop: 18,
  },

  activityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  soldIcon: {
    backgroundColor: '#ECFDF5',
  },

  restockIcon: {
    backgroundColor: '#EEF2FF',
  },

  activityLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.7,
  },

  activityValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
    marginTop: 1,
  },

  activitySub: {
    fontSize: 8,
    color: '#9CA3AF',
  },

  verticalDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E5E7EB',
  },

  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 17,
    marginBottom: 14,
  },

  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },

  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  breakdownDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },

  salesDot: {
    backgroundColor: '#10B981',
  },

  costDot: {
    backgroundColor: '#F59E0B',
  },

  profitDot: {
    backgroundColor: '#4F46E5',
  },

  breakdownLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },

  profitLabel: {
    color: '#111827',
    fontWeight: '800',
  },

  breakdownValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
  },

  breakdownCost: {
    fontSize: 12,
    fontWeight: '900',
    color: '#B45309',
  },

  breakdownProfit: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
  },

  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 16,
  },

  monthlyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 17,
    marginBottom: 14,
  },

  yearBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },

  yearBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#4F46E5',
  },

  yearSummary: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 13,
    marginTop: 17,
    marginBottom: 5,
  },

  yearSummaryItem: {
    flex: 1,
  },

  yearSummaryLabel: {
    fontSize: 7,
    fontWeight: '900',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },

  yearSummaryValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginTop: 4,
  },

  yearProfitValue: {
    color: '#059669',
  },

  monthRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  lastMonthRow: {
    borderBottomWidth: 0,
  },

  monthNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  monthNumber: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  monthNumberActive: {
    backgroundColor: '#111827',
  },

  monthNumberText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9CA3AF',
  },

  monthNumberTextActive: {
    color: '#FFFFFF',
  },

  monthName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },

  monthPieces: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 3,
  },

  monthFinancial: {
    alignItems: 'flex-end',
  },

  monthSales: {
    fontSize: 11,
    fontWeight: '900',
    color: '#111827',
  },

  monthProfit: {
    fontSize: 8,
    color: '#059669',
    fontWeight: '700',
    marginTop: 3,
  },

  exportInfoCard: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  exportInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  exportInfoIconText: {
    color: '#34D399',
    fontSize: 20,
    fontWeight: '900',
  },

  exportInfoContent: {
    flex: 1,
  },

  exportInfoTitle: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  exportInfoText: {
    color: '#9CA3AF',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
  },

  infoIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 25,
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '900',
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#374151',
  },

  infoText: {
    fontSize: 9,
    lineHeight: 14,
    color: '#6B7280',
    marginTop: 3,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 30,
    alignItems: 'center',
    marginTop: 2,
  },

  emptyIcon: {
    fontSize: 35,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginTop: 10,
  },

  emptyText: {
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 15,
    color: '#9CA3AF',
    marginTop: 5,
  },
});