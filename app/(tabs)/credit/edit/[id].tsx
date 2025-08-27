"use client"

import { useRouter, useLocalSearchParams, Stack } from "expo-router"
import { getBaseUrl } from "@/utils/api"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native"
import Icon from "react-native-vector-icons/Feather"
import { format } from "date-fns"
import { useProtectedRoute } from "../../../../hooks/useProtectedRoute"
import axios from "axios"
import { SafeAreaView } from "react-native-safe-area-context"

// Type definitions
interface Client {
  id: string
  name: string
}

interface Company {
  id: string
  name: string
}

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
  company?: Company // Made optional
  creditorName?: string // New field for 'own' type
  description: string
  date: string
  status: "pending" | "paid"
  saleId?: string
  payments: Payment[]
  remainingAmount: number
}

interface Sale {
  id: string
  client: Client
  date: string
  final_total: number
  paymentMethod: string
  amountPaid: number
}

const EditCreditScreen = () => {
  useProtectedRoute()
  const router = useRouter()
  const params = useLocalSearchParams()
  const creditId = params.id as string

  // Form state
  const [credit, setCredit] = useState<Credit | null>(null)
  const [creditType, setCreditType] = useState<"client" | "delivery" | "own">("client") // Updated type
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState("")
  const [creditorName, setCreditorName] = useState("") // New state for own credit source

  // Payment state
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0])

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [companySearch, setCompanySearch] = useState("")
  const [saleSearch, setSaleSearch] = useState("")

  // Mock data
  const [clients, setClients] = useState<Client[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [sales, setSales] = useState<Sale[]>([])

  // Fetch credit data
  useEffect(() => {
    fetchCreditData()
  }, [creditId])

  const fetchCreditData = async () => {
    setIsLoading(true)
    try {
      const response = await axios.get(`${getBaseUrl()}/api/credits/${creditId}`)
      const fetchedCredit: Credit = response.data

      const clientsRes = await axios.get(`${getBaseUrl()}/api/clients`)
      setClients(clientsRes.data)

      const deliveryCompanyRes = await axios.get(`${getBaseUrl()}/api/delivery-companies`)
      setCompanies(deliveryCompanyRes.data)

      const salesRes = await axios.get(`${getBaseUrl()}/api/sales`)
      setSales(salesRes.data)

      setCredit(fetchedCredit)
      setCreditType(fetchedCredit.type)
      setAmount(fetchedCredit.amount.toString())
      setDescription(fetchedCredit.description)
      setDate(fetchedCredit.date.split("T")[0])

      if (fetchedCredit.type === "client") {
        setSelectedClient(fetchedCredit.client || null)
      } else if (fetchedCredit.type === "delivery") {
        setSelectedClient(fetchedCredit.client || null) // Delivery credits also have a client
        setSelectedCompany(fetchedCredit.company || null)
      } else if (fetchedCredit.type === "own") {
        setCreditorName(fetchedCredit.creditorName || "")
      }

      // Trouver la vente associée si elle existe
      if (fetchedCredit.saleId) {
        const sale = salesRes.data.find((s: Sale) => s.id === fetchedCredit.saleId)
        if (sale) {
          setSelectedSale(sale)
        }
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du crédit:", error)
      Alert.alert("Erreur", "Échec du chargement des données du crédit. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Reset specific fields when credit type changes
  useEffect(() => {
    if (creditType !== "own") {
      setCreditorName("")
    } else {
      setSelectedClient(null)
      setSelectedSale(null)
    }
    if (creditType !== "delivery") {
      setSelectedCompany(null)
    }
  }, [creditType])

  // Filtrer les clients selon la recherche
  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(clientSearch.toLowerCase()))

  // Filtrer les entreprises selon la recherche
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase()),
  )

  // Filtrer les ventes selon la recherche et ne montrer que celles avec solde restant
  const filteredSales = sales.filter(
    (sale) =>
      sale.final_total > sale.amountPaid &&
      (sale.client.name.toLowerCase().includes(saleSearch.toLowerCase()) ||
        sale.id.toLowerCase().includes(saleSearch.toLowerCase())),
  )

  // Calculer le solde restant pour une vente
  const calculateRemainingBalance = (sale: Sale) => {
    return sale.final_total - sale.amountPaid
  }

  // Valider le formulaire
  const validateForm = () => {
    if (creditType !== "own" && !selectedClient) {
      Alert.alert("Erreur", "Veuillez sélectionner un client.")
      return false
    }

    if (creditType === "delivery" && !selectedCompany) {
      Alert.alert("Erreur", "Veuillez sélectionner une entreprise de livraison.")
      return false
    }

    if (creditType === "own" && !creditorName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer le nom de la source du crédit.")
      return false
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide.")
      return false
    }

    return true
  }

  // Sauvegarder le crédit
  const saveCredit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await axios.put(`${getBaseUrl()}/api/credits/${creditId}`, {
        type: creditType,
        clientId: creditType !== "own" ? selectedClient?.id : null,
        companyId: creditType === "delivery" ? selectedCompany?.id : null,
        creditorName: creditType === "own" ? creditorName : null, // Include creditorName for own credit
        saleId: creditType !== "own" ? selectedSale?.id : null, // SaleId only for client/delivery
        amount: Number(amount),
        description,
        date: new Date(date).toISOString(),
      })

      await new Promise((resolve) => setTimeout(resolve, 1000))
      router.push("/credit")

      Alert.alert("Succès", "Le crédit a été mis à jour avec succès", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error("Erreur lors de la mise à jour du crédit:", error)
      Alert.alert("Erreur", "Échec de la mise à jour du crédit. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Ajouter un paiement
  const addPayment = async () => {
    const paymentAmountNum = Number(paymentAmount)
    if (isNaN(paymentAmountNum) || paymentAmountNum <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant de paiement valide")
      return
    }

    if (!credit) return

    if (paymentAmountNum > credit.remainingAmount) {
      Alert.alert(
        "Erreur",
        `Le montant du paiement ne peut pas dépasser le crédit restant (${credit.remainingAmount})`,
      )
      return
    }

    setIsLoading(true)
    try {
      // In a real application, you would call your API
      await axios.post(`${getBaseUrl()}/api/credits/${creditId}/payments`, {
        amount: paymentAmountNum,
        date: new Date(paymentDate).toISOString(),
      })

      // Mettre à jour l'état local
      const newPayment = {
        id: `p${Date.now()}`,
        amount: paymentAmountNum,
        date: new Date(paymentDate).toISOString(),
      }

      const newRemainingAmount = credit.remainingAmount - paymentAmountNum
      const newStatus: "paid" | "pending" = newRemainingAmount <= 0 ? "paid" : "pending"

      const updatedCredit: Credit = {
        ...credit,
        payments: [...credit.payments, newPayment],
        remainingAmount: newRemainingAmount,
        status: newStatus,
      }

      setCredit(updatedCredit)
      setShowAddPaymentModal(false)
      setPaymentAmount("")
      setPaymentDate(new Date().toISOString().split("T")[0])

      Alert.alert("Succès", "Le paiement a été enregistré")
    } catch (error) {
      console.error("Erreur lors de l'ajout du paiement:", error)
      Alert.alert("Erreur", "Échec de l'enregistrement du paiement")
    } finally {
      setIsLoading(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "MMM dd, yyyy")
    } catch (error) {
      return dateString
    }
  }

  if (!credit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des données de crédit...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le Crédit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Statut du crédit */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Statut :</Text>
          <View style={[styles.statusBadge, { backgroundColor: credit.status === "pending" ? "#FF3B30" : "#34C759" }]}>
            <Text style={styles.statusBadgeText}>{credit.status === "pending" ? "En attente" : "Payé"}</Text>
          </View>
        </View>

        {/* Sélection du type de crédit */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Type de Crédit</Text>
          <View style={styles.creditTypeContainer}>
            <TouchableOpacity
              style={[styles.creditTypeButton, creditType === "client" && styles.creditTypeButtonActive]}
              onPress={() => setCreditType("client")}
            >
              <Text style={[styles.creditTypeButtonText, creditType === "client" && styles.creditTypeButtonTextActive]}>
                 Client
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.creditTypeButton, creditType === "delivery" && styles.creditTypeButtonActive]}
              onPress={() => setCreditType("delivery")}
            >
              <Text
                style={[styles.creditTypeButtonText, creditType === "delivery" && styles.creditTypeButtonTextActive]}
              >
                 Livraison
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.creditTypeButton, creditType === "own" && styles.creditTypeButtonActive]}
              onPress={() => setCreditType("own")}
            >
              <Text style={[styles.creditTypeButtonText, creditType === "own" && styles.creditTypeButtonTextActive]}>
                 Propriétaire
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sélection du client */}
        {creditType !== "own" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Client</Text>
            <TouchableOpacity style={styles.selectionButton} onPress={() => setShowClientModal(true)}>
              <Text style={selectedClient ? styles.selectionText : styles.selectionPlaceholder}>
                {selectedClient ? selectedClient.name : "Sélectionner un client"}
              </Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Sélection de l'entreprise (pour crédit livraison) */}
        {creditType === "delivery" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Société de Livraison</Text>
            <TouchableOpacity style={styles.selectionButton} onPress={() => setShowCompanyModal(true)}>
              <Text style={selectedCompany ? styles.selectionText : styles.selectionPlaceholder}>
                {selectedCompany ? selectedCompany.name : "Sélectionner une société"}
              </Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        )}

        {/* Creditor Name Input (for own credit) */}
        {creditType === "own" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Source du Crédit</Text>
            <TextInput
              style={styles.input}
              value={creditorName}
              onChangeText={setCreditorName}
              placeholder="Nom de la source du crédit (ex: Banque, Ami)"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {/* Vente associée (Optionnel) */}
        {creditType !== "own" && (
          <View style={styles.formSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Vente Associée</Text>
              <Text style={styles.optionalText}>(Optionnel)</Text>
            </View>
            <TouchableOpacity style={styles.selectionButton} onPress={() => setShowSaleModal(true)}>
              <Text style={selectedSale ? styles.selectionText : styles.selectionPlaceholder}>
                {selectedSale
                  ? `Vente #${selectedSale.id} - ${selectedSale.client.name} - DT ${calculateRemainingBalance(
                      selectedSale,
                    )}`
                  : "Sélectionner une vente"}
              </Text>
              <Icon name="chevron-down" size={20} color="#999" />
            </TouchableOpacity>
            {selectedSale && (
              <TouchableOpacity style={styles.clearButton} onPress={() => setSelectedSale(null)}>
                <Text style={styles.clearButtonText}>Effacer la sélection</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Montant */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Montant (DT)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          {selectedSale && (
            <TouchableOpacity
              style={styles.useRemainingButton}
              onPress={() => setAmount(calculateRemainingBalance(selectedSale))}
            >
              <Text style={styles.useRemainingButtonText}>
                Utiliser le solde restant (DT {calculateRemainingBalance(selectedSale)})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        <View style={styles.formSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.optionalText}>(Optionnel)</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Entrez la description du crédit"
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />
        </View>

        {/* Date */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" />
          <Text style={styles.dateHint}>Format : AAAA-MM-JJ (ex : 2025-05-01)</Text>
        </View>

        {/* Historique des paiements */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Historique des Paiements</Text>
            {credit.status === "pending" && (
              <TouchableOpacity style={styles.addPaymentButton} onPress={() => setShowAddPaymentModal(true)}>
                <Icon name="plus" size={16} color="#fff" />
                <Text style={styles.addPaymentButtonText}>Ajouter Paiement</Text>
              </TouchableOpacity>
            )}
          </View>

          {credit.payments.length > 0 ? (
            <View style={styles.paymentHistoryContainer}>
              {credit.payments.map((payment) => (
                <View key={payment.id} style={styles.paymentItem}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
                    <Text style={styles.paymentAmount}>DT {payment.amount}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.remainingAmountContainer}>
                <Text style={styles.remainingAmountLabel}>Montant restant :</Text>
                <Text style={styles.remainingAmountValue}>DT {credit.remainingAmount}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyPayments}>
              <Text style={styles.emptyPaymentsText}>Aucun paiement enregistré</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bouton Enregistrer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={saveCredit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de sélection du client */}
      <Modal
        visible={showClientModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClientModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowClientModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner un Client</Text>
                  <TouchableOpacity onPress={() => setShowClientModal(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    value={clientSearch}
                    onChangeText={setClientSearch}
                    placeholder="Rechercher des clients..."
                    autoCapitalize="none"
                  />
                  {clientSearch ? (
                    <TouchableOpacity onPress={() => setClientSearch("")}>
                      <Icon name="x" size={20} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={filteredClients}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedClient(item)
                        setShowClientModal(false)
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                      {selectedClient?.id === item.id && <Icon name="check" size={20} color="#007AFF" />}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>Aucun client trouvé</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de sélection de l'entreprise */}
      <Modal
        visible={showCompanyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompanyModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCompanyModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner une Société</Text>
                  <TouchableOpacity onPress={() => setShowCompanyModal(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    value={companySearch}
                    onChangeText={setCompanySearch}
                    placeholder="Rechercher des sociétés..."
                    autoCapitalize="none"
                  />
                  {companySearch ? (
                    <TouchableOpacity onPress={() => setCompanySearch("")}>
                      <Icon name="x" size={20} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={filteredCompanies}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedCompany(item)
                        setShowCompanyModal(false)
                      }}
                    >
                      <Text style={styles.modalItemText}>{item.name}</Text>
                      {selectedCompany?.id === item.id && <Icon name="check" size={20} color="#007AFF" />}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>Aucune société trouvée</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de sélection de la vente */}
      <Modal visible={showSaleModal} transparent animationType="fade" onRequestClose={() => setShowSaleModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSaleModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner une Vente</Text>
                  <TouchableOpacity onPress={() => setShowSaleModal(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Icon name="search" size={20} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    value={saleSearch}
                    onChangeText={setSaleSearch}
                    placeholder="Rechercher des ventes..."
                    autoCapitalize="none"
                  />
                  {saleSearch ? (
                    <TouchableOpacity onPress={() => setSaleSearch("")}>
                      <Icon name="x" size={20} color="#999" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <FlatList
                  data={filteredSales}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.saleItem}
                      onPress={() => {
                        setSelectedSale(item)
                        setSelectedClient(item.client)
                        setShowSaleModal(false)
                      }}
                    >
                      <View style={styles.saleItemHeader}>
                        <Text style={styles.saleItemId}>Vente #{item.id}</Text>
                        <Text style={styles.saleItemDate}>{formatDate(item.date)}</Text>
                      </View>
                      <View style={styles.saleItemDetails}>
                        <Text style={styles.saleItemClient}>{item.client.name}</Text>
                        <View style={styles.saleItemAmounts}>
                          <Text style={styles.saleItemTotal}>Total : DT {item.final_total}</Text>
                          <Text style={styles.saleItemPaid}>Payé : DT {item.amountPaid}</Text>
                          <Text style={styles.saleItemRemaining}>
                            Restant : DT {calculateRemainingBalance(item)}
                          </Text>
                        </View>
                      </View>
                      {selectedSale?.id === item.id && (
                        <View style={styles.selectedIndicator}>
                          <Icon name="check" size={20} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>Aucune vente avec solde restant trouvée</Text>
                    </View>
                  }
                />
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
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Ajouter un Paiement</Text>
                  <TouchableOpacity onPress={() => setShowAddPaymentModal(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.addPaymentContent}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Date de Paiement</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentDate}
                      onChangeText={setPaymentDate}
                      placeholder="AAAA-MM-JJ"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Montant du Paiement (DT)</Text>
                    <TextInput
                      style={styles.input}
                      value={paymentAmount}
                      onChangeText={setPaymentAmount}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                    {credit && (
                      <TouchableOpacity
                        style={styles.useFullAmountButton}
                        onPress={() => setPaymentAmount(credit.remainingAmount)}
                      >
                        <Text style={styles.useFullAmountButtonText}>
                          Utiliser le montant total (DT {credit.remainingAmount})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddPaymentModal(false)}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={addPayment}>
                    <Text style={styles.saveButtonText}>Enregistrer le Paiement</Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  statusBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  optionalText: {
    fontSize: 14,
    color: "#999",
    marginLeft: 8,
  },
  creditTypeContainer: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  creditTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  creditTypeButtonActive: {
    backgroundColor: "#007AFF",
  },
  creditTypeButtonText: {
    fontSize: 16,
    color: "#666",
  },
  creditTypeButtonTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  selectionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  selectionText: {
    fontSize: 16,
    color: "#333",
  },
  selectionPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  clearButton: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: "#FF3B30",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  useRemainingButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  useRemainingButtonText: {
    fontSize: 14,
    color: "#007AFF",
  },
  paymentHistoryContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
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
  emptyPayments: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: "#999",
  },
  addPaymentButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addPaymentButtonText: {
    color: "#fff",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 16,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalItemText: {
    fontSize: 16,
  },
  emptyList: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  saleItem: {
    backgroundColor: "#f9f9f9",
    margin: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 12,
    position: "relative",
  },
  saleItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  saleItemId: {
    fontSize: 16,
    fontWeight: "600",
  },
  saleItemDate: {
    fontSize: 14,
    color: "#666",
  },
  saleItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saleItemClient: {
    fontSize: 14,
    flex: 1,
  },
  saleItemAmounts: {
    alignItems: "flex-end",
  },
  saleItemTotal: {
    fontSize: 14,
  },
  saleItemPaid: {
    fontSize: 14,
    color: "#34C759",
  },
  saleItemRemaining: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF3B30",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#007AFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  addPaymentModal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
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
  useFullAmountButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  useFullAmountButtonText: {
    fontSize: 14,
    color: "#007AFF",
  },
  modalActions: {
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
})

export default EditCreditScreen
