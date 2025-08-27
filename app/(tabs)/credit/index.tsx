"use client"

import { useRouter } from "expo-router"
import { getBaseUrl } from "@/utils/api"
import { useState, useRef, useEffect } from "react"
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
} from "react-native"
import Icon from "react-native-vector-icons/Feather"
import { format } from "date-fns"
import axios from "axios"
import { useProtectedRoute } from "../../..//hooks/useProtectedRoute"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback } from "react"
import { SafeAreaView } from "react-native-safe-area-context"

// Type definitions
interface Client {
  id: string
  name: string
}

// Update the Credit interface to include payment history
interface Payment {
  id: string
  amount: number
  date: string
}

interface Credit {
  id: string
  amount: number
  type: "client" | "delivery" | "own" // Added 'own' type
  client?: Client // Made optional
  creditorName?: string // New field for 'own' type
  description: string
  date: string
  status: "pending" | "paid"
  saleId?: string
  company?: {
    id: string
    name: string
  }
  payments: Payment[]
  remainingAmount: number
}

// Filter type definition
interface FilterOptions {
  client: string | null
  type: "client" | "delivery" | "own" | null // Added 'own' type
  status: "pending" | "paid" | null
  dateRange: {
    start: Date | null
    end: Date | null
  }
}

const CreditScreen = () => {
  useProtectedRoute()
  const router = useRouter()

  // State for credits data
  const [credits, setCredits] = useState<Credit[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // State for search and filters
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<TextInput>(null)

  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    client: null,
    type: null,
    status: null,
    dateRange: {
      start: null,
      end: null,
    },
  })

  // State for credit details modal
  const [showCreditDetails, setShowCreditDetails] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)

  // State for payment confirmation modal
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false)
  const [creditToMarkPaid, setCreditToMarkPaid] = useState<string | null>(null)

  // Add state for the add payment modal
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])
  const [creditToAddPayment, setCreditToAddPayment] = useState<string | null>(null)

  // Fetch credits data
  const fetchCredits = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would fetch from your API
      const res = await axios.get(`${getBaseUrl()}/api/credits`)
      setCredits(res.data)
    } catch (error) {
      console.error("Failed to load credits:", error)
      Alert.alert("Error", "Failed to load credits. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCredits()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchCredits()
    }, []),
  )

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [showSearch])

  // Get unique clients and types for filters
  const clients = Array.from(
    new Set(
      credits
        .filter((c) => c.type !== "own") // Only include clients from 'client' or 'delivery' types
        .map((credit) => credit.client?.name)
        .filter(Boolean) as string[],
    ),
  )
  const types = ["client", "delivery", "own"] // Added 'own'
  const statuses = ["pending", "paid"]

  // Function to filter credits
  const getFilteredCredits = () => {
    return credits.filter((credit) => {
      // Search filter
      const searchTarget = credit.type === "own" ? credit.creditorName : credit.client?.name
      if (
        searchQuery &&
        !(searchTarget?.toLowerCase()?.includes(searchQuery.toLowerCase())) &&
        !(credit.description?.toLowerCase()?.includes(searchQuery.toLowerCase()))
      ) {
        return false;
      }


      // Client filter (only applies to client/delivery types)
      if (filters.client) {
        if (credit.type === "own") {
          return false // 'own' credits don't have a client, so filter them out if a client filter is active
        }
        if (credit.client?.name !== filters.client) {
          return false
        }
      }

      // Type filter
      if (filters.type && credit.type !== filters.type) {
        return false
      }

      // Status filter
      if (filters.status && credit.status !== filters.status) {
        return false
      }

      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const creditDate = new Date(credit.date)

        if (filters.dateRange.start && creditDate < filters.dateRange.start) {
          return false
        }

        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end)
          endDate.setHours(23, 59, 59, 999) // End of day
          if (creditDate > endDate) {
            return false
          }
        }
      }

      return true
    })
  }

  // Function to reset filters
  const resetFilters = () => {
    setFilters({
      client: null,
      type: null,
      status: null,
      dateRange: {
        start: null,
        end: null,
      },
    })
    setShowFilters(false)
  }

  // Function to view credit details
  const viewCreditDetails = (credit: Credit) => {
    setSelectedCredit(credit)
    setShowCreditDetails(true)
  }

  // Function to confirm marking credit as paid
  const confirmMarkAsPaid = (creditId: string) => {
    setCreditToMarkPaid(creditId)
    setShowPaymentConfirm(true)
  }

  // Function to mark credit as paid
  const markCreditAsPaid = async () => {
    if (!creditToMarkPaid) return

    setIsLoading(true)
    try {
      await axios.post(`${getBaseUrl()}/api/credits/${creditToMarkPaid}`, { status: "paid" })

      console.log("payé")

      // Mise à jour de l'état local
      setCredits((prev) =>
        prev.map((credit) => (credit.id === creditToMarkPaid ? { ...credit, status: "paid" } : credit)),
      )

      Alert.alert("Succès", "Le crédit a été marqué comme payé")
    } catch (error) {
      console.error("Erreur lors de la mise à jour du crédit :", error)
      Alert.alert("Erreur", "Échec de la mise à jour du statut du crédit")
    } finally {
      setIsLoading(false)
      setShowPaymentConfirm(false)
      setCreditToMarkPaid(null)
      setShowCreditDetails(false)
    }
  }

  // Fonction pour naviguer vers les détails de la vente
  const navigateToSaleDetails = (saleId: string) => {
    router.push(`/sales/edit/${saleId}`)
  }

  // Fonction pour naviguer vers l'écran de modification du crédit
  const navigateToEditCredit = (creditId: string) => {
    router.push(`/credit/edit/${creditId}`)
  }

  // Fonction pour naviguer vers l'écran d'ajout de crédit
  const navigateToAddCredit = () => {
    router.push("/credit/add")
  }

  // Fonction pour confirmer la suppression du crédit
  const confirmDeleteCredit = (creditId: string) => {
    Alert.alert(
      "Supprimer le crédit",
      "Êtes-vous sûr de vouloir supprimer ce crédit ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => deleteCredit(creditId),
        },
      ],
    )
  }

  // Fonction pour supprimer un crédit
  const deleteCredit = async (creditId: string) => {
    setIsLoading(true)
    try {
      await axios.delete(`${getBaseUrl()}/api/credits/${creditId}`)

      setCredits((prev) => prev.filter((credit) => credit.id !== creditId))
      Alert.alert("Succès", "Le crédit a été supprimé")
    } catch (error) {
      console.error("Erreur lors de la suppression du crédit :", error)
      Alert.alert("Erreur", "Échec de la suppression du crédit")
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction pour ouvrir la modal d'ajout de paiement
  const openAddPaymentModal = (creditId: string) => {
    setCreditToAddPayment(creditId)
    setPaymentAmount("")
    setPaymentDate(new Date().toISOString().split("T")[0])
    setShowAddPaymentModal(true)
  }

  // Fonction pour ajouter un paiement à un crédit
  const addPaymentToCredit = async () => {
    if (!creditToAddPayment) return

    const amount = Number.parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un montant de paiement valide")
      return
    }

    const credit = credits.find((c) => c.id === creditToAddPayment)
    if (!credit) return

    if (amount > credit.remainingAmount) {
      Alert.alert(
        "Erreur",
        `Le montant du paiement ne peut pas dépasser le montant restant (${credit.remainingAmount.toFixed(2)})`,
      )
      return
    }

    setIsLoading(true)
    try {
      await axios.post(`${getBaseUrl()}/api/credits/${creditToAddPayment}/payments`, {
        amount,
        date: new Date(paymentDate).toISOString(),
      })

      const newPayment = {
        id: `p${Date.now()}`,
        amount,
        date: new Date(paymentDate).toISOString(),
      }

      const updatedCredits = credits.map((credit) => {
        if (credit.id === creditToAddPayment) {
          const newRemainingAmount = credit.remainingAmount - amount
          const newStatus: "paid" | "pending" = newRemainingAmount <= 0 ? "paid" : "pending"

          return {
            ...credit,
            payments: [...credit.payments, newPayment],
            remainingAmount: newRemainingAmount,
            status: newStatus,
          }
        }
        return credit
      })
     
      setCredits(updatedCredits)
      Alert.alert("Succès", "Le paiement a été enregistré")
    } catch (error) {
      console.error("Erreur lors de l'ajout du paiement :", error)
      Alert.alert("Erreur", "Échec de l'enregistrement du paiement")
    } finally {
      setIsLoading(false)
      setShowAddPaymentModal(false)
      setCreditToAddPayment(null)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "MMM dd, yyyy • HH:mm")
    } catch (error) {
      return dateString
    }
  }

  // Get type badge color
  const getTypeBadgeColor = (type: string) => {
    if (type === "client") return "#007AFF"
    if (type === "delivery") return "#FF9500"
    if (type === "own") return "#5856D6" // A distinct purple/blue for 'own'
    return "#000" // Default or error color
  }

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    return status === "pending" ? "#FF3B30" : "#34C759"
  }

  // Calculate total pending credit
  const calculateTotalPendingCredit = () => {
    const filteredCredits = getFilteredCredits()
    return filteredCredits
      .filter((credit) => credit.status === "pending")
      .reduce((sum, credit) => sum + credit.amount, 0)
      .toFixed(2)
  }

  // Calculate total paid credit
  const calculateTotalPaidCredit = () => {
    const filteredCredits = getFilteredCredits()
    return filteredCredits
      .filter((credit) => credit.status === "paid")
      .reduce((sum, credit) => sum + credit.amount, 0)
      .toFixed(2)
  }

  // Add this to the JSX, right before the Loading Overlay
  // Update the renderCreditItem function to show remaining amount
  const renderCreditItem = ({ item }: { item: Credit }) => {
    const displayName = item.type === "own" ? item.creditorName : item.client?.name
    const typeText = item.type === "client" ? "Client" : item.type === "delivery" ? "Livraison" : "Propriétaire"

    return (
      <TouchableOpacity style={styles.creditItem} onPress={() => viewCreditDetails(item)}>
        <View style={styles.creditHeader}>
          <View style={styles.creditInfo}>
            <Text style={styles.creditClient}>
              # {item.id} - {displayName || "N/A"}
            </Text>
            <Text style={styles.creditDate}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.creditAmount}>
            <Text style={styles.creditTotal}>DT {item.amount.toFixed(2)}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(item.type) }]}>
              <Text style={styles.typeBadgeText}>{typeText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.creditDescription}>
          <Text style={styles.descriptionText} numberOfLines={2} ellipsizeMode="tail">
            {item.description}
          </Text>
        </View>

        <View style={styles.creditFooter}>
          <View style={styles.creditStatusRow}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeColor(item.status) }]}>
              <Text style={styles.statusBadgeText}>{item.status === "pending" ? "En attente" : "Payé"}</Text>
            </View>
            {item.status === "pending" && (
              <Text style={styles.remainingAmount}>Restant : DT {item.remainingAmount.toFixed(2)}</Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            {item.status === "pending" && (
              <TouchableOpacity style={styles.actionButton} onPress={() => openAddPaymentModal(item.id)}>
                <Icon name="dollar-sign" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Ajouter un paiement</Text>
              </TouchableOpacity>
            )}

            <View style={styles.editdeleteBtn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => navigateToEditCredit(item.id)}
              >
                <Icon name="edit-2" size={16} color="#007AFF" />
                <Text style={styles.actionButtonText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => confirmDeleteCredit(item.id)}
              >
                <Icon name="trash-2" size={16} color="#FF3B30" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const filteredCredits = getFilteredCredits()
  const activeFiltersCount = Object.values(filters).filter(
    (value) => value !== null && (typeof value !== "object" || Object.values(value).some((v) => v !== null)),
  ).length

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        {showSearch ? (
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher des crédits..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onBlur={() => {
                if (!searchQuery) {
                  setShowSearch(false)
                }
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("")
                setShowSearch(false)
              }}
            >
              <Icon name="x" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Crédits</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowSearch(true)}>
                <Icon name="search" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerButton, styles.filterButton]} onPress={() => setShowFilters(true)}>
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

      {/* Résumé des crédits */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Crédits en attente</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>DT {calculateTotalPendingCredit()}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Crédits payés</Text>
          <Text style={[styles.summaryValue, styles.paidValue]}>DT {calculateTotalPaidCredit()}</Text>
        </View>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {/* Liste des crédits */}
        <FlatList
          data={filteredCredits}
          renderItem={renderCreditItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>
                {searchQuery || activeFiltersCount > 0
                  ? "Aucun crédit ne correspond à votre recherche ou filtres"
                  : "Aucun crédit enregistré pour le moment"}
              </Text>
              {searchQuery || activeFiltersCount > 0 ? (
                <TouchableOpacity style={styles.emptyButton} onPress={resetFilters}>
                  <Text style={styles.emptyButtonText}>Réinitialiser les filtres</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />
      </View>

      {/* Modal de filtrage */}
      <Modal visible={showFilters} transparent animationType="fade" onRequestClose={() => setShowFilters(false)}>
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.filterModal}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filtrer les crédits</Text>
                  <TouchableOpacity onPress={() => setShowFilters(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.filterContent}>
                  {/* Filtre client */}
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
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.client === client && styles.filterOptionTextSelected,
                            ]}
                          >
                            {client}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Filtre type */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Type de crédit</Text>
                    <View style={styles.filterOptions}>
                      {types.map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[styles.filterOption, filters.type === type && styles.filterOptionSelected]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              type: filters.type === type ? null : (type as any),
                            })
                          }
                        >
                          <Text
                            style={[styles.filterOptionText, filters.type === type && styles.filterOptionTextSelected]}
                          >
                            {type === "client"
                              ? "Crédit client"
                              : type === "delivery"
                                ? "Crédit livraison"
                                : "Crédit propriétaire"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Filtre statut */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Statut</Text>
                    <View style={styles.filterOptions}>
                      {statuses.map((status) => (
                        <TouchableOpacity
                          key={status}
                          style={[styles.filterOption, filters.status === status && styles.filterOptionSelected]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              status: filters.status === status ? null : (status as any),
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.status === status && styles.filterOptionTextSelected,
                            ]}
                          >
                            {status === "pending" ? "En attente" : "Payé"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Filtre plage de dates */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Plage de dates</Text>
                    <Text style={styles.filterNote}>
                      Le filtre par plage de dates serait implémenté avec un sélecteur de dates
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.filterActions}>
                  <TouchableOpacity style={styles.filterResetButton} onPress={resetFilters}>
                    <Text style={styles.filterResetText}>Réinitialiser</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.filterApplyButton} onPress={() => setShowFilters(false)}>
                    <Text style={styles.filterApplyText}>Appliquer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal détails du crédit */}
      <Modal
        visible={showCreditDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreditDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.creditDetailsModal}>
            <View style={styles.creditDetailsHeader}>
              <Text style={styles.creditDetailsTitle}>Détails du crédit</Text>
              <TouchableOpacity onPress={() => setShowCreditDetails(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedCredit && (
              <ScrollView style={styles.creditDetailsContent}>
                {selectedCredit.type === "own" ? (
                  <View style={styles.creditDetailSection}>
                    <Text style={styles.creditDetailSectionTitle}>Source du Crédit</Text>
                    <Text style={styles.creditDetailText}>{selectedCredit.creditorName}</Text>
                  </View>
                ) : (
                  <View style={styles.creditDetailSection}>
                    <Text style={styles.creditDetailSectionTitle}>Client</Text>
                    <Text style={styles.creditDetailText}>{selectedCredit.client?.name}</Text>
                  </View>
                )}

                <View style={styles.creditDetailSection}>
                  <Text style={styles.creditDetailSectionTitle}>Date</Text>
                  <Text style={styles.creditDetailText}>{formatDate(selectedCredit.date)}</Text>
                </View>

                <View style={styles.creditDetailSection}>
                  <Text style={styles.creditDetailSectionTitle}>Type de crédit</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      styles.typeBadgeLarge,
                      { backgroundColor: getTypeBadgeColor(selectedCredit.type) },
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {selectedCredit.type === "client"
                        ? "Crédit client"
                        : selectedCredit.type === "delivery"
                          ? "Crédit livraison"
                          : "Crédit propriétaire"}
                    </Text>
                  </View>
                </View>

                {selectedCredit.type === "delivery" && selectedCredit.company && (
                  <View style={styles.creditDetailSection}>
                    <Text style={styles.creditDetailSectionTitle}>Société de livraison</Text>
                    <Text style={styles.creditDetailText}>{selectedCredit.company.name}</Text>
                  </View>
                )}

                <View style={styles.creditDetailSection}>
                  <Text style={styles.creditDetailSectionTitle}>Description</Text>
                  <Text style={styles.creditDetailText}>{selectedCredit.description}</Text>
                </View>

                <View style={styles.creditDetailSection}>
                  <Text style={styles.creditDetailSectionTitle}>Statut</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      styles.statusBadgeLarge,
                      { backgroundColor: getStatusBadgeColor(selectedCredit.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {selectedCredit.status === "pending" ? "En attente" : "Payé"}
                    </Text>
                  </View>
                </View>

                {selectedCredit.saleId && selectedCredit.type !== "own" && (
                  <View style={styles.creditDetailSection}>
                    <Text style={styles.creditDetailSectionTitle}>Vente associée</Text>
                    <TouchableOpacity
                      style={styles.viewSaleButton}
                      onPress={() => {
                        setShowCreditDetails(false)
                        navigateToSaleDetails(selectedCredit.saleId!)
                      }}
                    >
                      <Text style={styles.viewSaleButtonText}>Voir vente #{selectedCredit.saleId}</Text>
                      <Icon name="chevron-right" size={16} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.creditDetailTotals}>
                  <View style={[styles.creditDetailTotalRow, styles.creditDetailGrandTotal]}>
                    <Text style={styles.creditDetailGrandTotalLabel}>Montant</Text>
                    <Text style={styles.creditDetailGrandTotalValue}>DT {selectedCredit.amount.toFixed(2)}</Text>
                  </View>
                </View>
                {selectedCredit && selectedCredit.payments.length > 0 && (
                  <View style={styles.paymentHistorySection}>
                    <Text style={styles.paymentHistoryTitle}>Historique des paiements</Text>
                    {selectedCredit.payments.map((payment) => (
                      <View key={payment.id} style={styles.paymentItem}>
                        <View style={styles.paymentInfo}>
                          <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                          <Text style={styles.paymentAmount}>DT {payment.amount.toFixed(2)}</Text>
                        </View>
                      </View>
                    ))}
                    {selectedCredit.status === "pending" && (
                      <View style={styles.remainingAmountContainer}>
                        <Text style={styles.remainingAmountLabel}>Montant restant :</Text>
                        <Text style={styles.remainingAmountValue}>DT {selectedCredit.remainingAmount.toFixed(2)}</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.creditDetailsActions}>
              {selectedCredit && selectedCredit.status === "pending" && (
                <TouchableOpacity
                  style={styles.markPaidButtonLarge}
                  onPress={() => {
                    setShowCreditDetails(false)
                    confirmMarkAsPaid(selectedCredit.id)
                  }}
                >
                  <Icon name="check-circle" size={18} color="#fff" />
                  <Text style={styles.markPaidButtonLargeText}>Marquer comme payé</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation de paiement */}
      <Modal
        visible={showPaymentConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentConfirm(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPaymentConfirm(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.confirmModal}>
                <Icon name="check-circle" size={40} color="#34C759" style={styles.confirmIcon} />
                <Text style={styles.confirmTitle}>Marquer comme payé</Text>
                <Text style={styles.confirmMessage}>
                  Êtes-vous sûr de vouloir marquer ce crédit comme payé ? Cette action est irréversible.
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity style={styles.confirmCancelButton} onPress={() => setShowPaymentConfirm(false)}>
                    <Text style={styles.confirmCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmButton} onPress={markCreditAsPaid}>
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal d'ajout de paiement */}
      <Modal
        visible={showAddPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddPaymentModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowAddPaymentModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.addPaymentModal}>
                <View style={styles.addPaymentHeader}>
                  <Text style={styles.addPaymentTitle}>Ajouter un paiement</Text>
                  <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.addPaymentContent}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Date de paiement</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentDate}
                      onChangeText={setPaymentDate}
                      placeholder="AAAA-MM-JJ"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Montant (DT)</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.addPaymentActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddPaymentModal(false)}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={addPaymentToCredit}>
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Overlay de chargement */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Veuillez patienter...</Text>
        </View>
      )}
      {/* Bouton flottant d'ajout */}
      <TouchableOpacity style={styles.fab} onPress={navigateToAddCredit}>
        <Icon name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

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
  pendingValue: {
    color: "#FF3B30",
  },
  paidValue: {
    color: "#34C759",
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for the bottom
  },
  creditItem: {
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
  creditHeader: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  creditInfo: {
    flex: 1,
  },
  creditClient: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  creditDate: {
    fontSize: 14,
    color: "#666",
  },
  creditAmount: {
    alignItems: "flex-end",
  },
  creditTotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  typeBadgeLarge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  typeBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  creditDescription: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  descriptionText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  creditFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  statusBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusBadgeLarge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  markPaidButtonText: {
    color: "#34C759",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
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
  // Credit details modal styles
  creditDetailsModal: {
    width: "90%",
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  creditDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  creditDetailsTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  creditDetailsContent: {
    padding: 16,
    maxHeight: 500,
  },
  creditDetailSection: {
    marginBottom: 20,
  },
  creditDetailSectionTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  creditDetailText: {
    fontSize: 16,
    fontWeight: "500",
  },
  creditDetailTotals: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  creditDetailTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  creditDetailGrandTotal: {
    marginTop: 8,
    paddingTop: 8,
  },
  creditDetailGrandTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  creditDetailGrandTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  creditDetailsActions: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  markPaidButtonLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#34C759",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  markPaidButtonLargeText: {
    color: "#fff",
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  viewSaleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
  },
  viewSaleButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  // Confirmation modal styles
  confirmModal: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  confirmIcon: {
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: "row",
    width: "100%",
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  confirmCancelText: {
    color: "#666",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#34C759",
    alignItems: "center",
  },
  confirmButtonText: {
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
  addPaymentModal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  addPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  addPaymentTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  addPaymentContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addPaymentActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF3B30",
    marginRight: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#007AFF",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  editButton: {
    backgroundColor: "#f0f0f0",
  },
  deleteButton: {
    backgroundColor: "#FFF0F0",
  },
  deleteButtonText: {
    color: "#FF3B30",
  },
  paymentHistorySection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 16,
  },
  paymentHistoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  paymentItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentDate: {
    fontSize: 14,
    color: "#666",
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#34C759",
  },
  remainingAmountContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  remainingAmountLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  remainingAmountValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FF3B30",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
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
  creditStatusRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: "column",
    flexWrap: "wrap",
  },
  editdeleteBtn: {
    flexDirection: "row",
  },
})

export default CreditScreen
