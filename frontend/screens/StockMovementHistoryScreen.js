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
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = 'http://192.168.1.102:3000';

export default function StockMovementHistoryScreen({
  navigation,
  stockMovements: localStockMovements = [],
}) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [activeDateFilter, setActiveDateFilter] = useState('ALL');
  const [dbMovements, setDbMovements] = useState([]);
  const [databaseLoaded, setDatabaseLoaded] = useState(false);

  const loadMovements = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/stock-movements?_=${Date.now()}`
      );

      if (!response.ok) {
        throw new Error(
          `Stock movement API error: ${response.status}`
        );
      }

      const data = await response.json();

      const formatted = Array.isArray(data)
        ? data.map((movement) => ({
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

      setDbMovements(formatted);
      setDatabaseLoaded(true);
    } catch (error) {
      console.log(
        'Stock Movement Database Error:',
        error
      );

      setDatabaseLoaded(false);
    }
  }, []);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    const unsubscribe =
      navigation?.addListener?.(
        'focus',
        loadMovements
      );

    return unsubscribe;
  }, [navigation, loadMovements]);

  const stockMovements = databaseLoaded
    ? dbMovements
    : localStockMovements;

  const totalMovements = stockMovements.length;

  const totalRestocked = useMemo(() => {
    return stockMovements
      .filter((item) => item.type === 'RESTOCK')
      .reduce(
        (total, item) =>
          total + Number(item.quantity || 0),
        0
      );
  }, [stockMovements]);

  const totalSold = useMemo(() => {
    return stockMovements
      .filter((item) => item.type === 'SALE')
      .reduce(
        (total, item) =>
          total + Math.abs(Number(item.quantity || 0)),
        0
      );
  }, [stockMovements]);

  // DATE FILTER
  const matchesDateFilter = (dateString) => {
    if (activeDateFilter === 'ALL') {
      return true;
    }

    const movementDate = new Date(dateString);
    const now = new Date();

    // TODAY
    if (activeDateFilter === 'TODAY') {
      return (
        movementDate.getDate() === now.getDate() &&
        movementDate.getMonth() === now.getMonth() &&
        movementDate.getFullYear() === now.getFullYear()
      );
    }

    // THIS WEEK
    if (activeDateFilter === 'WEEK') {
      const startOfWeek = new Date(now);

      startOfWeek.setDate(
        now.getDate() - now.getDay()
      );

      startOfWeek.setHours(0, 0, 0, 0);

      return movementDate >= startOfWeek;
    }

    // THIS MONTH
    if (activeDateFilter === 'MONTH') {
      return (
        movementDate.getMonth() === now.getMonth() &&
        movementDate.getFullYear() === now.getFullYear()
      );
    }

    return true;
  };

  // FILTERED MOVEMENTS
  const filteredMovements = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return stockMovements.filter((item) => {
      const matchesFilter =
        activeFilter === 'ALL' ||
        item.type === activeFilter;

      const matchesDate =
        matchesDateFilter(item.date);

      const matchesSearch =
        !search ||
        item.productName
          ?.toLowerCase()
          .includes(search) ||
        item.productId
          ?.toLowerCase()
          .includes(search);

      return (
        matchesFilter &&
        matchesSearch &&
        matchesDate
      );
    });
  }, [
    stockMovements,
    activeFilter,
    searchText,
    activeDateFilter,
  ]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }
    );
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString(
      'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const handleExport = async () => {
  try {
    if (filteredMovements.length === 0) {
      alert('No stock movement available to export.');
      return;
    }

    const header =
      'Product Name,Product ID,Type,Quantity,Date,Time\n';

    const rows = filteredMovements
      .map((item) => {
        const type =
          String(item.type || 'ADJUSTMENT');

        const quantity = Number(
          item.quantity || 0
        );

        const date = formatDate(item.date);
        const time = formatTime(item.date);

        return `"${item.productName}","${item.productId}","${type}","${quantity}","${date}","${time}"`;
      })
      .join('\n');

    const csvContent = header + rows;

    const fileUri =
      FileSystem.cacheDirectory +
      'stock-movement-report.csv';

    await FileSystem.writeAsStringAsync(
      fileUri,
      csvContent,
      {
        encoding:
          FileSystem.EncodingType.UTF8,
      }
    );

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle:
        'Export Stock Movement Report',
      UTI: 'public.comma-separated-values-text',
    });
  } catch (error) {
    console.log(
      'Export Error:',
      error
    );

    alert(
      'Failed to export stock movement report.'
    );
  }
};

  const renderMovement = ({ item }) => {
    const isPositive =
      Number(item.quantity || 0) > 0;

    const typeLabels = {
      SALE: 'SALE',
      RESTOCK: 'RESTOCK',
      FACTORY_RETURN: 'FACTORY RETURN',
      DAMAGED: 'DAMAGED',
      MISSING: 'MISSING',
      ADJUSTMENT: 'ADJUSTMENT',
    };

    const typeLabel =
      typeLabels[item.type] ||
      String(item.type || 'ADJUSTMENT')
        .replace(/_/g, ' ');

    return (
      <View style={styles.movementCard}>

        <View
          style={[
            styles.movementIcon,
            isPositive
              ? styles.restockIcon
              : styles.saleIcon,
          ]}
        >
          <Text style={styles.movementIconText}>
            {isPositive ? '↙' : '↗'}
          </Text>
        </View>

        <View style={styles.movementInfo}>

          <View style={styles.productRow}>

            <Text
              style={styles.productName}
              numberOfLines={1}
            >
              {item.productName}
            </Text>

            <View
              style={[
                styles.typeBadge,
                isPositive
                  ? styles.restockBadge
                  : styles.saleBadge,
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  isPositive
                    ? styles.restockBadgeText
                    : styles.saleBadgeText,
                ]}
              >
                {typeLabel}
              </Text>
            </View>

          </View>

          <Text style={styles.productId}>
            Product ID • {item.productId}
          </Text>

          <Text style={styles.dateText}>
            {formatDate(item.date)} •{' '}
            {formatTime(item.date)}
          </Text>

        </View>

        <View style={styles.quantityContainer}>

          <Text
            style={[
              styles.quantity,
              isPositive
                ? styles.restockQuantity
                : styles.saleQuantity,
            ]}
          >
            {isPositive ? '+' : ''}
            {item.quantity}
          </Text>

          <Text style={styles.piecesText}>
            pcs
          </Text>

        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>

      <View style={styles.container}>

        {/* HEADER */}

        <View style={styles.header}>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>
              ‹
            </Text>
          </TouchableOpacity>

         <View style={styles.headerTextContainer}>

  <Text style={styles.headerTitle}>
    Stock Activity
  </Text>

  <Text style={styles.headerSubtitle}>
    Inventory movement history
  </Text>

</View>

<TouchableOpacity
  style={styles.exportButton}
  onPress={handleExport}
>
  <Text style={styles.exportIcon}>
    ↥
  </Text>

  <Text style={styles.exportText}>
    Export
  </Text>
</TouchableOpacity>

        </View>

        {/* SUMMARY */}

        <View style={styles.summaryCard}>

          <View>

            <Text style={styles.summaryLabel}>
              Total Movements
            </Text>

            <Text style={styles.summaryValue}>
              {totalMovements}
            </Text>

            <Text style={styles.summaryDescription}>
              All inventory activity
            </Text>

          </View>

          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>
              ↕
            </Text>
          </View>

        </View>

        {/* MINI STATS */}

        <View style={styles.miniStatsRow}>

          <View style={styles.miniStatCard}>

            <View style={styles.miniStatTop}>

              <View
                style={[
                  styles.miniIcon,
                  styles.restockMiniIcon,
                ]}
              >
                <Text>↙</Text>
              </View>

              <Text style={styles.miniLabel}>
                Restocked
              </Text>

            </View>

            <Text style={styles.miniValue}>
              +{totalRestocked}
            </Text>

            <Text style={styles.miniUnit}>
              pieces added
            </Text>

          </View>

          <View style={styles.miniStatCard}>

            <View style={styles.miniStatTop}>

              <View
                style={[
                  styles.miniIcon,
                  styles.saleMiniIcon,
                ]}
              >
                <Text>↗</Text>
              </View>

              <Text style={styles.miniLabel}>
                Sold
              </Text>

            </View>

            <Text style={styles.miniValue}>
              {totalSold}
            </Text>

            <Text style={styles.miniUnit}>
              pieces sold
            </Text>

          </View>

        </View>

        {/* SEARCH */}

        <View style={styles.searchBox}>

          <Text style={styles.searchIcon}>
            ⌕
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search product or ID"
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
            >
              <Text style={styles.clearText}>
                ×
              </Text>
            </TouchableOpacity>
          )}

        </View>

        {/* STOCK TYPE FILTER */}

        <View style={styles.filterContainer}>

          {[
            {
              label: 'All',
              value: 'ALL',
            },
            {
              label: 'Restock',
              value: 'RESTOCK',
            },
            {
              label: 'Sales',
              value: 'SALE',
            },
          ].map((filter) => {

            const active =
              activeFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  active &&
                    styles.activeFilterButton,
                ]}
                onPress={() =>
                  setActiveFilter(filter.value)
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    active &&
                      styles.activeFilterText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}

        </View>

        {/* DATE FILTER */}

        <View style={styles.dateFilterContainer}>

          {[
            {
              label: 'All',
              value: 'ALL',
            },
            {
              label: 'Today',
              value: 'TODAY',
            },
            {
              label: 'This Week',
              value: 'WEEK',
            },
            {
              label: 'This Month',
              value: 'MONTH',
            },
          ].map((filter) => {

            const active =
              activeDateFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.dateFilterButton,
                  active &&
                    styles.activeDateFilterButton,
                ]}
                onPress={() =>
                  setActiveDateFilter(
                    filter.value
                  )
                }
              >
                <Text
                  style={[
                    styles.dateFilterText,
                    active &&
                      styles.activeDateFilterText,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}

        </View>

        {/* SECTION HEADER */}

        <View style={styles.sectionHeader}>

          <View>

            <Text style={styles.sectionTitle}>
              Recent Activity
            </Text>

            <Text style={styles.sectionSubtitle}>
              {filteredMovements.length}{' '}
              movement
              {filteredMovements.length !== 1
                ? 's'
                : ''}{' '}
              found
            </Text>

          </View>

          <View style={styles.countBadge}>

            <Text style={styles.countBadgeText}>
              {filteredMovements.length}
            </Text>

          </View>

        </View>

        {/* MOVEMENTS */}

        <FlatList
          data={[...filteredMovements].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={renderMovement}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            filteredMovements.length === 0
              ? styles.emptyList
              : styles.listContent
          }
          ListEmptyComponent={

            <View style={styles.emptyState}>

              <View style={styles.emptyIcon}>

                <Text
                  style={styles.emptyIconText}
                >
                  {searchText
                    ? '⌕'
                    : activeFilter === 'SALE'
                    ? '🛒'
                    : activeFilter === 'RESTOCK'
                    ? '📦'
                    : '📊'}
                </Text>

              </View>

              <Text style={styles.emptyTitle}>

                {searchText
                  ? 'No Matching Activity'
                  : activeFilter === 'SALE'
                  ? 'No Sales Yet'
                  : activeFilter === 'RESTOCK'
                  ? 'No Restocks Yet'
                  : 'No Stock Activity Yet'}

              </Text>

              <Text
                style={styles.emptyDescription}
              >
                {searchText
                  ? 'Try searching with another product name or ID.'
                  : 'Sales and restocks will appear here automatically.'}
              </Text>

            </View>
          }
        />

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  backIcon: {
    fontSize: 32,
    color: '#111827',
    marginTop: -3,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#8A9099',
    marginTop: 3,
  },

  exportButton: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: '#111827',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 5,
  },

  exportText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },

  /* SUMMARY */

  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  summaryLabel: {
    color: '#AEB5C0',
    fontSize: 12,
    fontWeight: '600',
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 5,
  },

  summaryDescription: {
    color: '#8E97A5',
    fontSize: 11,
    marginTop: 2,
  },

  summaryIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#252D3A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  summaryIconText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },

  /* MINI STATS */

  miniStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  miniStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  miniStatTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  miniIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  restockMiniIcon: {
    backgroundColor: '#ECFDF3',
  },

  saleMiniIcon: {
    backgroundColor: '#FEF2F2',
  },

  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },

  miniValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginTop: 12,
  },

  miniUnit: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  /* SEARCH */

  searchBox: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E7E9ED',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },

  searchIcon: {
    fontSize: 25,
    color: '#6B7280',
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 13,
    color: '#111827',
  },

  clearText: {
    fontSize: 24,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },

  /* STOCK TYPE FILTER */

  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEEF2',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },

  filterButton: {
    flex: 1,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeFilterButton: {
    backgroundColor: '#111827',
  },

  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },

  activeFilterText: {
    color: '#FFFFFF',
  },

  /* DATE FILTER */

  dateFilterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  dateFilterButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeDateFilterButton: {
    backgroundColor: '#EEF2FF',
  },

  dateFilterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
  },

  activeDateFilterText: {
    color: '#4F46E5',
  },

  /* SECTION */

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },

  countBadge: {
    minWidth: 32,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },

  /* LIST */

  listContent: {
    paddingBottom: 30,
  },

  movementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECEEF2',
  },

  movementIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  saleIcon: {
    backgroundColor: '#FEF2F2',
  },

  restockIcon: {
    backgroundColor: '#ECFDF3',
  },

  movementIconText: {
    fontSize: 22,
    fontWeight: '800',
  },

  movementInfo: {
    flex: 1,
    minWidth: 0,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '750',
    color: '#111827',
    marginRight: 7,
  },

  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },

  saleBadge: {
    backgroundColor: '#FEF2F2',
  },

  restockBadge: {
    backgroundColor: '#ECFDF3',
  },

  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  saleBadgeText: {
    color: '#DC2626',
  },

  restockBadgeText: {
    color: '#16A34A',
  },

  productId: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 5,
  },

  dateText: {
    fontSize: 10,
    color: '#A1A6AE',
    marginTop: 4,
  },

  quantityContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  quantity: {
    fontSize: 18,
    fontWeight: '800',
  },

  saleQuantity: {
    color: '#DC2626',
  },

  restockQuantity: {
    color: '#16A34A',
  },

  piecesText: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 1,
  },

  /* EMPTY */

  emptyList: {
    flexGrow: 1,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    marginTop: 45,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyIconText: {
    fontSize: 32,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },
});