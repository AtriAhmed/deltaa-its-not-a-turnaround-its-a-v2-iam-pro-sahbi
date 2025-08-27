"use client"

import { Stack, useRouter } from "expo-router"
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

interface Sale {
  id: string
  client: Client
  date: string
  final_total: number
  paymentMethod: string
  amountPaid: number
}

const AddCreditScreen = () => {
  useProtectedRoute()
  const router = useRouter()

  // Form state
  const [creditType, setCreditType] = useState<"client" | "delivery" | "own">("client")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [creditorName, setCreditorName] = useState("") // New state for own credit source

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

  const fetchFormData = async () => {
    try {
      const clientsRes = await axios.get(`${getBaseUrl()}/api/clients`)
      setClients(clientsRes.data)

      const deliveryCompanyRes = await axios.get(`${getBaseUrl()}/api/delivery-companies`)
      setCompanies(deliveryCompanyRes.data)

      const salesRes = await axios.get(`${getBaseUrl()}/api/sales`)
      setSales(salesRes.data)

    } catch (error) {
      console.error("Échec du chargement des données du formulaire:", error)
      Alert.alert("Erreur", "Échec du chargement des données. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Charger les données
  useEffect(() => {
    fetchFormData()
  }, [])

  // Reset specific fields when credit type changes
  useEffect(() => {
    if (creditType !== "own") {
      setCreditorName("")
    }
    if (creditType !== "delivery") {
      setSelectedCompany(null)
    }
    // selectedClient and selectedSale can remain as they are relevant across types
  }, [creditType])


  const filteredClients = clients.filter((client) => client.name.toLowerCase().includes(clientSearch.toLowerCase()))


  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase()),
  )


  const filteredSales = sales.filter((sale) =>
    sale.client.name.toLowerCase().includes(saleSearch.toLowerCase()) ||
    sale.id.toString().toLowerCase().includes(saleSearch.toLowerCase())
  );



  // Calculer le solde restant pour une vente
  const calculateRemainingBalance = (sale: Sale) => {
    console.log(sale)
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
      // In a real application, you would call your API
      const response = await axios.post(`${getBaseUrl()}/api/credits`, {
        type: creditType,
        clientId: selectedClient?.id,
        companyId: creditType === "delivery" ? selectedCompany?.id : null,
        creditorName: creditType === "own" ? creditorName : null, // Include creditorName for own credit
        saleId: selectedSale?.id,
        amount: Number(amount),
        description: description,
        date: new Date(date).toISOString(),
      })

      // Simulate an API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      Alert.alert("Succès", "Le crédit a été ajouté avec succès", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du crédit:", error)
      Alert.alert("Erreur", "Échec de l'enregistrement du crédit. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Formater la date pour l'affichage
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd MMM yyyy") // French format (day month year)
    } catch (error) {
      return dateString
    }
  }
  const handleGoBack = () => {
    router.push("/credit")
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Ajouter un Crédit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Credit Type Selection */}
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

        {/* Client Selection */}

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
        {/* Delivery Company Selection (for delivery credit) */}
        {creditType === "delivery" && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Entreprise de Livraison</Text>
            <TouchableOpacity style={styles.selectionButton} onPress={() => setShowCompanyModal(true)}>
              <Text style={selectedCompany ? styles.selectionText : styles.selectionPlaceholder}>
                {selectedCompany ? selectedCompany.name : "Sélectionner une entreprise"}
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

        {/* Associated Sale (Optional) */}

        {creditType !== "own" && (
          <View style={styles.formSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Vente Associée</Text>
              <Text style={styles.optionalText}>(Optionnel)</Text>
            </View>
            <TouchableOpacity style={styles.selectionButton} onPress={() => setShowSaleModal(true)}>
              <Text style={selectedSale ? styles.selectionText : styles.selectionPlaceholder}>
                {selectedSale
                  ? `Vente #${selectedSale.id} - ${selectedSale.client.name} - DT ${calculateRemainingBalance(selectedSale)}`
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

        {/* Amount */}
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
          <Text style={styles.dateHint}>Format: AAAA-MM-JJ (ex: 2025-05-01)</Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={saveCredit} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer le Crédit</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Client Selection Modal */}
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

      {/* Company Selection Modal */}
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
                  <Text style={styles.modalTitle}>Sélectionner une Entreprise</Text>
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
                    placeholder="Rechercher des entreprises..."
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
                      <Text style={styles.emptyText}>Aucune entreprise trouvée</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Sale Selection Modal */}
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
                          <Text style={styles.saleItemTotal}>Total: DT {item.final_total}</Text>
                          <Text style={styles.saleItemPaid}>Payé: DT {item.amountPaid}</Text>
                          <Text style={styles.saleItemRemaining}>
                            Restant: DT {calculateRemainingBalance(item)}
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

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Enregistrement du crédit...</Text>
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
  optionalText: {
    fontSize: 14,
    color: "#999",
    marginLeft: 8,
    marginBottom: 8,
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

export default AddCreditScreen
