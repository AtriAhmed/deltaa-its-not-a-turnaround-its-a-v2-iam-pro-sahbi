"use client";

import { useRouter } from "expo-router";
import { getBaseUrl } from "@/utils/api";
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";

import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { format } from "date-fns";
import { useProtectedRoute } from "../../../hooks/useProtectedRoute";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
// Type definitions
interface Brand {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

// Update the SaleItem interface to remove productOption
interface SaleItem {
  productVariant: ReactNode;
  id: string;
  productName: string;
  brand: Brand;
  quantity: number;
  price: number;
  total: number;
}

// Update the Sale interface to include company information
interface Sale {
  id: string;
  items: SaleItem[];
  paymentMethod: "cash" | "credit" | "card";
  client: Client;
  total_before_discount: number;
  final_total: number;
  amountPaid: number;
  remainingCredit: number;
  creditType: "client" | "delivery" | null;
  company?: {
    id: string;
    name: string;
  } | null;
  change: number;
  date: string;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
    amount: number;
  } | null;
}

// Filter type definition
interface FilterOptions {
  client: string | null;
  paymentMethod: "cash" | "credit" | "card" | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  creditType: "client" | "delivery" | null;
}

const SaleScreen = () => {
  useProtectedRoute();
  const router = useRouter();

  // State for sales data
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State for search and filters
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    client: null,
    paymentMethod: null,
    dateRange: {
      start: null,
      end: null,
    },
    creditType: null,
  });

  // State for delete confirmation
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // State for sale details modal
  const [showSaleDetails, setShowSaleDetails] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);


  const fetchSales = async () => {
    setIsLoading(true);
    try {

      const res = await axios.get(`${getBaseUrl()}/api/sales`);
      setSales(res.data);
    } catch (error) {
      console.error("Échec du chargement des ventes :", error);
      Alert.alert("Erreur", "Échec du chargement des ventes. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };



  useEffect(() => {
    fetchSales();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSales();
    }, [])
  );

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  // Get unique clients and payment methods for filters
  const clients = Array.from(new Set(sales.map((sale) => sale.client.name)));
  const paymentMethods = ["cash", "credit"];

  // Function to filter sales
  const getFilteredSales = () => {
    return sales.filter((sale) => {
      // Search filter
      if (
        searchQuery &&
        !sale.client.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !sale.items.some(
          (item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false;
      }

      // Client filter
      if (filters.client && sale.client.name !== filters.client) {
        return false;
      }

      // Payment method filter
      if (filters.paymentMethod && sale.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      // Credit type filter
      if (filters.creditType && sale.creditType !== filters.creditType) {
        return false;
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const saleDate = new Date(sale.date);

        if (filters.dateRange.start && saleDate < filters.dateRange.start) {
          return false;
        }

        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999); // End of day
          if (saleDate > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Function to reset filters
  const resetFilters = () => {
    setFilters({
      client: null,
      paymentMethod: null,
      dateRange: {
        start: null,
        end: null,
      },
      creditType: null,
    });
    setShowFilters(false);
  };

  // Function to confirm sale deletion
  const confirmDeleteSale = (saleId: string) => {
    setSaleToDelete(saleId);
    setDeleteConfirmModal(true);
  };

  // Function to delete a sale
  const deleteSale = async () => {
    if (!saleToDelete) return;

    setIsLoading(true);
    try {
      // Dans une vraie application, vous appelleriez votre API
      await axios.delete(`${getBaseUrl()}/api/sales/${saleToDelete}`);

      // Mettre à jour l'état local
      setSales((prev) => prev.filter((sale) => sale.id !== saleToDelete));
      Alert.alert("Succès", "Vente supprimée avec succès");
    } catch (error) {
      console.error("Erreur lors de la suppression de la vente :", error);
      Alert.alert("Erreur", "Échec de la suppression de la vente");
    } finally {
      setIsLoading(false);
      setDeleteConfirmModal(false);
      setSaleToDelete(null);
    }
  };


  // Function to view sale details
  const viewSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setShowSaleDetails(true);
  };

  // Function to navigate to add sale screen
  const navigateToAddSale = () => {
    router.push("/sales/add");
  };

  // Function to navigate to edit sale screen
  const navigateToEditSale = (saleId: string) => {
    router.push(`/sales/edit/${saleId}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy • HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return "dollar-sign";
      case "credit":
        return "credit-card";
      case "card":
        return "credit-card";
      default:
        return "dollar-sign";
    }
  };

  // Update the getCreditTypeLabel function to include company name
  const getCreditTypeLabel = (type: string | null, company?: { id: string; name: string } | null) => {
    switch (type) {
      case "client":
        return "Crédit Client";
      case "delivery":
        return company ? `Crédit Livraison (${company.name})` : "Crédit Livraison";
      default:
        return null;
    }
  };


  // Calculate total sales amount
  const calculateTotalSales = () => {
    const filteredSales = getFilteredSales();
    return filteredSales.reduce((sum, sale) => sum + sale.final_total, 0).toFixed(2);
  };

  // Calculate total remaining credit
  const calculateTotalCredit = () => {
    const filteredSales = getFilteredSales();
    return filteredSales.reduce((sum, sale) => sum + sale.remainingCredit, 0).toFixed(2);
  };

  // Render each sale item
  const renderSaleItem = ({ item }: { item: Sale }) => {
    return (
      <TouchableOpacity style={styles.saleItem} onPress={() => viewSaleDetails(item)}>
        <View style={styles.saleHeader}>
          <View style={styles.saleInfo}>
            <Text style={styles.saleClient}>#{item.id} - {item.client.name}</Text>
            <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.saleAmount}>
            <Text style={styles.saleTotal}>DT {item.final_total.toFixed(2)}</Text>
            <View style={styles.paymentMethodBadge}>
              <Icon name={getPaymentMethodIcon(item.paymentMethod)} size={12} color="#fff" />
              <Text style={styles.paymentMethodText}>{item.paymentMethod}</Text>
            </View>
          </View>
        </View>

        <View style={styles.saleItemsPreview}>
          <Text style={styles.saleItemsCount}>
            {item.items.length} {item.items.length === 1 ? "article" : "articles"}
          </Text>
          <Text style={styles.saleItemsList} numberOfLines={1} ellipsizeMode="tail">
            {item.items.map((saleItem) => saleItem.productName).join(", ")}
          </Text>
        </View>

        {item.discount && (
          <View style={styles.discountInfo}>
            <View style={styles.discountBadge}>
              <Icon name="tag" size={12} color="#fff" />
              <Text style={styles.discountBadgeText}>
                {item.discount.type === "percentage" ? `${item.discount.value}% de réduction` : `DT ${item.discount.value} de réduction`}
              </Text>
            </View>
            <View style={styles.discountDetails}>
              <Text style={styles.originalPrice}>DT {item.total_before_discount.toFixed(2)}</Text>
              <Text style={styles.discountedPrice}>DT {item.final_total.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {item.remainingCredit > 0 && (
          <View style={styles.creditInfo}>
            <Text style={styles.creditLabel}>{getCreditTypeLabel(item.creditType, item.company)} :</Text>
            <Text style={styles.creditAmount}>DT {item.remainingCredit.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.saleActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigateToEditSale(item.id)}>
            <Icon name="edit-2" size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => confirmDeleteSale(item.id)}>
            <Icon name="trash-2" size={18} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

    );
  };

  const filteredSales = getFilteredSales();
  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== null && (typeof value !== "object" || Object.values(value).some((v) => v !== null))
  ).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showSearch ? (
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher des ventes..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onBlur={() => {
                if (!searchQuery) {
                  setShowSearch(false);
                }
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setShowSearch(false);
              }}
            >
              <Icon name="x" size={20} color="#999" />
            </TouchableOpacity>
          </View>

        ) : (
          <>
            <Text style={styles.title}>Ventes</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowSearch(true)}
                accessibilityLabel="Ouvrir la recherche"
              >
                <Icon name="search" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, styles.filterButton]}
                onPress={() => setShowFilters(true)}
                accessibilityLabel="Ouvrir les filtres"
              >
                <Icon name="filter" size={22} color="#007AFF" />
                {activeFiltersCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </>
        )}
      </View>

      {/* Sales Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Ventes Totales</Text>
          <Text style={styles.summaryValue}>DT {calculateTotalSales()}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Crédit Total</Text>
          <Text style={[styles.summaryValue, Number(calculateTotalCredit()) > 0 && styles.creditValue]}>
            DT {calculateTotalCredit()}
          </Text>
        </View>
      </View>


      {/* Content */}
      <View style={styles.content}>
        {/* Sales list */}
        <FlatList
          data={filteredSales}
          renderItem={renderSaleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>
                {searchQuery || activeFiltersCount > 0
                  ? "Aucune vente ne correspond à votre recherche ou à vos filtres"
                  : "Aucune vente enregistrée pour le moment"}
              </Text>
              {searchQuery || activeFiltersCount > 0 ? (
                <TouchableOpacity style={styles.emptyButton} onPress={resetFilters}>
                  <Text style={styles.emptyButtonText}>Effacer les filtres</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.emptyButton} onPress={navigateToAddSale}>
                  <Text style={styles.emptyButtonText}>Enregistrez votre première vente</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />


        {/* Add sale button */}
        <TouchableOpacity style={styles.addButton} onPress={navigateToAddSale}>
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.filterModal}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filtrer les ventes</Text>
                  <TouchableOpacity onPress={() => setShowFilters(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.filterContent}>
                  {/* Filtre Client */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Client</Text>
                    <View style={styles.filterOptions}>
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client}
                          style={[styles.filterOption, filters.client === client && styles.filterOptionSelected]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              client: filters.client === client ? null : client,
                            })
                          }
                        >
                          <Text style={[styles.filterOptionText, filters.client === client && styles.filterOptionTextSelected]}>{client}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Filtre Méthode de paiement */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Méthode de paiement</Text>
                    <View style={styles.filterOptions}>
                      {paymentMethods.map((method) => (
                        <TouchableOpacity
                          key={method}
                          style={[styles.filterOption, filters.paymentMethod === method && styles.filterOptionSelected]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              paymentMethod: filters.paymentMethod === method ? null : method,
                            })
                          }
                        >
                          <Text style={[styles.filterOptionText, filters.paymentMethod === method && styles.filterOptionTextSelected]}>
                            {method.charAt(0).toUpperCase() + method.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Filtre Type de crédit */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Type de crédit</Text>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[styles.filterOption, filters.creditType === "client" && styles.filterOptionSelected]}
                        onPress={() =>
                          setFilters({
                            ...filters,
                            creditType: filters.creditType === "client" ? null : "client",
                          })
                        }
                      >
                        <Text style={[styles.filterOptionText, filters.creditType === "client" && styles.filterOptionTextSelected]}>Crédit client</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.filterOption, filters.creditType === "delivery" && styles.filterOptionSelected]}
                        onPress={() =>
                          setFilters({
                            ...filters,
                            creditType: filters.creditType === "delivery" ? null : "delivery",
                          })
                        }
                      >
                        <Text style={[styles.filterOptionText, filters.creditType === "delivery" && styles.filterOptionTextSelected]}>Crédit livraison</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Filtre Plage de dates - Normalement un composant date picker */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Plage de dates</Text>
                    <Text style={styles.filterNote}>Les filtres de plage de dates seraient implémentés avec un sélecteur de date</Text>
                  </View>
                </ScrollView>

                <View style={styles.filterActions}>
                  <TouchableOpacity style={styles.filterResetButton} onPress={resetFilters}>
                    <Text style={styles.filterResetText}>Réinitialiser les filtres</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterApplyButton} onPress={() => setShowFilters(false)}>
                    <Text style={styles.filterApplyText}>Appliquer les filtres</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Sale Details Modal */}
      <Modal visible={showSaleDetails} transparent animationType="slide" onRequestClose={() => setShowSaleDetails(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.saleDetailsModal}>
            {/* Header */}
            <View style={styles.saleDetailsHeader}>
              <Text style={styles.saleDetailsTitle}>Sale Details</Text>
              <TouchableOpacity onPress={() => setShowSaleDetails(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Sale details content */}
            {selectedSale && (
              <ScrollView style={styles.saleDetailsContent}>
                {/* Client */}
                <View style={styles.saleDetailSection}>
                  <Text style={styles.saleDetailSectionTitle}>Client</Text>
                  <Text style={styles.saleDetailText}>{selectedSale.client.name}</Text>
                </View>

                {/* Date */}
                <View style={styles.saleDetailSection}>
                  <Text style={styles.saleDetailSectionTitle}>Date</Text>
                  <Text style={styles.saleDetailText}>{formatDate(selectedSale.date)}</Text>
                </View>

                {/* Payment Method */}
                <View style={styles.saleDetailSection}>
                  <Text style={styles.saleDetailSectionTitle}>Payment Method</Text>
                  <View style={[styles.paymentMethodBadge, styles.paymentMethodBadgeLarge]}>
                    <Icon name={getPaymentMethodIcon(selectedSale.paymentMethod)} size={14} color="#fff" />
                    <Text style={styles.paymentMethodText}>
                      {selectedSale.paymentMethod.charAt(0).toUpperCase() + selectedSale.paymentMethod.slice(1)}
                    </Text>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.saleDetailSection}>
                  <Text style={styles.saleDetailSectionTitle}>Items</Text>
                  {selectedSale.items.map((item) => (
                    <View key={item.id} style={styles.saleDetailItem}>
                      <View style={styles.saleDetailItemHeader}>
                        <Text style={styles.saleDetailItemName}>{item.productName} </Text>
                        <Text style={styles.saleDetailItemPrice}>DT {item.price.toFixed(2)}</Text>
                      </View>
                      <Text
                        style={[
                          styles.trackStockBadgeText
                        ]}
                      >
                        {item.productVariant}
                      </Text>
                      <View style={styles.saleDetailItemFooter}>
                        <Text style={styles.saleDetailItemBrand}>{item.brand.name}</Text>
                        <Text style={styles.saleDetailItemQuantity}>Qty: {item.quantity}</Text>
                        {/* If you want to display total per item, add here */}
                        {/* <Text style={styles.saleDetailItemTotal}>DT {(item.price * item.quantity).toFixed(2)}</Text> */}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Totals and Discount */}
                <View style={styles.saleDetailTotals}>
                  {selectedSale.discount && (
                    <>
                      <View style={styles.saleDetailTotalRow}>
                        <Text style={styles.saleDetailTotalLabel}>Original Subtotal</Text>
                        <Text style={styles.saleDetailTotalValue}>DT {selectedSale.total_before_discount.toFixed(2)}</Text>
                      </View>
                      <View style={styles.saleDetailTotalRow}>
                        <Text style={[styles.saleDetailTotalLabel, styles.discountLabel]}>
                          Discount ({selectedSale.discount.type === "percentage"
                            ? `${selectedSale.discount.value}%`
                            : `DT ${selectedSale.discount.value}`})
                        </Text>
                        <Text style={[styles.saleDetailTotalValue, styles.discountValue]}>- DT {selectedSale.discount.value}</Text>
                      </View>
                    </>
                  )}

                  <View style={styles.saleDetailTotalRow}>
                    <Text style={styles.saleDetailTotalLabel}>Subtotal</Text>
                    <Text style={styles.saleDetailTotalValue}>DT {selectedSale.final_total.toFixed(2)}</Text>
                  </View>

                  <View style={styles.saleDetailTotalRow}>
                    <Text style={styles.saleDetailTotalLabel}>Amount Paid</Text>
                    <Text style={styles.saleDetailTotalValue}>DT {selectedSale.amountPaid.toFixed(2)}</Text>
                  </View>

                  {selectedSale.remainingCredit > 0 && (
                    <View style={styles.saleDetailTotalRow}>
                      <Text style={[styles.saleDetailTotalLabel, styles.creditLabel]}>
                        {getCreditTypeLabel(selectedSale.creditType, selectedSale.company)}
                      </Text>
                      <Text style={[styles.saleDetailTotalValue, styles.creditValue]}>
                        DT {selectedSale.remainingCredit.toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={[styles.saleDetailTotalRow, styles.saleDetailGrandTotal]}>
                    <Text style={styles.saleDetailGrandTotalLabel}>Total</Text>
                    <Text style={styles.saleDetailGrandTotalValue}>DT {selectedSale.final_total.toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Actions */}
            <View style={styles.saleDetailsActions}>
              <TouchableOpacity
                style={styles.saleDetailsActionButton}
                onPress={() => {
                  setShowSaleDetails(false);
                  if (selectedSale) {
                    navigateToEditSale(selectedSale.id);
                  }
                }}
              >
                <Icon name="edit-2" size={18} color="#007AFF" />
                <Text style={styles.saleDetailsActionText}>Edit Sale</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmModal} transparent animationType="fade" onRequestClose={() => setDeleteConfirmModal(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteConfirmModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModal}>
                <Icon name="alert-triangle" size={40} color="#FF3B30" style={styles.deleteIcon} />
                <Text style={styles.deleteTitle}>Supprimer la vente</Text>
                <Text style={styles.deleteMessage}>
                  Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.
                </Text>
                <View style={styles.deleteActions}>
                  <TouchableOpacity style={styles.deleteCancelButton} onPress={() => setDeleteConfirmModal(false)}>
                    <Text style={styles.deleteCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteConfirmButton} onPress={deleteSale}>
                    <Text style={styles.deleteConfirmText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Veuillez patienter...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  filterButton: {
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  creditValue: {
    color: "#FF9500",
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for the FAB
  },
  saleItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  saleHeader: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  saleInfo: {
    flex: 1,
  },
  saleClient: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 14,
    color: "#666",
  },
  saleAmount: {
    alignItems: "flex-end",
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  paymentMethodBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  paymentMethodBadgeLarge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  paymentMethodText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
    textTransform: "capitalize",
  },
  saleItemsPreview: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  saleItemsCount: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  saleItemsList: {
    fontSize: 14,
    color: "#666",
  },
  creditInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFF9E6",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  creditLabel: {
    fontSize: 14,
    color: "#FF9500",
    fontWeight: "500",
  },
  creditAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF9500",
  },
  saleActions: {
    flexDirection: "row",
    padding: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    marginRight: 16,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyList: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  emptyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  // Filter modal styles
  filterModal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  filterContent: {
    padding: 16,
    maxHeight: 400,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterNote: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  filterOption: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  filterOptionSelected: {
    backgroundColor: "#007AFF",
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionTextSelected: {
    color: "#fff",
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  filterResetButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterResetText: {
    color: "#666",
    fontWeight: "500",
  },
  filterApplyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  filterApplyText: {
    color: "#fff",
    fontWeight: "500",
  },
  // Sale details modal styles
  saleDetailsModal: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  saleDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  saleDetailsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  saleDetailsContent: {
    padding: 16,
    maxHeight: 500,
  },
  saleDetailSection: {
    marginBottom: 20,
  },
  saleDetailSectionTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  saleDetailText: {
    fontSize: 16,
    fontWeight: "500",
  },
  saleDetailItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  saleDetailItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  saleDetailItemName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  saleDetailItemPrice: {
    fontSize: 16,
    fontWeight: "500",
  },
  saleDetailItemOption: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  saleDetailItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saleDetailItemBrand: {
    fontSize: 14,
    color: "#666",
  },
  saleDetailItemQuantity: {
    fontSize: 14,
    color: "#666",
  },
  saleDetailItemTotal: {
    fontSize: 14,
    fontWeight: "bold",
  },
  saleDetailTotals: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  saleDetailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  saleDetailTotalLabel: {
    fontSize: 14,
    color: "#666",
  },
  saleDetailTotalValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  saleDetailGrandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saleDetailGrandTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  saleDetailGrandTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  saleDetailsActions: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saleDetailsActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  saleDetailsActionText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  // Delete confirmation modal styles
  deleteModal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  deleteIcon: {
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: "row",
    width: "100%",
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  deleteCancelText: {
    color: "#666",
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#FF3B30",
    alignItems: "center",
  },
  deleteConfirmText: {
    color: "#fff",
    fontWeight: "500",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#007AFF",
  },
  // Discount styles
  discountInfo: {
    padding: 16,
    backgroundColor: "#FFF5EC",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9500",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  discountBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  discountDetails: {
    alignItems: "flex-end",
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginBottom: 2,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF9500",
  },
  discountLabel: {
    color: "#FF9500",
    fontWeight: "500",
  },
  discountValue: {
    color: "#FF9500",
    fontWeight: "bold",
  },
  trackStockBadgeText: {
    fontSize: 14,
    color: "#2d5a2d",
    fontWeight: "500",
    backgroundColor: "#e0f2e9",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  }
});

export default SaleScreen;
