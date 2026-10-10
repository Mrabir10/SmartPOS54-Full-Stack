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
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

// =====================================================
// BACKEND API
// =====================================================

const API_BASE_URL =
  'http://192.168.1.102:3000';

export default function SalesHistoryScreen({
  navigation,
  sales = [],
}) {
  const [search, setSearch] =
    useState('');

  const [dbSales, setDbSales] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  // =====================================================
  // LOAD SALES FROM DATABASE
  // =====================================================

  const loadSales = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError('');

        const response =
          await fetch(
            `${API_BASE_URL}/sales`,
          );

        if (!response.ok) {
          throw new Error(
            `Server error: ${response.status}`,
          );
        }

        const data =
          await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            'Invalid sales data received from server',
          );
        }

        // =================================================
        // CONVERT BACKEND DATA → SCREEN DATA
        // =================================================

        const formattedSales =
          data.map((sale) => ({
            id: sale.id,

            saleNumber:
              sale.invoiceNumber ||
              `SP${String(
                sale.id,
              ).padStart(4, '0')}`,

            date:
              sale.createdAt,

            grandTotal:
              Number(
                sale.totalAmount || 0,
              ),

            totalPurchaseCost:
              Number(
                sale.totalPurchaseCost ||
                  0,
              ),

            grossProfit:
              Number(
                sale.grossProfit || 0,
              ),

            paymentMethod:
              sale.paymentMethod ||
              'Cash',

            // Backend now provides this
            itemCount:
              Number(
                sale.itemsCount || 0,
              ),
          }));

        setDbSales(
          formattedSales,
        );
      } catch (err) {
        console.log(
          'SALES HISTORY ERROR:',
          err,
        );

        setError(
          'Could not load sales from server.',
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadSales(true);
  }, [loadSales]);

  // =====================================================
  // RELOAD WHEN SCREEN COMES INTO FOCUS
  // =====================================================

  useEffect(() => {
    const unsubscribe =
      navigation?.addListener?.(
        'focus',
        () => {
          loadSales(false);
        },
      );

    return unsubscribe;
  }, [
    navigation,
    loadSales,
  ]);

  // =====================================================
  // PULL TO REFRESH
  // =====================================================

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await loadSales(false);
      } finally {
        setRefreshing(false);
      }
    }, [loadSales]);

  // =====================================================
  // USE DATABASE SALES
  // =====================================================

  const activeSales = useMemo(() => {
    // Database is the primary source.
    // Fallback to props only if database
    // has not returned anything yet.

    if (dbSales.length > 0) {
      return dbSales;
    }

    return Array.isArray(sales)
      ? sales
      : [];
  }, [dbSales, sales]);

  // =====================================================
  // TODAY'S SALES
  // =====================================================

  const todaySalesList =
    useMemo(() => {
      const today =
        new Date();

      return activeSales.filter(
        (sale) => {
          if (!sale.date) {
            return false;
          }

          const saleDate =
            new Date(
              sale.date,
            );

          return (
            saleDate.getDate() ===
              today.getDate() &&
            saleDate.getMonth() ===
              today.getMonth() &&
            saleDate.getFullYear() ===
              today.getFullYear()
          );
        },
      );
    }, [activeSales]);

  // =====================================================
  // TODAY'S TOTAL SALES
  // =====================================================

  const todaySales =
    useMemo(() => {
      return todaySalesList.reduce(
        (total, sale) =>
          total +
          Number(
            sale.grandTotal || 0,
          ),
        0,
      );
    }, [todaySalesList]);

  // =====================================================
  // TODAY'S PURCHASE COST
  // =====================================================

  const todayPurchaseCost =
    useMemo(() => {
      return todaySalesList.reduce(
        (total, sale) =>
          total +
          Number(
            sale.totalPurchaseCost ||
              0,
          ),
        0,
      );
    }, [todaySalesList]);

  // =====================================================
  // TODAY'S GROSS PROFIT
  // =====================================================

  const todayGrossProfit =
    useMemo(() => {
      return todaySalesList.reduce(
        (total, sale) =>
          total +
          Number(
            sale.grossProfit || 0,
          ),
        0,
      );
    }, [todaySalesList]);

  // =====================================================
  // SEARCH + LATEST SALES FIRST
  // =====================================================

  const filteredSales =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return [...activeSales]
        .filter((sale) => {
          const saleNumber =
            String(
              sale.saleNumber ||
                '',
            ).toLowerCase();

          const invoiceNumber =
            String(
              sale.invoiceNumber ||
                '',
            ).toLowerCase();

          const databaseId =
            String(
              sale.id || '',
            ).toLowerCase();

          return (
            saleNumber.includes(
              searchText,
            ) ||
            invoiceNumber.includes(
              searchText,
            ) ||
            databaseId.includes(
              searchText,
            )
          );
        })
        .sort((a, b) => {
          const dateA =
            new Date(
              a.date || 0,
            ).getTime();

          const dateB =
            new Date(
              b.date || 0,
            ).getTime();

          return (
            dateB - dateA
          );
        });
    }, [
      activeSales,
      search,
    ]);

  // =====================================================
  // FORMAT CURRENCY
  // =====================================================

  const formatCurrency =
    (amount) =>
      Number(
        amount || 0,
      ).toLocaleString(
        'en-BD',
      );

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (
    loading &&
    dbSales.length === 0
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIconBox
            }
          >
            <Text
              style={
                styles.loadingIcon
              }
            >
              🧾
            </Text>
          </View>

          <ActivityIndicator
            size="small"
            color="#111827"
            style={{
              marginTop: 18,
            }}
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading Sales
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Fetching your latest
            transactions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >

      {/* =================================================
          HEADER
      ================================================== */}

      <View
        style={styles.header}
      >

        <TouchableOpacity
          style={
            styles.backButton
          }
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            ‹
          </Text>
        </TouchableOpacity>

        <View
          style={
            styles.headerText
          }
        >

          <Text
            style={
              styles.headerSmall
            }
          >
            SMARTPOS
          </Text>

          <Text
            style={
              styles.headerTitle
            }
          >
            Sales History
          </Text>

        </View>

        <View
          style={
            styles.headerBadge
          }
        >

          <Text
            style={
              styles.headerBadgeText
            }
          >
            {activeSales.length}
          </Text>

        </View>

      </View>

      {/* =================================================
          CONTENT
      ================================================== */}

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              handleRefresh
            }
            tintColor="#111827"
          />
        }
      >

        {/* =================================================
            ERROR
        ================================================== */}

        {error ? (
          <View
            style={
              styles.errorCard
            }
          >

            <View
              style={
                styles.errorIconBox
              }
            >
              <Text
                style={
                  styles.errorIcon
                }
              >
                !
              </Text>
            </View>

            <View
              style={
                styles.errorContent
              }
            >

              <Text
                style={
                  styles.errorTitle
                }
              >
                Connection Problem
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {error}
              </Text>

            </View>

            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={() =>
                loadSales(true)
              }
            >
              <Text
                style={
                  styles.retryText
                }
              >
                Retry
              </Text>
            </TouchableOpacity>

          </View>
        ) : null}

        {/* =================================================
            TODAY SUMMARY
        ================================================== */}

        <View
          style={
            styles.summaryCard
          }
        >

          <View
            style={
              styles.summaryMain
            }
          >

            <Text
              style={
                styles.summarySmall
              }
            >
              TODAY'S SALES
            </Text>

            <Text
              style={
                styles.summaryAmount
              }
            >
              ৳
              {formatCurrency(
                todaySales,
              )}
            </Text>

            <Text
              style={
                styles.summarySub
              }
            >
              {
                todaySalesList.length
              }{' '}
              completed
              transactions
            </Text>

          </View>

          <View
            style={
              styles.summaryIcon
            }
          >

            <Text
              style={
                styles.summaryIconText
              }
            >
              ↗
            </Text>

          </View>

        </View>

        {/* =================================================
            BUSINESS SUMMARY
        ================================================== */}

        <View
          style={
            styles.businessSummaryCard
          }
        >

          {/* SALES */}

          <View
            style={
              styles.businessStat
            }
          >

            <Text
              style={
                styles.businessLabel
              }
            >
              SALES
            </Text>

            <Text
              style={
                styles.businessValue
              }
            >
              ৳
              {formatCurrency(
                todaySales,
              )}
            </Text>

          </View>

          <View
            style={
              styles.businessDivider
            }
          />

          {/* COST */}

          <View
            style={
              styles.businessStat
            }
          >

            <Text
              style={
                styles.businessLabel
              }
            >
              COST
            </Text>

            <Text
              style={
                styles.costValue
              }
            >
              ৳
              {formatCurrency(
                todayPurchaseCost,
              )}
            </Text>

          </View>

          <View
            style={
              styles.businessDivider
            }
          />

          {/* PROFIT */}

          <View
            style={
              styles.businessStat
            }
          >

            <Text
              style={
                styles.businessLabel
              }
            >
              GROSS PROFIT
            </Text>

            <Text
              style={
                styles.profitValue
              }
            >
              ৳
              {formatCurrency(
                todayGrossProfit,
              )}
            </Text>

          </View>

        </View>

        {/* =================================================
            SEARCH
        ================================================== */}

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
            placeholder="Search sale ID"
            placeholderTextColor="#9CA3AF"
            value={search}
            onChangeText={
              setSearch
            }
            autoCapitalize="none"
          />

          {search.length > 0 ? (
            <TouchableOpacity
              onPress={() =>
                setSearch('')
              }
            >
              <Text
                style={
                  styles.clearSearch
                }
              >
                ×
              </Text>
            </TouchableOpacity>
          ) : null}

        </View>

        {/* =================================================
            SECTION HEADER
        ================================================== */}

        <View
          style={
            styles.sectionHeader
          }
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              Recent Transactions
            </Text>

            <Text
              style={
                styles.sectionSub
              }
            >
              Your latest completed
              sales
            </Text>

          </View>

          <Text
            style={
              styles.filterText
            }
          >
            {search.trim()
              ? `${filteredSales.length} Results`
              : 'All'}
          </Text>

        </View>

        {/* =================================================
            SALES LIST
        ================================================== */}

        {filteredSales.map(
          (sale, index) => {
            const saleDate =
              sale.date
                ? new Date(
                    sale.date,
                  )
                : new Date();

            const dateText =
              saleDate.toLocaleDateString(
                'en-GB',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                },
              );

            const timeText =
              saleDate.toLocaleTimeString(
                'en-US',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                },
              );

            // =================================================
            // ITEM COUNT
            // =================================================

            const itemCount =
              sale.itemCount ??
              sale.itemsCount ??
              sale.cart?.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  Number(
                    item.quantity ||
                      0,
                  ),
                0,
              ) ??
              0;

            // =================================================
            // SALES AMOUNT
            // =================================================

            const salesAmount =
              Number(
                sale.grandTotal ||
                  sale.totalAmount ||
                  0,
              );

            // =================================================
            // PURCHASE COST
            // =================================================

            const purchaseCost =
              Number(
                sale.totalPurchaseCost ||
                  0,
              );

            // =================================================
            // GROSS PROFIT
            // =================================================

            const grossProfit =
              Number(
                sale.grossProfit ??
                  salesAmount -
                    purchaseCost,
              );

            // =================================================
            // COST DATA EXISTS
            // =================================================

            const hasCostData =
              sale.totalPurchaseCost !==
                undefined &&
              sale.totalPurchaseCost !==
                null;

            return (
              <TouchableOpacity
                key={
                  sale.id ??
                  sale.saleNumber ??
                  `${sale.date}-${index}`
                }
                style={
                  styles.saleCard
                }
                activeOpacity={0.8}
              >

                {/* =========================================
                    LEFT SIDE
                ========================================== */}

                <View
                  style={
                    styles.saleLeft
                  }
                >

                  <View
                    style={
                      styles.saleIconBox
                    }
                  >

                    <Text
                      style={
                        styles.saleIcon
                      }
                    >
                      🧾
                    </Text>

                  </View>

                  <View
                    style={
                      styles.saleInfo
                    }
                  >

                    <Text
                      style={
                        styles.saleId
                      }
                    >
                      {sale.saleNumber ||
                        sale.invoiceNumber ||
                        '#SP0000'}
                    </Text>

                    <Text
                      style={
                        styles.saleDate
                      }
                    >
                      {dateText} •{' '}
                      {timeText}
                    </Text>

                    <View
                      style={
                        styles.saleMeta
                      }
                    >

                      <Text
                        style={
                          styles.itemText
                        }
                      >
                        {itemCount}{' '}
                        items
                      </Text>

                      <View
                        style={
                          styles.dot
                        }
                      />

                      <Text
                        style={
                          styles.methodText
                        }
                      >
                        {sale.paymentMethod ||
                          'Cash'}
                      </Text>

                    </View>

                  </View>

                </View>

                {/* =========================================
                    RIGHT SIDE
                ========================================== */}

                <View
                  style={
                    styles.saleRight
                  }
                >

                  <Text
                    style={
                      styles.saleAmount
                    }
                  >
                    ৳
                    {formatCurrency(
                      salesAmount,
                    )}
                  </Text>

                  <Text
                    style={
                      styles.paidText
                    }
                  >
                    PAID
                  </Text>

                </View>

                {/* =========================================
                    FINANCIAL DETAILS
                ========================================== */}

                <View
                  style={
                    styles.financialSection
                  }
                >

                  {/* COST */}

                  <View
                    style={
                      styles.financialRow
                    }
                  >

                    <Text
                      style={
                        styles.financialLabel
                      }
                    >
                      Purchase Cost
                    </Text>

                    <Text
                      style={
                        styles.costText
                      }
                    >
                      {hasCostData
                        ? `৳${formatCurrency(
                            purchaseCost,
                          )}`
                        : 'Not recorded'}
                    </Text>

                  </View>

                  {/* PROFIT */}

                  <View
                    style={
                      styles.financialRow
                    }
                  >

                    <Text
                      style={
                        styles.financialLabel
                      }
                    >
                      Gross Profit
                    </Text>

                    {hasCostData ? (
                      <View
                        style={
                          styles.profitBadge
                        }
                      >

                        <Text
                          style={
                            styles.profitText
                          }
                        >
                          + ৳
                          {formatCurrency(
                            grossProfit,
                          )}
                        </Text>

                      </View>
                    ) : (
                      <Text
                        style={
                          styles.notAvailableText
                        }
                      >
                        —
                      </Text>
                    )}

                  </View>

                </View>

              </TouchableOpacity>
            );
          },
        )}

        {/* =================================================
            EMPTY STATE
        ================================================== */}

        {filteredSales.length ===
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
              No sales found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              {search.trim()
                ? 'Try searching with another sale ID.'
                : 'Completed sales will appear here.'}
            </Text>

          </View>
        )}

      </ScrollView>

      {/* =================================================
          NEW SALE
      ================================================== */}

      <View
        style={
          styles.bottomBar
        }
      >

        <TouchableOpacity
          style={
            styles.newSaleButton
          }
          onPress={() =>
            navigation.navigate(
              'Sales',
            )
          }
        >

          <Text
            style={
              styles.newSaleIcon
            }
          >
            +
          </Text>

          <Text
            style={
              styles.newSaleText
            }
          >
            New Sale
          </Text>

        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  // =====================================================
  // HEADER
  // =====================================================

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

  backText: {
    fontSize: 32,
    color: '#111827',
    marginTop: -3,
  },

  headerText: {
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
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },

  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // =====================================================
  // CONTENT
  // =====================================================

  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // =====================================================
  // LOADING
  // =====================================================

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingIcon: {
    fontSize: 32,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 15,
  },

  loadingText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
  },

  // =====================================================
  // ERROR
  // =====================================================

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 13,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },

  errorIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorIcon: {
    color: '#DC2626',
    fontSize: 20,
    fontWeight: '900',
  },

  errorContent: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
  },

  errorText: {
    fontSize: 10,
    color: '#B91C1C',
    marginTop: 2,
  },

  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 9,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // =====================================================
  // TODAY SUMMARY
  // =====================================================

  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 23,
    padding: 21,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  summaryMain: {
    flex: 1,
  },

  summarySmall: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 7,
  },

  summarySub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 5,
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summaryIconText: {
    color: '#34D399',
    fontSize: 25,
    fontWeight: '800',
  },

  // =====================================================
  // BUSINESS SUMMARY
  // =====================================================

  businessSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  businessStat: {
    flex: 1,
    alignItems: 'center',
  },

  businessLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
  },

  businessValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#111827',
    marginTop: 5,
  },

  costValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6B7280',
    marginTop: 5,
  },

  profitValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#059669',
    marginTop: 5,
  },

  businessDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },

  // =====================================================
  // SEARCH
  // =====================================================

  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  searchIcon: {
    fontSize: 17,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },

  clearSearch: {
    fontSize: 25,
    color: '#9CA3AF',
    fontWeight: '400',
    paddingLeft: 8,
  },

  // =====================================================
  // SECTION
  // =====================================================

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  filterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4F46E5',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },

  // =====================================================
  // SALE CARD
  // =====================================================

  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },

  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 75,
  },

  saleIconBox: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  saleIcon: {
    fontSize: 21,
  },

  saleInfo: {
    flex: 1,
  },

  saleId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  saleDate: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 3,
  },

  saleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },

  itemText: {
    fontSize: 10,
    color: '#6B7280',
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 7,
  },

  methodText: {
    fontSize: 10,
    color: '#6B7280',
  },

  saleRight: {
    position: 'absolute',
    right: 15,
    top: 15,
    alignItems: 'flex-end',
  },

  saleAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#111827',
  },

  paidText: {
    color: '#16A34A',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 5,
  },

  // =====================================================
  // FINANCIAL DETAILS
  // =====================================================

  financialSection: {
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F3',
  },

  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },

  financialLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },

  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },

  profitBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  profitText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '900',
  },

  notAvailableText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '800',
  },

  // =====================================================
  // EMPTY STATE
  // =====================================================

  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },

  emptyIcon: {
    fontSize: 38,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
  },

  emptyText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 5,
  },

  // =====================================================
  // BOTTOM BAR
  // =====================================================

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  newSaleButton: {
    backgroundColor: '#111827',
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  newSaleIcon: {
    color: '#FFFFFF',
    fontSize: 23,
    marginRight: 8,
  },

  newSaleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

});