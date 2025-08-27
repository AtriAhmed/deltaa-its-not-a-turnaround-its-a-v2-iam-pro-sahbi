"use client"

import { Stack, useRouter } from "expo-router"
import { getBaseUrl } from "@/utils/api"
import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
    Image,
} from "react-native"

import Icon from "react-native-vector-icons/Feather"
import axios from "axios"
import { useProtectedRoute } from "../../../../hooks/useProtectedRoute"
import { SafeAreaView } from "react-native-safe-area-context"

// Type definitions
interface ProductVariant {
  id: string
  optionValues: { [optionId: string]: string }
  stockQty: number
}

interface ProductOption {
  optionId: string
  optionName: string
  values: string[]
}

interface Product {
  id: string
  name: string
  image: string
  brand: {
    id: string
    name: string
  }
  stock: number
  options: ProductOption[]
  variants: ProductVariant[]
}

interface Client {
  id: string
  name: string
  telephone?: string
  email?: string
  address?: string
  city?: string
}

interface Company {
  id: string
  name: string
}

// Update the SaleItem interface to include variant information
interface SaleItem {
  id: string
  productId: string
  productName: string
  brand: {
    id: string
    name: string
  }
  variantId?: string
  variantDescription?: string
  quantity: number
  selling_price: number
  total: number
}

interface Sale {
  id: string
  items: SaleItem[]
  paymentMethod: "cash" | "credit" | "card"
  client: Client
  total: number
  amountPaid: number
  remainingCredit: number
  creditType: "client" | "delivery" | null
  company?: {
    id: string
    name: string
  } | null
  change: number
  date: string
}

// Add interface for variant quantities
interface VariantQuantity {
  variantId: string
  quantity: number
}

// Filter type definition
interface FilterOptions {
  client: string | null
  paymentMethod: "cash" | "credit" | "card" | null
  dateRange: {
    start: Date | null
    end: Date | null
  }
  creditType: "client" | "delivery" | null
}

const AddSaleScreen = () => {
  useProtectedRoute()
  const router = useRouter()

  // State for form fields
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [amountPaid, setAmountPaid] = useState("")
  const [creditType, setCreditType] = useState<"client" | "delivery" | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Add discount state variables
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage")
  const [discountValue, setDiscountValue] = useState("")
  const [showDiscountModal, setShowDiscountModal] = useState(false)

  // State for modals
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [showCompanySelector, setShowCompanySelector] = useState(false)
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [showVariantQuantityModal, setShowVariantQuantityModal] = useState(false)

  // State for new client fields
  const [newClientName, setNewClientName] = useState("")
  const [newClientPhone, setNewClientPhone] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientAddress, setNewClientAddress] = useState("")
  const [newClientCity, setNewClientCity] = useState("")

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productSellingPrice, setProductSellingPrice] = useState("")
  const [priceType, setPriceType] = useState<"unit" | "total">("unit") // New state for price type

  // State for variant quantities
  const [variantQuantities, setVariantQuantities] = useState<VariantQuantity[]>([])

  // State for available data
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch products, clients, and companies data
  const fetchFormData = async () => {
    setIsLoading(true)
    try {
      const productRes = await axios.get(`${getBaseUrl()}/api/product-for-addsale`)
      setAvailableProducts(productRes.data)


      const clientsRes = await axios.get(`${getBaseUrl()}/api/clients`)
      setAvailableClients(clientsRes.data)

      const deliveryCompanyRes = await axios.get(`${getBaseUrl()}/api/delivery-companies`)
      setAvailableCompanies(deliveryCompanyRes.data)
    } catch (error) {
      console.error("Failed to load form data:", error)
      Alert.alert("Error", "Failed to load data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize data
  useEffect(() => {
    fetchFormData()
  }, [])

  // Calculate total sale amount
  const calculateTotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0)
  }

  // Calculate discount amount
  const calculateDiscount = () => {
    const total = calculateTotal()
    const discountVal = Number.parseFloat(discountValue) || 0

    if (discountType === "percentage") {
      const cappedPercentage = Math.min(discountVal, 100)
      return (total * cappedPercentage) / 100
    } else {
      return Math.min(discountVal, total)
    }
  }

  // Calculate final total after discount
  const calculateFinalTotal = () => {
    const total = calculateTotal()
    const discount = calculateDiscount()
    return total - discount
  }

  // Calculate change or credit
  const calculateChangeOrCredit = () => {
    const total = calculateFinalTotal()
    const paid = Number.parseFloat(amountPaid) || 0

    if (paymentMethod === "cash") {
      return paid > total ? paid - total : 0
    } else if (paymentMethod === "credit") {
      return total - paid
    }

    return 0
  }

  // Format variant description
  const formatVariantDescription = (variant: ProductVariant, product: Product) => {
    return Object.keys(variant.optionValues)
      .map((optionId) => {
        const option = product.options.find((opt) => opt.optionId === optionId)
        return `${option?.optionName}: ${variant.optionValues[optionId]}`
      })
      .join(", ")
  }

  // Initialize variant quantities when product is selected
  const initializeVariantQuantities = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      const initialQuantities = product.variants.map((variant) => ({
        variantId: variant.id,
        quantity: 0,
      }))
      setVariantQuantities(initialQuantities)
    } else {
      setVariantQuantities([])
    }
  }

  // Update variant quantity
  const updateVariantQuantity = (variantId: string, quantity: number) => {
    setVariantQuantities((prev) =>
      prev.map((vq) => (vq.variantId === variantId ? { ...vq, quantity: Math.max(0, quantity) } : vq)),
    )
  }

  // Get total quantity across all variants
  const getTotalVariantQuantity = () => {
    return variantQuantities.reduce((total, vq) => total + vq.quantity, 0)
  }

  // Calculate total price based on price type and quantities
  const calculateTotalPrice = () => {
    const price = Number.parseFloat(productSellingPrice) || 0
    const totalQuantity = getTotalVariantQuantity()

    if (priceType === "unit") {
      return price * totalQuantity
    } else {
      return price // Total price for all items
    }
  }

  // Add products to sale from variant quantities
  const addVariantQuantitiesToSale = () => {
    if (!selectedProduct) return;

    const price = Number.parseFloat(productSellingPrice) || 0;
    if (price <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un prix de vente valide supérieur à 0");
      return;
    }

    const totalQuantity = getTotalVariantQuantity();
    if (totalQuantity <= 0) {
      Alert.alert("Erreur", "Veuillez sélectionner au moins une variante avec une quantité supérieure à 0");
      return;
    }

    // Calculer le prix unitaire selon le type de prix
    const unitPrice = priceType === "unit" ? price : price / totalQuantity;

    // Créer les éléments de vente pour chaque variante avec une quantité > 0
    const newItems: SaleItem[] = [];

    variantQuantities.forEach((vq) => {
      if (vq.quantity > 0) {
        const variant = selectedProduct.variants.find((v) => v.id === vq.variantId);
        if (variant) {
          // Vérifier la disponibilité du stock
          if (variant.stockQty > 0 && vq.quantity > variant.stockQty) {
            Alert.alert(
              "Stock insuffisant",
              `Seulement ${variant.stockQty} unités disponibles pour ${formatVariantDescription(variant, selectedProduct)}.`
            );
            return;
          }

          const newItem: SaleItem = {
            id: `temp-${Date.now()}-${vq.variantId}`,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            brand: selectedProduct.brand,
            variantId: variant.id,
            variantDescription: formatVariantDescription(variant, selectedProduct),
            quantity: vq.quantity,
            selling_price: unitPrice,
            total: unitPrice * vq.quantity,
          };
          newItems.push(newItem);
        }
      }
    });

    if (newItems.length > 0) {
      setSaleItems([...saleItems, ...newItems]);

      // Réinitialiser les sélections
      setSelectedProduct(null);
      setProductSellingPrice("");
      setPriceType("unit");
      setVariantQuantities([]);
      setShowProductSelector(false);
      setShowVariantQuantityModal(false);
    }
  };


  // Add single product to sale (for products without variants)
  const addSingleProductToSale = () => {
    if (!selectedProduct) return

    const quantity = 1 // Default quantity for single product
    const sellingPrice = Number.parseFloat(productSellingPrice) || 0

    if (sellingPrice <= 0) {
      Alert.alert("Erreur", "Veuillez saisir un prix de vente valide supérieur à 0")

      return
    }

    // Check stock availability
    if (selectedProduct.stock > 0 && quantity > selectedProduct.stock) {
      Alert.alert("Stock insuffisant", `Seulement ${selectedProduct.stock} unités disponibles en stock.`)

      return
    }

    const newItem: SaleItem = {
      id: `temp-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      brand: selectedProduct.brand,
      quantity: quantity,
      selling_price: sellingPrice,
      total: sellingPrice * quantity,
    }

    setSaleItems([...saleItems, newItem])

    // Reset selections
    setSelectedProduct(null)
    setProductSellingPrice("")
    setShowProductSelector(false)
  }

  // Remove product from sale
  const removeProductFromSale = (itemId: string) => {
    setSaleItems(saleItems.filter((item) => item.id !== itemId))
  }

  // Update product quantity
  const updateProductQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      Alert.alert("Erreur", "La quantité doit être supérieure à 0")
      return
    }

    setSaleItems(
      saleItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            total: item.selling_price * newQuantity,
          }
        }
        return item
      }),
    )
  }

  // Handle payment method change
  const handlePaymentMethodChange = (method: "cash" | "credit") => {
    setPaymentMethod(method)

    if (method === "cash") {
      setAmountPaid(calculateTotal().toFixed(2))
      setCreditType(null)
      setSelectedCompany(null)
    } else if (method === "credit") {
      setAmountPaid("0")
      setCreditType("client")
      setSelectedCompany(null)
    }
  }

  // Save sale
  const saveSale = async () => {
    if (saleItems.length === 0) {
      Alert.alert("Erreur", "Veuillez ajouter au moins un produit à la vente")
      return
    }

    if (!selectedClient) {
      Alert.alert("Erreur", "Veuillez sélectionner un client")
      return
    }

    const total = calculateTotal()
    let paid = Number.parseFloat(amountPaid) || 0

    if (paymentMethod === "cash" && paid < total) {
      paid = calculateFinalTotal()
    }

    if (paymentMethod === "credit" && paid > total) {
      Alert.alert("Erreur", "Le montant du paiement à crédit ne peut pas dépasser le total")
      return
    }

    if (paymentMethod === "credit" && !creditType) {
      Alert.alert("Erreur", "Veuillez sélectionner un type de crédit")
      return
    }

    if (paymentMethod === "credit" && creditType === "delivery" && !selectedCompany) {
      Alert.alert("Erreur", "Veuillez sélectionner une société de livraison")
      return
    }

    const newSale = {
      items: saleItems,
      paymentMethod: paymentMethod,
      client: selectedClient,
      total: calculateTotal(),
      discount: {
        type: discountType,
        value: Number.parseFloat(discountValue) || 0,
        amount: calculateDiscount(),
      },
      finalTotal: calculateFinalTotal(),
      amountPaid: paid,
      remainingCredit: paymentMethod === "credit" ? calculateFinalTotal() - paid : 0,
      creditType: paymentMethod === "credit" ? creditType : null,
      company: paymentMethod === "credit" && creditType === "delivery" ? selectedCompany : null,
      change: paymentMethod === "cash" && paid > calculateFinalTotal() ? paid - calculateFinalTotal() : 0,
      date: new Date().toISOString(),
    }

    setIsLoading(true)
    try {
      await axios.post(`${getBaseUrl()}/api/sales`, newSale)

      router.push("/sales")
      setTimeout(() => {
        Alert.alert("Succès", "La vente a été enregistrée avec succès", [
          {
            text: "OK",
            onPress: () => router.push("/sales"),
          },
        ])
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la vente :", error)
      Alert.alert("Erreur", "Échec de l'enregistrement de la vente. Veuillez réessayer.")
      setIsLoading(false)
    }
  }


  // Filter functions
  const getFilteredProducts = () => {

    if (!searchQuery) return availableProducts

    const query = searchQuery.toLowerCase()
    return availableProducts.filter(
      (product) => product.name.toLowerCase().includes(query) || product.brand.name.toLowerCase().includes(query),
    )
  }

  const getFilteredClients = () => {
    if (!searchQuery) return availableClients

    const query = searchQuery.toLowerCase()
    return availableClients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        (client.phone && client.phone.includes(query)) ||
        (client.email && client.email.toLowerCase().includes(query)),
    )
  }

  const getFilteredCompanies = () => {
    if (!searchQuery) return availableCompanies

    const query = searchQuery.toLowerCase()
    return availableCompanies.filter((company) => company.name.toLowerCase().includes(query))
  }

  // Handle adding new client
  const handleAddNewClient = async () => {
    if (!newClientName.trim()) {
      Alert.alert("Erreur", "Le nom du client est requis")
      return
    }

    if (!newClientPhone.trim()) {
      Alert.alert("Erreur", "Le numéro de téléphone du client est requis")
      return
    }

    setIsLoading(true)
    try {
      const newClient = {
        id: `client-${Date.now()}`,
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim() || undefined,
        address: newClientAddress.trim() || undefined,
        city: newClientCity.trim() || undefined,
      }

      const response = await axios.post(`${getBaseUrl()}/api/clients`, { ...newClient, telephone: newClient.phone })

      setAvailableClients([...availableClients, response.data || newClient])
      setSelectedClient(response.data || newClient)

      // Réinitialiser le formulaire
      setNewClientName("")
      setNewClientPhone("")
      setNewClientEmail("")
      setNewClientAddress("")
      setNewClientCity("")
      setShowAddClientModal(false)
      setShowClientSelector(false)

      Alert.alert("Succès", "Nouveau client ajouté avec succès")
    } catch (error) {
      console.error("Erreur lors de l'ajout du client :", error)
      Alert.alert("Erreur", "Échec de l'ajout du client. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }


  const handleGoBack = () => {
    router.push("/sales")
  }

  // Handle product selection
  const handleProductSelection = async (product: Product) => {


    let prod = await axios.get(`${getBaseUrl()}/api/products/${product.id}`)

    setSelectedProduct(prod.data)

    initializeVariantQuantities(prod.data)

  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Ajouter une vente</Text>
          <TouchableOpacity style={styles.saveButton} onPress={saveSale}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>


        <ScrollView style={styles.content}>
          {/* Client Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <TouchableOpacity style={styles.clientSelector} onPress={() => setShowClientSelector(true)}>
              {selectedClient ? (
                <View style={styles.selectedClient}>
                  <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                  {selectedClient.phone && <Text style={styles.selectedClientDetail}>{selectedClient.phone}</Text>}
                </View>
              ) : (
                <Text style={styles.clientSelectorPlaceholder}>Sélectionner un client</Text>
              )}
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Produits</Text>
              <TouchableOpacity style={styles.addProductButton} onPress={() => setShowProductSelector(true)}>
                <Icon name="plus" size={16} color="#007AFF" />
                <Text style={styles.addProductButtonText}>Ajouter un produit</Text>
              </TouchableOpacity>
            </View>

            {saleItems.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Text style={styles.emptyProductsText}>Aucun produit ajouté pour le moment</Text>
                <TouchableOpacity style={styles.emptyProductsButton} onPress={() => setShowProductSelector(true)}>
                  <Text style={styles.emptyProductsButtonText}>Ajouter un produit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.productsList}>
                {saleItems.map((item) => (
                  <View key={item.id} style={styles.productItem}>
                    <View style={styles.productItemHeader}>
                      <Text style={styles.productItemName}>{item.productName}</Text>
                      <TouchableOpacity style={styles.productItemRemove} onPress={() => removeProductFromSale(item.id)}>
                        <Icon name="x" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.productItemDetails}>
                      <Text style={styles.productItemBrand}>{item.brand.name}</Text>
                      <Text style={styles.productItemPrice}>DT {item.selling_price.toFixed(2)}</Text>
                    </View>

                    {/* Affiche la description de la variante si disponible */}
                    {item.variantDescription && (
                      <Text style={styles.productItemVariant}>{item.variantDescription}</Text>
                    )}

                    <View style={styles.productItemFooter}>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateProductQuantity(item.id, item.quantity - 1)}
                        >
                          <Icon name="minus" size={16} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => updateProductQuantity(item.id, item.quantity + 1)}
                        >
                          <Icon name="plus" size={16} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.productItemTotal}>DT {item.total.toFixed(2)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>


          {/* Payment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paiement</Text>

            <View style={styles.paymentMethodSelector}>
              <TouchableOpacity
                style={[styles.paymentMethodOption, paymentMethod === "cash" && styles.paymentMethodSelected]}
                onPress={() => handlePaymentMethodChange("cash")}
              >
                <Icon name="dollar-sign" size={20} color={paymentMethod === "cash" ? "#007AFF" : "#666"} />
                <Text style={[styles.paymentMethodText, paymentMethod === "cash" && styles.paymentMethodTextSelected]}>
                  Espèces
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodOption, paymentMethod === "credit" && styles.paymentMethodSelected]}
                onPress={() => handlePaymentMethodChange("credit")}
              >
                <Icon name="credit-card" size={20} color={paymentMethod === "credit" ? "#007AFF" : "#666"} />
                <Text style={[styles.paymentMethodText, paymentMethod === "credit" && styles.paymentMethodTextSelected]}>
                  Crédit
                </Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === "credit" && (
              <View style={styles.creditTypeSelector}>
                <Text style={styles.creditTypeLabel}>Type de crédit :</Text>
                <View style={styles.creditTypeOptions}>
                  <TouchableOpacity
                    style={[styles.creditTypeOption, creditType === "client" && styles.creditTypeSelected]}
                    onPress={() => {
                      setCreditType("client")
                      setSelectedCompany(null)
                    }}
                  >
                    <Text style={[styles.creditTypeText, creditType === "client" && styles.creditTypeTextSelected]}>
                      Crédit client
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.creditTypeOption, creditType === "delivery" && styles.creditTypeSelected]}
                    onPress={() => setCreditType("delivery")}
                  >
                    <Text style={[styles.creditTypeText, creditType === "delivery" && styles.creditTypeTextSelected]}>
                      Crédit livraison
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {paymentMethod === "credit" && creditType === "delivery" && (
              <View style={styles.companySelector}>
                <Text style={styles.companySelectorLabel}>Société de livraison :</Text>
                <TouchableOpacity style={styles.companySelectorButton} onPress={() => setShowCompanySelector(true)}>
                  {selectedCompany ? (
                    <Text style={styles.selectedCompanyName}>{selectedCompany.name}</Text>
                  ) : (
                    <Text style={styles.companySelectorPlaceholder}>Sélectionner une société</Text>
                  )}
                  <Icon name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            {paymentMethod === "credit" && (
              <View style={styles.amountContainer}>
                <Text style={styles.amountLabel}>Montant payé :</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amountPaid}
                  onChangeText={setAmountPaid}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
            )}
          </View>


          {/* Summary Section */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sous-total :</Text>
              <Text style={styles.summaryValue}>DT {calculateTotal().toFixed(2)}</Text>
            </View>

            {Number.parseFloat(discountValue) > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.discountLabel]}>
                  Remise {discountType === "percentage" ? `(${discountValue}%)` : ""} :
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>- DT {calculateDiscount().toFixed(2)}</Text>
              </View>
            )}

            {paymentMethod === "cash" && Number.parseFloat(amountPaid) > calculateFinalTotal() && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Rendu :</Text>
                <Text style={styles.summaryValue}>DT {calculateChangeOrCredit().toFixed(2)}</Text>
              </View>
            )}

            {paymentMethod === "credit" && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.creditLabel]}>
                  {creditType === "client" ? "Crédit Client :" : "Crédit Livraison :"}
                </Text>
                <Text style={[styles.summaryValue, styles.creditValue]}>DT {calculateChangeOrCredit().toFixed(2)}</Text>
              </View>
            )}

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total :</Text>
              <Text style={styles.totalValue}>DT {calculateFinalTotal().toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.discountButton} onPress={() => setShowDiscountModal(true)}>
              <Icon name="percent" size={16} color="#007AFF" />
              <Text style={styles.discountButtonText}>
                {Number.parseFloat(discountValue) > 0
                  ? `Modifier la remise (${discountType === "percentage" ? discountValue + "%" : "DT " + discountValue})`
                  : "Ajouter une remise"}
              </Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Product Selector Modal */}
      <Modal
        visible={showProductSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProductSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un produit</Text>
              <TouchableOpacity onPress={() => setShowProductSelector(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher des produits..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Icon name="x" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={getFilteredProducts()}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.productListItem, selectedProduct?.id == item.id && styles.productListItemSelected]}
                  onPress={() => handleProductSelection(item)}
                >
                  <View>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImagePlaceholder}>
                        <Icon name="image" size={24} color="#ccc" />
                      </View>
                    )}
                  </View>

                  <View style={styles.productListItemContent}>
                    <Text style={styles.productListItemName}>{item.name} </Text>
                    <Text style={styles.productListItemBrand}>{item.brand.name}</Text>
                    <Text style={styles.productListItemStock}>
                      Stock : {item.variants && item.variants.length > 0 ? "Varie selon la variante" : item.stock}
                    </Text>
                  </View>
                  {selectedProduct?.id === item.id && <Icon name="check" size={20} color="#007AFF" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Aucun produit trouvé</Text>
                </View>
              }
            />

            {selectedProduct && (
              <View>
                <View style={styles.productInfoContainer}>
                  <View style={styles.productPriceContainer}>
                    <Text style={styles.productQuantityLabel}>Prix de vente (DT) :</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={productSellingPrice}
                      onChangeText={setProductSellingPrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  {/* Sélecteur du type de prix */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <View style={styles.priceTypeContainer}>
                      <Text style={styles.priceTypeLabel}>Type de prix :</Text>
                      <View style={styles.priceTypeOptions}>
                        <TouchableOpacity
                          style={[styles.priceTypeOption, priceType === "unit" && styles.priceTypeSelected]}
                          onPress={() => setPriceType("unit")}
                        >
                          <Text style={[styles.priceTypeText, priceType === "unit" && styles.priceTypeTextSelected]}>
                            Par unité
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.priceTypeOption, priceType === "total" && styles.priceTypeSelected]}
                          onPress={() => setPriceType("total")}
                        >
                          <Text style={[styles.priceTypeText, priceType === "total" && styles.priceTypeTextSelected]}>
                            Prix total
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Bouton gestion quantité variante */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                    <TouchableOpacity
                      style={styles.manageVariantButton}
                      onPress={() => setShowVariantQuantityModal(true)}
                    >
                      <Icon name="layers" size={16} color="#007AFF" />
                      <Text style={styles.manageVariantButtonText}>
                        Gérer les quantités des variantes ({getTotalVariantQuantity()} articles)
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setSelectedProduct(null)
                  setProductSellingPrice("")
                  setPriceType("unit")
                  setVariantQuantities([])
                  setShowProductSelector(false)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, !selectedProduct && styles.modalAddButtonDisabled]}
                onPress={() => {
                  if (selectedProduct) {
                    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
                      addVariantQuantitiesToSale()
                    } else {
                      addSingleProductToSale()
                    }
                  }
                }}
                disabled={!selectedProduct}
              >
                <Text style={styles.modalAddButtonText}>Ajouter à la vente</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Variant Quantity Modal */}
      <Modal
        visible={showVariantQuantityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVariantQuantityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gérer les quantités des variantes</Text>
              <TouchableOpacity onPress={() => setShowVariantQuantityModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <>
                <Text style={styles.productNameHeader}>{selectedProduct.name}</Text>

                {/* Résumé des prix */}
                <View style={styles.priceSummaryContainer}>
                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.priceSummaryLabel}>
                      {priceType === "unit" ? "Prix par unité :" : "Prix total :"}
                    </Text>
                    <Text style={styles.priceSummaryValue}>DT {productSellingPrice || "0.00"}</Text>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.priceSummaryLabel}>Quantité totale :</Text>
                    <Text style={styles.priceSummaryValue}>{getTotalVariantQuantity()}</Text>
                  </View>
                  <View style={styles.priceSummaryRow}>
                    <Text style={styles.priceSummaryTotalLabel}>Montant total :</Text>
                    <Text style={styles.priceSummaryTotalValue}>DT {calculateTotalPrice().toFixed(2)}</Text>
                  </View>
                </View>

                <ScrollView style={styles.variantList}>
                  {selectedProduct.variants.map((variant) => {
                    const variantQty = variantQuantities.find((vq) => vq.variantId === variant.id)?.quantity || 0

                    return (
                      <View key={variant.id} style={styles.variantQuantityItem}>
                        <View style={styles.variantInfo}>
                          <Text style={styles.variantName}>{formatVariantDescription(variant, selectedProduct)}</Text>
                          <Text style={styles.variantStock}>Stock : {variant.stockQty}</Text>
                        </View>

                        <View style={styles.variantQuantityControl}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => updateVariantQuantity(variant.id, variantQty - 1)}
                          >
                            <Icon name="minus" size={16} color="#007AFF" />
                          </TouchableOpacity>

                          <TextInput
                            style={styles.variantQuantityInput}
                            value={variantQty.toString()}
                            onChangeText={(text) => {
                              const value = Number.parseInt(text) || 0
                              updateVariantQuantity(variant.id, value)
                            }}
                            keyboardType="number-pad"
                          />

                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              const newQty = variantQty + 1
                              if (variant.stockQty > 0 && newQty > variant.stockQty) {
                                Alert.alert("Stock maximum", `Seulement ${variant.stockQty} unités disponibles en stock.`)
                              } else {
                                updateVariantQuantity(variant.id, newQty)
                              }
                            }}
                          >
                            <Icon name="plus" size={16} color="#007AFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  })}
                </ScrollView>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowVariantQuantityModal(false)}>
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, getTotalVariantQuantity() === 0 && styles.modalAddButtonDisabled]}
                onPress={() => setShowVariantQuantityModal(false)}
                disabled={getTotalVariantQuantity() === 0}
              >
                <Text style={styles.modalAddButtonText}>Terminé</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Client Selector Modal */}
      <Modal
        visible={showClientSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowClientSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un client</Text>
              <TouchableOpacity onPress={() => setShowClientSelector(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher des clients..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Icon name="x" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={getFilteredClients()}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.clientListItem}
                  onPress={() => {
                    setSelectedClient(item)
                    setShowClientSelector(false)
                  }}
                >
                  <View>
                    <Text style={styles.clientListItemName}>{item.name}</Text>
                    {item.telephone && <Text style={styles.clientListItemDetail}>{item.telephone}</Text>}
                    {item.email && <Text style={styles.clientListItemDetail}>{item.email}</Text>}
                    {item.address && <Text style={styles.clientListItemDetail}>{item.address}</Text>}
                    {item.city && <Text style={styles.clientListItemDetail}>{item.city}</Text>}
                  </View>
                  <Icon name="chevron-right" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Aucun client trouvé</Text>
                </View>
              }
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={() => {
                  setShowAddClientModal(true)
                  setShowClientSelector(false)
                }}
              >
                <Icon name="user-plus" size={18} color="#fff" />
                <Text style={styles.addNewButtonText}>Ajouter un nouveau client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Company Selector Modal */}
      <Modal
        visible={showCompanySelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompanySelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une entreprise</Text>
              <TouchableOpacity onPress={() => setShowCompanySelector(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher des entreprises..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Icon name="x" size={20} color="#999" />
                </TouchableOpacity>
              ) : null}
            </View>

            <FlatList
              data={getFilteredCompanies()}
              keyExtractor={(item) => item.id}
              style={styles.modalList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.companyListItem}
                  onPress={() => {
                    setSelectedCompany(item)
                    setShowCompanySelector(false)
                  }}
                >
                  <Text style={styles.companyListItemName}>{item.name}</Text>
                  <Icon name="chevron-right" size={20} color="#ccc" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyListText}>Aucune entreprise trouvée</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>


      {/* Add New Client Modal */}
      <Modal
        visible={showAddClientModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddClientModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un nouveau client</Text>
              <TouchableOpacity onPress={() => setShowAddClientModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Nom <Text style={styles.requiredField}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={newClientName}
                  onChangeText={setNewClientName}
                  placeholder="Entrez le nom du client"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Téléphone <Text style={styles.requiredField}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  value={newClientPhone}
                  onChangeText={setNewClientPhone}
                  placeholder="Entrez le numéro de téléphone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={newClientEmail}
                  onChangeText={setNewClientEmail}
                  placeholder="Entrez l'adresse email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Adresse</Text>
                <TextInput
                  style={styles.formInput}
                  value={newClientAddress}
                  onChangeText={setNewClientAddress}
                  placeholder="Entrez l'adresse"
                  multiline
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ville</Text>
                <TextInput
                  style={styles.formInput}
                  value={newClientCity}
                  onChangeText={setNewClientCity}
                  placeholder="Entrez la ville"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setNewClientName("")
                  setNewClientPhone("")
                  setNewClientEmail("")
                  setNewClientAddress("")
                  setNewClientCity("")
                  setShowAddClientModal(false)
                  setShowClientSelector(true)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalAddButton,
                  (!newClientName.trim() || !newClientPhone.trim()) && styles.modalAddButtonDisabled,
                ]}
                onPress={handleAddNewClient}
                disabled={!newClientName.trim() || !newClientPhone.trim()}
              >
                <Text style={styles.modalAddButtonText}>Enregistrer le client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Discount Modal */}
      <Modal
        visible={showDiscountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDiscountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une remise</Text>
              <TouchableOpacity onPress={() => setShowDiscountModal(false)}>
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.discountTypeSelector}>
              <Text style={styles.discountTypeLabel}>Type de remise :</Text>
              <View style={styles.discountTypeOptions}>
                <TouchableOpacity
                  style={[styles.discountTypeOption, discountType === "percentage" && styles.discountTypeSelected]}
                  onPress={() => setDiscountType("percentage")}
                >
                  <Text
                    style={[styles.discountTypeText, discountType === "percentage" && styles.discountTypeTextSelected]}
                  >
                    Pourcentage (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.discountTypeOption, discountType === "fixed" && styles.discountTypeSelected]}
                  onPress={() => setDiscountType("fixed")}
                >
                  <Text style={[styles.discountTypeText, discountType === "fixed" && styles.discountTypeTextSelected]}>
                    Montant fixe (DT)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.discountValueContainer}>
              <Text style={styles.discountValueLabel}>{discountType === "percentage" ? "Pourcentage :" : "Montant :"}</Text>
              <TextInput
                style={styles.discountValueInput}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="decimal-pad"
                placeholder={discountType === "percentage" ? "0%" : "0.00"}
              />
            </View>

            <View style={styles.discountSummary}>
              <Text style={styles.discountSummaryLabel}>Total initial :</Text>
              <Text style={styles.discountSummaryValue}>DT {calculateTotal().toFixed(2)}</Text>

              <Text style={styles.discountSummaryLabel}>Montant de la remise :</Text>
              <Text style={styles.discountSummaryValue}>DT {calculateDiscount().toFixed(2)}</Text>

              <Text style={styles.discountSummaryLabelFinal}>Total final :</Text>
              <Text style={styles.discountSummaryValueFinal}>DT {calculateFinalTotal().toFixed(2)}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDiscountValue("")
                  setShowDiscountModal(false)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Supprimer la remise</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalAddButton} onPress={() => setShowDiscountModal(false)}>
                <Text style={styles.modalAddButtonText}>Appliquer la remise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Loading Overlay */}
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
  keyboardAvoidingView: {
    flex: 1,
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  saveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  clientSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  clientSelectorPlaceholder: {
    color: "#999",
  },
  selectedClient: {
    flex: 1,
  },
  selectedClientName: {
    fontSize: 16,
    fontWeight: "500",
  },
  selectedClientDetail: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  addProductButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addProductButtonText: {
    color: "#007AFF",
    marginLeft: 4,
    fontSize: 14,
  },
  emptyProducts: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  emptyProductsText: {
    fontSize: 16,
    color: "#999",
    marginBottom: 12,
  },
  emptyProductsButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emptyProductsButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
  productsList: {
    marginTop: 8,
  },
  productItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  productItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  productItemName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  productItemRemove: {
    padding: 4,
  },
  productItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  productItemBrand: {
    fontSize: 14,
    color: "#666",
  },
  productItemPrice: {
    fontSize: 14,
    fontWeight: "500",
  },
  productItemVariant: {
    fontSize: 12,
    color: "#007AFF",
    fontStyle: "italic",
    marginBottom: 8,
  },
  productItemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  quantityButton: {
    padding: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 30,
    textAlign: "center",
  },
  quantityInput: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 30,
    textAlign: "center",
  },
  productItemTotal: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentMethodSelector: {
    flexDirection: "row",
    marginBottom: 16,
  },
  paymentMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  paymentMethodSelected: {
    backgroundColor: "#e6f2ff",
  },
  paymentMethodText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  paymentMethodTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  creditTypeSelector: {
    marginBottom: 16,
  },
  creditTypeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  creditTypeOptions: {
    flexDirection: "row",
  },
  creditTypeOption: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  creditTypeSelected: {
    backgroundColor: "#e6f2ff",
    borderColor: "#007AFF",
  },
  creditTypeText: {
    fontSize: 14,
    color: "#666",
  },
  creditTypeTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  companySelector: {
    width: 100,
  },
  companySelectorLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  companySelectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  companySelectorPlaceholder: {
    color: "#999",
  },
  selectedCompanyName: {
    fontSize: 16,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 12,
    width: 100,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  summarySection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  creditLabel: {
    color: "#FF9500",
  },
  creditValue: {
    color: "#FF9500",
    fontWeight: "bold",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "80%",
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
    marginTop: 0,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    marginLeft: 8,
    fontSize: 16,
  },
  modalList: {
    maxHeight: 300,
  },
  productListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productListItemSelected: {
    backgroundColor: "#f0f7ff",
  },
  productListItemContent: {
    flex: 1,
  },
  productListItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  productListItemBrand: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  productListItemStock: {
    fontSize: 12,
    color: "#666",
  },
  productNameHeader: {
    fontSize: 16,
    fontWeight: "600",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f9f9f9",
  },
  clientListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  clientListItemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  clientListItemDetail: {
    fontSize: 14,
    color: "#666",
  },
  companyListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  companyListItemName: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyList: {
    padding: 24,
    alignItems: "center",
  },
  emptyListText: {
    fontSize: 16,
    color: "#999",
  },
  productInfoContainer: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    width: "100%",
    gap: 10,
  },
  productPriceContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    width: "100%",
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 15,
    width: 215,
  },
  productQuantityLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  priceTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  priceTypeLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  priceTypeOptions: {
    flexDirection: "row",
  },
  priceTypeOption: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 8,
  },
  priceTypeSelected: {
    backgroundColor: "#e6f2ff",
    borderColor: "#007AFF",
  },
  priceTypeText: {
    fontSize: 14,
    color: "#666",
  },
  priceTypeTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  manageVariantButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f7ff",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    width: "100%",
  },
  manageVariantButtonText: {
    color: "#007AFF",
    fontWeight: "500",
    marginLeft: 8,
  },
  priceSummaryContainer: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  priceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priceSummaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceSummaryValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  priceSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  priceSummaryTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  variantList: {
    maxHeight: 300,
    padding: 16,
  },
  variantQuantityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  variantInfo: {
    flex: 1,
    marginRight: 16,
  },
  variantName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  variantStock: {
    fontSize: 12,
    color: "#666",
  },
  variantQuantityControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
  },
  variantQuantityInput: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 40,
    textAlign: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalActions: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
  modalAddButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    marginLeft: 8,
  },
  modalAddButtonDisabled: {
    backgroundColor: "#ccc",
  },
  modalAddButtonText: {
    color: "#fff",
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
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addNewButtonText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: 16,
    marginLeft: 8,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  requiredField: {
    color: "#FF3B30",
  },
  discountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  discountButtonText: {
    color: "#007AFF",
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  discountLabel: {
    color: "#FF3B30",
  },
  discountValue: {
    color: "#FF3B30",
  },
  discountTypeSelector: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  discountTypeLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  discountTypeOptions: {
    flexDirection: "row",
  },
  discountTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginRight: 8,
    alignItems: "center",
  },
  discountTypeSelected: {
    backgroundColor: "#e6f2ff",
    borderColor: "#007AFF",
  },
  discountTypeText: {
    fontSize: 14,
    color: "#666",
  },
  discountTypeTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  discountValueContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  discountValueLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  discountValueInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  discountSummary: {
    padding: 16,
  },
  discountSummaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  discountSummaryValue: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  discountSummaryLabelFinal: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  discountSummaryValueFinal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
    productImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
})

export default AddSaleScreen
