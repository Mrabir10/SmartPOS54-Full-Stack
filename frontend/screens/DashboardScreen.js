import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';


const API_BASE_URL = 'http://192.168.1.102:3000';


/* ================================================= */
/* ============== BANGLADESH DATE HELPERS ========== */
/* ================================================= */

const getDhakaDateKey = (dateValue) => {
  if (!dateValue) {
    return '';
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
    return '';
  }

  // Bangladesh is UTC+6 year-round. Using UTC fields
  // after shifting avoids Intl/time-zone support differences
  // across Android/Hermes devices.
  const dhakaTime = new Date(
    date.getTime() + 6 * 60 * 60 * 1000
  );

  const year = dhakaTime.getUTCFullYear();
  const month = String(
    dhakaTime.getUTCMonth() + 1
  ).padStart(2, '0');
  const day = String(
    dhakaTime.getUTCDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


const getDhakaTodayKey = () => {
  return getDhakaDateKey(
    new Date()
  );
};


const getDhakaYesterdayKey = () => {
  return getDhakaDateKey(
    new Date(
      Date.now() -
        24 * 60 * 60 * 1000
    )
  );
};

export default function DashboardScreen({
  navigation,
  products = [],
  sales = [],
}) {

  /* ================================================= */
  /* ================= DATABASE STATE ================= */
  /* ================================================= */

  const [dbProducts, setDbProducts] =
    useState([]);

  const [dbSales, setDbSales] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');


  /* ================================================= */
  /* ================= LOAD DATABASE ================= */
  /* ================================================= */

  const loadDashboardData =
    useCallback(
      async (isRefresh = false) => {

        try {

          setError('');

          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }


          const [
            productsResponse,
            salesResponse,
          ] = await Promise.all([
            fetch(
              `${API_BASE_URL}/products?_=${Date.now()}`
            ),

            fetch(
              `${API_BASE_URL}/sales?_=${Date.now()}`
            ),
          ]);


          if (
            !productsResponse.ok ||
            !salesResponse.ok
          ) {
            throw new Error(
              'Failed to load dashboard data'
            );
          }


          const productsData =
            await productsResponse.json();

          const salesData =
            await salesResponse.json();


          setDbProducts(
            Array.isArray(
              productsData
            )
              ? productsData
              : []
          );


          setDbSales(
            Array.isArray(
              salesData
            )
              ? salesData
              : []
          );

        } catch (err) {

          console.log(
            'DASHBOARD DATABASE ERROR:',
            err
          );

          setError(
            'Unable to connect to SmartPOS54 database.'
          );

        } finally {

          setLoading(false);
          setRefreshing(false);

        }
      },
      []
    );


  /* ================================================= */
  /* =============== LOAD ON SCREEN FOCUS ============ */
  /* ================================================= */

  useFocusEffect(
    useCallback(() => {

      loadDashboardData(false);

    }, [loadDashboardData])
  );


  /* ================================================= */
  /* ================= REFRESH ======================== */
  /* ================================================= */

  const handleRefresh = () => {
    loadDashboardData(true);
  };


  /* ================================================= */
  /* ================= DATA MAPPING =================== */
  /* ================================================= */

  const productsData =
    dbProducts.length > 0
      ? dbProducts.map(
          (product) => ({
            id: product.id,

            name: product.name,

            barcode:
              product.productCode,

            productCode:
              product.productCode,

            price:
              Number(
                product.sellingPrice || 0
              ),

            sellingPrice:
              Number(
                product.sellingPrice || 0
              ),

            purchasePrice:
              Number(
                product.purchasePrice || 0
              ),

            size:
              product.size || '',

            stock:
              Number(
                product.stock || 0
              ),

            createdAt:
              product.createdAt,
          })
        )
      : products;


  const salesData =
    dbSales.length > 0
      ? dbSales.map(
          (sale) => ({
            id: sale.id,

            saleNumber:
              sale.invoiceNumber ||
              `SP${String(
                sale.id
              ).padStart(4, '0')}`,

            invoiceNumber:
              sale.invoiceNumber,

            date:
              sale.createdAt ||
              sale.date ||
              '',

            grandTotal:
              Number(
                sale.totalAmount ??
                sale.grandTotal ??
                0
              ),

            totalPurchaseCost:
              Number(
                sale.totalPurchaseCost ||
                0
              ),

            grossProfit:
              Number(
                sale.grossProfit || 0
              ),

            paymentMethod:
              sale.paymentMethod ||
              'Cash',

            itemCount:
              Number(
                sale.itemsCount || 0
              ),
          })
        )
      : sales;


  /* ================================================= */
  /* ================= TODAY KEY ====================== */
  /* ================================================= */

  const todayKey =
    getDhakaTodayKey();


  /* ================================================= */
  /* ================ YESTERDAY KEY ================== */
  /* ================================================= */

  const yesterdayKey =
    getDhakaYesterdayKey();


  /* ================================================= */
  /* ================= TODAY SALES ==================== */
  /* ================================================= */

  const todaySales =
    useMemo(() => {

      return salesData
        .filter(
          (sale) =>
            getDhakaDateKey(
              sale.date
            ) === todayKey
        )
        .reduce(
          (
            total,
            sale
          ) =>
            total +
            Number(
              sale.grandTotal || 0
            ),
          0
        );

    }, [
      salesData,
      todayKey,
    ]);


  /* ================================================= */
  /* ================= YESTERDAY SALES ================ */
  /* ================================================= */

  const yesterdaySales =
    useMemo(() => {

      return salesData
        .filter(
          (sale) =>
            getDhakaDateKey(
              sale.date
            ) === yesterdayKey
        )
        .reduce(
          (
            total,
            sale
          ) =>
            total +
            Number(
              sale.grandTotal || 0
            ),
          0
        );

    }, [
      salesData,
      yesterdayKey,
    ]);


  /* ================================================= */
  /* ================= SALES CHANGE =================== */
  /* ================================================= */

  const salesChange =
    useMemo(() => {

      if (
        yesterdaySales === 0
      ) {

        if (
          todaySales === 0
        ) {
          return 0;
        }

        return 100;
      }


      return (
        (
          (
            todaySales -
            yesterdaySales
          ) /
          yesterdaySales
        ) * 100
      );

    }, [
      todaySales,
      yesterdaySales,
    ]);


  const salesChangeText =
    `${salesChange >= 0 ? '↑' : '↓'} ${
      Math.abs(
        salesChange
      ).toFixed(1)
    }%`;


  /* ================================================= */
  /* ================= TODAY ORDERS =================== */
  /* ================================================= */

  const todayOrders =
    useMemo(() => {

      return salesData.filter(
        (sale) =>
          getDhakaDateKey(
            sale.date
          ) === todayKey
      ).length;

    }, [
      salesData,
      todayKey,
    ]);


  /* ================================================= */
  /* ================= LOW STOCK ====================== */
  /* ================================================= */

  const lowStockProducts =
    useMemo(() => {

      return productsData
        .filter(
          (product) =>
            Number(
              product.stock
            ) <= 5
        )
        .sort(
          (a, b) =>
            Number(a.stock) -
            Number(b.stock)
        );

    }, [
      productsData,
    ]);


  /* ================================================= */
  /* ================= RECENT SALES =================== */
  /* ================================================= */

  const recentSales =
    useMemo(() => {

      return salesData
        .slice()
        .sort(
          (a, b) =>
            new Date(
              b.date
            ).getTime() -
            new Date(
              a.date
            ).getTime()
        )
        .slice(0, 3);

    }, [
      salesData,
    ]);


  /* ================================================= */
  /* ================= LOADING ======================== */
  /* ================================================= */

  if (
    loading &&
    dbProducts.length === 0 &&
    dbSales.length === 0
  ) {

    return (
      <View
        style={
          styles.loadingContainer
        }
      >

        <StatusBar
          style="dark"
        />

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
            📊
          </Text>

        </View>


        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading Dashboard
        </Text>


        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Syncing with SmartPOS54 database...
        </Text>


        <ActivityIndicator
          size="small"
          style={
            styles.loadingSpinner
          }
        />

      </View>
    );
  }


  /* ================================================= */
  /* ================= MAIN UI ======================== */
  /* ================================================= */

  return (
    <View
      style={styles.container}
    >

      <StatusBar
        style="dark"
      />


      <ScrollView
        showsVerticalScrollIndicator={false}
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
          />
        }
      >


        {/* ================= HEADER ================= */}

        <View
          style={styles.header}
        >

          <View>

            <Text
              style={
                styles.greeting
              }
            >
              Good Morning 👋
            </Text>


            <Text
              style={styles.title}
            >
              SmartPOS54
            </Text>

          </View>


          <TouchableOpacity
            style={
              styles.profileButton
            }
          >

            <Text
              style={
                styles.profileText
              }
            >
              A
            </Text>

          </TouchableOpacity>

        </View>


        {/* ================= ERROR ================= */}

        {error ? (

          <View
            style={
              styles.errorCard
            }
          >

            <View>

              <Text
                style={
                  styles.errorTitle
                }
              >
                Database Connection
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
                loadDashboardData(
                  true
                )
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


        {/* ================= SALES SUMMARY ================= */}

        <View
          style={
            styles.salesCard
          }
        >

          <Text
            style={
              styles.salesLabel
            }
          >
            Today's Sales
          </Text>


          <Text
            style={
              styles.salesAmount
            }
          >
            ৳{' '}
            {todaySales.toLocaleString()}
          </Text>


          <View
            style={
              styles.salesBottom
            }
          >

            <Text
              style={[
                styles.salesChange,
                {
                  color:
                    salesChange >= 0
                      ? '#34D399'
                      : '#F87171',
                },
              ]}
            >
              {salesChangeText}
            </Text>


            <Text
              style={
                styles.salesCompare
              }
            >
              compared to yesterday
            </Text>

          </View>

        </View>


        {/* ================= STATISTICS ================= */}

        <View
          style={styles.statsRow}
        >


          {/* PRODUCTS */}

          <TouchableOpacity
            style={
              styles.statCard
            }
            onPress={() =>
              navigation.navigate(
                'ProductList'
              )
            }
          >

            <Text
              style={
                styles.statIcon
              }
            >
              📦
            </Text>


            <Text
              style={
                styles.statValue
              }
            >
              {productsData.length}
            </Text>


            <Text
              style={
                styles.statLabel
              }
            >
              Products
            </Text>

          </TouchableOpacity>


          {/* ORDERS */}

          <TouchableOpacity
            style={
              styles.statCard
            }
            onPress={() =>
              navigation.navigate(
                'SalesHistory'
              )
            }
          >

            <Text
              style={
                styles.statIcon
              }
            >
              🛒
            </Text>


            <Text
              style={
                styles.statValue
              }
            >
              {todayOrders}
            </Text>


            <Text
              style={
                styles.statLabel
              }
            >
              Today's Orders
            </Text>

          </TouchableOpacity>

        </View>


        {/* ================= LOW STOCK ================= */}

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
            Low Stock
          </Text>


          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'ProductList'
              )
            }
          >

            <Text
              style={
                styles.viewAll
              }
            >
              View All
            </Text>

          </TouchableOpacity>

        </View>


        {lowStockProducts.length ===
        0 ? (

          <View
            style={
              styles.emptyStockCard
            }
          >

            <Text
              style={
                styles.emptyStockIcon
              }
            >
              ✅
            </Text>


            <View>

              <Text
                style={
                  styles.emptyStockTitle
                }
              >
                Stock looks good
              </Text>


              <Text
                style={
                  styles.emptyStockText
                }
              >
                No products are currently low in stock.
              </Text>

            </View>

          </View>

        ) : (

          lowStockProducts
            .slice(0, 5)
            .map(
              (product) => (

                <View
                  key={
                    product.id
                  }
                  style={
                    styles.stockCard
                  }
                >

                  <View
                    style={
                      styles.productInfo
                    }
                  >

                    <View
                      style={
                        styles.productIcon
                      }
                    >

                      <Text>
                        👕
                      </Text>

                    </View>


                    <View
                      style={
                        styles.productTextContainer
                      }
                    >

                      <Text
                        style={
                          styles.productName
                        }
                        numberOfLines={
                          1
                        }
                      >
                        {product.name}
                      </Text>


                      <Text
                        style={
                          styles.productDetails
                        }
                      >
                        Size{' '}
                        {product.size ||
                          'All'}{' '}
                        • ৳
                        {Number(
                          product.sellingPrice ||
                          product.price ||
                          0
                        ).toLocaleString()}
                      </Text>

                    </View>

                  </View>


                  <View
                    style={
                      styles.stockBadge
                    }
                  >

                    <Text
                      style={
                        styles.stockText
                      }
                    >
                      {product.stock}{' '}
                      left
                    </Text>

                  </View>

                </View>

              )
            )

        )}


        {/* ================= QUICK ACTIONS ================= */}

        <Text
          style={[
            styles.sectionTitle,
            {
              marginTop: 28,
            },
          ]}
        >
          Quick Actions
        </Text>


        <View
          style={
            styles.actionsRow
          }
        >


          {/* BARCODE SCAN */}

          <TouchableOpacity
            style={
              styles.actionCard
            }
            onPress={() =>
              navigation.navigate(
                'BarcodeScanner'
              )
            }
          >

            <Text
              style={
                styles.actionIcon
              }
            >
              📷
            </Text>


            <Text
              style={
                styles.actionText
              }
            >
              Scan Barcode
            </Text>

          </TouchableOpacity>


          {/* PHOTO */}

          <TouchableOpacity
            style={
              styles.actionCard
            }
            onPress={() =>
              navigation.navigate(
                'ProductPhotoScanner'
              )
            }
          >

            <Text
              style={
                styles.actionIcon
              }
            >
              🖼️
            </Text>


            <Text
              style={
                styles.actionText
              }
            >
              Identify by Photo
            </Text>

          </TouchableOpacity>


          {/* ADD PRODUCT */}

          <TouchableOpacity
            style={
              styles.actionCard
            }
            onPress={() =>
              navigation.navigate(
                'AddProduct'
              )
            }
          >

            <Text
              style={
                styles.actionIcon
              }
            >
              ➕
            </Text>


            <Text
              style={
                styles.actionText
              }
            >
              Add Product
            </Text>

          </TouchableOpacity>


          {/* NEW SALE */}

          <TouchableOpacity
            style={
              styles.actionCard
            }
            onPress={() =>
              navigation.navigate(
                'Sales'
              )
            }
          >

            <Text
              style={
                styles.actionIcon
              }
            >
              🛒
            </Text>


            <Text
              style={
                styles.actionText
              }
            >
              New Sale
            </Text>

          </TouchableOpacity>


          {/* STOCK MOVEMENT */}

          <TouchableOpacity
            style={
              styles.actionCard
            }
            onPress={() =>
              navigation.navigate(
                'StockMovementHistory'
              )
            }
          >

            <Text
              style={
                styles.actionIcon
              }
            >
              📊
            </Text>


            <Text
              style={
                styles.actionText
              }
            >
              Stock Movement
            </Text>

          </TouchableOpacity>


          {/* BUSINESS REPORT */}

          <TouchableOpacity
            style={[
              styles.actionCard,
              styles.reportActionCard,
            ]}
            onPress={() =>
              navigation.navigate(
                'Reports'
              )
            }
          >

            <View
              style={
                styles.reportIconBox
              }
            >

              <Text
                style={
                  styles.reportIcon
                }
              >
                📈
              </Text>

            </View>


            <Text
              style={[
                styles.actionText,
                styles.reportActionText,
              ]}
            >
              Business Reports
            </Text>


            <Text
              style={
                styles.reportSubText
              }
            >
              Sales • Cost • Profit
            </Text>

          </TouchableOpacity>

        </View>


        {/* ================= RECENT SALES ================= */}

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
            Recent Sales
          </Text>


          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                'SalesHistory'
              )
            }
          >

            <Text
              style={
                styles.viewAll
              }
            >
              View All
            </Text>

          </TouchableOpacity>

        </View>


        {recentSales.length ===
        0 ? (

          <View
            style={
              styles.emptySalesCard
            }
          >

            <Text
              style={
                styles.emptySalesIcon
              }
            >
              🧾
            </Text>


            <Text
              style={
                styles.emptySalesTitle
              }
            >
              No sales yet
            </Text>


            <Text
              style={
                styles.emptySalesText
              }
            >
              Completed sales will appear here.
            </Text>

          </View>

        ) : (

          recentSales.map(
            (sale) => (

              <View
                key={
                  String(
                    sale.id ||
                    sale.saleNumber
                  ) +
                  String(
                    sale.date
                  )
                }
                style={
                  styles.saleCard
                }
              >

                <View>

                  <Text
                    style={
                      styles.saleId
                    }
                  >
                    Sale{' '}
                    {sale.saleNumber}
                  </Text>


                  <Text
                    style={
                      styles.saleTime
                    }
                  >
                    {new Date(
                      sale.date
                    ).toLocaleString()}
                  </Text>

                </View>


                <Text
                  style={
                    styles.saleAmount
                  }
                >
                  ৳{' '}
                  {Number(
                    sale.grandTotal ||
                    0
                  ).toLocaleString()}
                </Text>

              </View>

            )
          )

        )}

      </ScrollView>

    </View>
  );
}


/* ================================================= */
/* ===================== STYLES ==================== */
/* ================================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 35,
  },


  /* ================= HEADER ================= */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },

  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },


  /* ================= ERROR ================= */

  errorCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 17,
    padding: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  errorTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#9A3412',
  },

  errorText: {
    fontSize: 11,
    color: '#C2410C',
    marginTop: 3,
    maxWidth: 220,
  },

  retryButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
  },

  retryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },


  /* ================= SALES ================= */

  salesCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
  },

  salesLabel: {
    color: '#D1D5DB',
    fontSize: 14,
  },

  salesAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 8,
  },

  salesBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  salesChange: {
    fontWeight: '700',
    fontSize: 13,
  },

  salesCompare: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 8,
  },


  /* ================= STATISTICS ================= */

  statsRow: {
    flexDirection: 'row',
    gap: 14,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
  },

  statIcon: {
    fontSize: 24,
    marginBottom: 10,
  },

  statValue: {
    fontSize: 23,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 3,
  },


  /* ================= SECTION ================= */

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '750',
    color: '#111827',
  },

  viewAll: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },


  /* ================= LOW STOCK ================= */

  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  productTextContainer: {
    flex: 1,
    marginRight: 10,
  },

  productIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  productDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  stockBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },

  stockText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyStockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyStockIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  emptyStockTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  emptyStockText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },


  /* ================= QUICK ACTIONS ================= */

  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },

  actionIcon: {
    fontSize: 24,
    marginBottom: 7,
  },

  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
  },


  /* ================= BUSINESS REPORT ================= */

  reportActionCard: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },

  reportIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  reportIcon: {
    fontSize: 20,
  },

  reportActionText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  reportSubText: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 4,
  },


  /* ================= RECENT SALES ================= */

  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  saleId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  saleTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },

  saleAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },


  /* ================= EMPTY SALES ================= */

  emptySalesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 20,
    alignItems: 'center',
  },

  emptySalesIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  emptySalesTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  emptySalesText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },


  /* ================= LOADING ================= */

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingIconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  loadingIcon: {
    fontSize: 30,
  },

  loadingTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  loadingSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
  },

  loadingSpinner: {
    marginTop: 18,
  },

});