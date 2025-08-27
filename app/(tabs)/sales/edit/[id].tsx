"use client"

import { Stack, useRouter, useLocalSearchParams } from "expo-router"
import { useNavigation } from "@react-navigation/native"
import { getBaseUrl } from "@/utils/api"
import { useState, useEffect, useLayoutEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
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
  brand: {
    id: string
    name: string
  }
  options: ProductOption[]
  variants: ProductVariant[]
  stock: number
}

interface Client {
  id: string
  name: string
  phone?: string
  email?: string
}

interface Company {
  id: string
  name: string
}

// Update the SaleItem interface to include variant information
interface SaleItem {
  productVariant: ReactNode
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
  price: number
  total: number
}

interface Sale {
  id: string
  items: SaleItem[]
  paymentMethod: "cash" | "credit"
  client: Client
  total: number
  discountType: "percentage" | "fixed" | null
  discountValue: number
  discountedTotal: number
  amountPaid: number
  remainingCredit: number
  creditType: "client" | "delivery" | null
  company: Company | null
  change: number
  date: string
}

const EditSaleScreen = () => {
  useProtectedRoute()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  // State for form fields
  const [sale, setSale] = useState<Sale | null>(null)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit">("cash")
  const [amountPaid, setAmountPaid] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | null>(null)
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [creditType, setCreditType] = useState<"client" | "delivery" | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add these new state variables
  const [priceType, setPriceType] = useState<"per-unit" | "total">("per-unit")
  const [variantQuantities, setVariantQuantities] = useState<{ [variantId: string]: number }>({})
  const [showVariantQuantityModal, setShowVariantQuantityModal] = useState(false)

  // State for modals
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [showCompanySelector, setShowCompanySelector] = useState(false)
  const [showVariantSelector, setShowVariantSelector] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [productQuantity, setProductQuantity] = useState("1")
  const [productSellingPrice, setProductSellingPrice] = useState("")

  // State for available data
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch sale data
  const fetchSale = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(`${getBaseUrl()}/api/sales/${id}`)
      setSale(res.data)

      // Initialize form with sale data
      setSaleItems(res.data.items)
      setSelectedClient(res.data.client)
      setPaymentMethod(res.data.paymentMethod)
      setAmountPaid(res.data.amountPaid.toString())
      setDiscountType(res.data.discountType || null)
      setDiscountValue(res.data.discountValue || 0)
      setCreditType(res.data.creditType)
      setSelectedCompany(res.data.company)

      // Fetch additional data needed for dropdowns
      fetchFormData()
    } catch (error) {
      console.error("Failed to load sale:", error)
      setError("Failed to load sale. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch products, clients, and companies data
  const fetchFormData = async () => {
    try {
      const productsRes = await axios.get(`${getBaseUrl()}/api/product-for-addsale`)
      const clientsRes = await axios.get(`${getBaseUrl()}/api/clients`)
      const companiesRes = await axios.get(`${getBaseUrl()}/api/delivery-companies`)

      setAvailableProducts(productsRes.data)
      setAvailableClients(clientsRes.data)
      setAvailableCompanies(companiesRes.data || [])
    } catch (error) {
      console.error("Failed to load form data:", error)
    }
  }

  // Initialize data
  useEffect(() => {
    if (id) {
      fetchSale()
    } else {
      router.push("/sales")
    }
  }, [id])

  // Helper functions
  const calculateSubtotal = () => {
    return saleItems.reduce((sum, item) => sum + item.total, 0)
  }

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal()
    if (!discountType || discountValue <= 0) return 0

    if (discountType === "percentage") {
      return subtotal * (discountValue / 100)
    } else {
      return Math.min(discountValue, subtotal)
    }
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discountAmount = calculateDiscountAmount()
    return subtotal - discountAmount
  }

  const calculateChangeOrCredit = () => {
    const total = calculateTotal()
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

  // Get available stock for a variant or product
  const getAvailableStock = (product: Product, variant?: ProductVariant) => {
    if (variant) {
      return variant.stockQty
    }
    return product.stock || 0
  }

  // Add these helper functions
  const getTotalSelectedQuantity = () => {
    return Object.values(variantQuantities).reduce((sum, qty) => sum + qty, 0)
  }

  const calculateVariantPrice = () => {
    const totalQty = getTotalSelectedQuantity()
    const price = Number.parseFloat(productSellingPrice) || 0

    if (totalQty === 0 || price === 0) return { unitPrice: 0, totalPrice: 0 }

    if (priceType === "per-unit") {
      return {
        unitPrice: price,
        totalPrice: price * totalQty,
      }
    } else {
      return {
        unitPrice: price / totalQty,
        totalPrice: price,
      }
    }
  }

  const resetVariantSelections = () => {
    setVariantQuantities({})
    setPriceType("per-unit")
    setProductQuantity("1")
    setProductSellingPrice("")
  }

  // Discount handlers
  const handleAddDiscount = () => {
    setShowDiscountModal(true)
  }

  const handleApplyDiscount = (type: "percentage" | "fixed" | null, value: number) => {
    setDiscountType(type)
    setDiscountValue(value)
    setShowDiscountModal(false)
  }

  const handleRemoveDiscount = () => {
    setDiscountType(null)
    setDiscountValue(0)
    setShowDiscountModal(false)
  }

  // Replace the existing addProductToSale function
  const addProductToSale = () => {
    if (!selectedProduct) return

    const sellingPrice = Number.parseFloat(productSellingPrice) || 0
    if (sellingPrice <= 0) {
      Alert.alert("Error", "Please enter a valid selling price greater than 0")
      return
    }

    // Handle products with variants
    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
      const totalQty = getTotalSelectedQuantity()
      if (totalQty === 0) {
        Alert.alert("Error", "Please select at least one variant with quantity greater than 0")
        return
      }

      const { unitPrice } = calculateVariantPrice()
      const newItems: SaleItem[] = []

      // Create sale items for each variant with quantity > 0
      Object.entries(variantQuantities).forEach(([variantId, quantity]) => {
        if (quantity > 0) {
          const variant = selectedProduct.variants.find((v) => v.id === variantId)
          if (variant) {
            const newItem: SaleItem = {
              id: `temp-${Date.now()}-${variantId}`,
              productId: selectedProduct.id,
              productName: selectedProduct.name,
              brand: selectedProduct.brand,
              variantId: variant.id,
              variantDescription: formatVariantDescription(variant, selectedProduct),
              quantity: quantity,
              price: unitPrice,
              total: unitPrice * quantity,
            }
            newItems.push(newItem)
          }
        }
      })

      setSaleItems([...saleItems, ...newItems])
    } else {
      // Handle products without variants (existing logic)
      const quantity = Number.parseInt(productQuantity) || 1
      if (quantity <= 0) {
        Alert.alert("Error", "Quantity must be greater than 0")
        return
      }

      const availableStock = getAvailableStock(selectedProduct)
      if (availableStock <= 0) {
        Alert.alert(
          "Out of Stock Warning",
          `${selectedProduct.name} is currently out of stock. Do you want to add it anyway?`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Add Anyway",
              onPress: () => {
                proceedToAddItem()
              },
            },
          ],
        )
      } else if (quantity > availableStock) {
        Alert.alert("Insufficient Stock", `Only ${availableStock} units available in stock.`)
        return
      } else {
        proceedToAddItem()
      }
    }

    // Reset selections
    setSelectedProduct(null)
    setSelectedVariant(null)
    resetVariantSelections()
    setShowProductSelector(false)
    setShowVariantSelector(false)
    setShowVariantQuantityModal(false)
  }

  // Helper function to add item to sale
  const proceedToAddItem = () => {
    if (!selectedProduct) return

    const quantity = Number.parseInt(productQuantity) || 1
    const sellingPrice = Number.parseFloat(productSellingPrice) || 0

    const newItem: SaleItem = {
      id: `temp-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      brand: selectedProduct.brand,
      variantId: selectedVariant?.id,
      variantDescription: selectedVariant ? formatVariantDescription(selectedVariant, selectedProduct) : undefined,
      quantity: quantity,
      price: sellingPrice,
      total: sellingPrice * quantity,
    }

    setSaleItems([...saleItems, newItem])

    // Reset selections
    setSelectedProduct(null)
    setSelectedVariant(null)
    setProductQuantity("1")
    setProductSellingPrice("")
    setShowProductSelector(false)
    setShowVariantSelector(false)
  }

  // Remove product from sale
  const removeProductFromSale = (itemId: string) => {
    setSaleItems(saleItems.filter((item) => item.id !== itemId))
  }

  // Update product quantity
  const updateProductQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      Alert.alert("Error", "Quantity must be greater than 0")
      return
    }

    setSaleItems(
      saleItems.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            total: item.price * newQuantity,
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

  // Update sale
  const updateSale = async () => {
    if (saleItems.length === 0) {
      Alert.alert("Error", "Please add at least one product to the sale")
      return
    }

    if (!selectedClient) {
      Alert.alert("Error", "Please select a client")
      return
    }

    const total = calculateTotal()
    let paid = Number.parseFloat(amountPaid) || 0

    if (paymentMethod === "cash") {
      paid = total
    }

    if (paymentMethod === "credit" && paid > total) {
      Alert.alert("Error", "Credit payment amount cannot exceed the total")
      return
    }

    if (paymentMethod === "credit" && !creditType) {
      Alert.alert("Error", "Please select a credit type")
      return
    }

    if (paymentMethod === "credit" && creditType === "delivery" && !selectedCompany) {
      Alert.alert("Error", "Please select a delivery company")
      return
    }

    const updatedSale: Sale = {
      id: id,
      items: saleItems,
      paymentMethod: paymentMethod,
      client: selectedClient,
      total: calculateSubtotal(),
      discountType: discountType,
      discountValue: discountValue,
      discountedTotal: calculateTotal(),
      amountPaid: paid,
      remainingCredit: paymentMethod === "credit" ? calculateTotal() - paid : 0,
      creditType: paymentMethod === "credit" ? creditType : null,
      company: paymentMethod === "credit" && creditType === "delivery" ? selectedCompany : null,
      change: paymentMethod === "cash" && paid > calculateTotal() ? paid - calculateTotal() : 0,
      date: sale?.date || new Date().toISOString(),
    }

    setIsLoading(true)
    try {
      await axios.put(`${getBaseUrl()}/api/sales/${id}`, updatedSale)

      nav.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      })

      router.push("/sales")
      setTimeout(() => {
        Alert.alert("Success", "Sale has been updated successfully", [
          {
            text: "OK",
            onPress: () => router.push("/sales"),
          },
        ])
        setIsLoading(false)
      }, 1000)
    } catch (error) {
      console.error("Error updating sale:", JSON.stringify(error.response))
      Alert.alert("Error", "Failed to update sale. Please try again.")
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

  // Hide tab
  const nav = useNavigation()

  useLayoutEffect(() => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    })

    return () => {
      nav.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      })
    }
  }, [nav])

  const handleGoBack = () => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "flex" },
    })
    router.push("/sales")
  }

  // Update the handleProductSelection function
  const handleProductSelection = async (product: Product) => {

    let prod = await axios.get(`${getBaseUrl()}/api/products/${product.id}`)
    setSelectedProduct(prod.data)
    resetVariantSelections()


    setSelectedVariant(null)
  }

  // Show loading state
  if (isLoading && !sale) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sale...</Text>
      </SafeAreaView>
    )
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle" size={50} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.push("/sales")}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
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
          <Text style={styles.title}>Modifier la vente</Text>
          <TouchableOpacity style={styles.saveButton} onPress={updateSale}>
            <Text style={styles.saveButtonText}>Mettre à jour</Text>
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
                <Text style={styles.emptyProductsText}>Aucun produit ajouté pour l’instant</Text>
                <TouchableOpacity style={styles.emptyProductsButton} onPress={() => setShowProductSelector(true)}>
                  <Text style={styles.emptyProductsButtonText}>Ajouter un produit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.productsList}>
                {saleItems.map((item) => (
                  <View key={item.id} style={styles.productItem}>
                    <View style={styles.productItemHeader}>
                      <View style={styles.labelProduct}>
                        <Text style={styles.productItemName}>{item.productName}  </Text>
                      </View>
                      <TouchableOpacity style={styles.productItemRemove} onPress={() => removeProductFromSale(item.id)}>
                        <Icon name="x" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.productItemDetails}>
                      <Text style={styles.productItemBrand}>{item.brand.name}</Text>
                      <Text style={styles.productItemPrice}>DT {item.price.toFixed(2)}</Text>
                    </View>

                    {/* Affiche la description de la variante si disponible */}
                    {item.productVariant && (
                      <Text style={styles.productItemVariant}>        {item.productVariant}</Text>
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
              <Text style={styles.summaryValue}>DT {calculateSubtotal().toFixed(2)}</Text>
            </View>

            {discountType ? (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Remise ({discountType === "percentage" ? `${discountValue}%` : `DT ${discountValue.toFixed(2)}`}):
                </Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  - DT {calculateDiscountAmount().toFixed(2)}
                </Text>
              </View>
            ) : (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Remise :</Text>
                <TouchableOpacity onPress={handleAddDiscount}>
                  <Text style={styles.addDiscountText}>Ajouter une remise</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.summaryRow, discountType ? styles.discountedTotalRow : {}]}>
              <Text style={discountType ? styles.discountedTotalLabel : styles.summaryLabel}>
                {discountType ? "Total après remise :" : "Total :"}
              </Text>
              <Text style={discountType ? styles.discountedTotalValue : styles.summaryValue}>
                DT {calculateTotal().toFixed(2)}
              </Text>
            </View>
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
                  style={[styles.productListItem, selectedProduct?.id === item.id && styles.productListItemSelected]}
                  onPress={() => handleProductSelection(item)}
                >
                  <View style={styles.productListItemContent}>
                    <Text style={styles.productListItemName}>{item.name}</Text>
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
                    <Text style={styles.priceTypeLabel}>Prix de vente (DT) :</Text>
                    <TextInput
                      style={styles.priceInput}
                      value={productSellingPrice}
                      onChangeText={setProductSellingPrice}
                      placeholder="0,00"
                      keyboardType="decimal-pad"
                    />
                  </View>


                  {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                    <>
                      <View style={styles.priceTypeContainer}>
                        <Text style={styles.priceTypeLabel}>Type de prix :</Text>
                        <View style={styles.priceTypeSelector}>
                          <TouchableOpacity
                            style={[styles.priceTypeOption, priceType === "per-unit" && styles.priceTypeSelected]}
                            onPress={() => setPriceType("per-unit")}
                          >
                            <Text
                              style={[styles.priceTypeText, priceType === "per-unit" && styles.priceTypeTextSelected]}
                            >
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

                      <TouchableOpacity
                        style={styles.manageVariantButton}
                        onPress={() => setShowVariantQuantityModal(true)}
                      >
                        <Icon name="settings" size={20} color="#007AFF" />
                        <Text style={styles.manageVariantButtonText}>
                          Gérer la quantité des variantes ({getTotalSelectedQuantity()} articles)
                        </Text>
                        <Icon name="chevron-right" size={20} color="#007AFF" />
                      </TouchableOpacity>


                      {getTotalSelectedQuantity() > 0 && (
                        <View style={styles.priceSummary}>
                          <Text style={styles.priceSummaryText}>
                            {getTotalSelectedQuantity()} articles × {calculateVariantPrice().unitPrice.toFixed(2)} DT ={" "}
                            {calculateVariantPrice().totalPrice.toFixed(2)} DT
                          </Text>
                        </View>
                      )}

                    </>
                  ) : (
                    <View style={styles.productQuantityControl}>
                      <Text style={styles.productQuantityLabel}>Quantity:</Text>
                      <View style={styles.quantityControl}>
                        {/* Bouton - pour diminuer la quantité (pas en dessous de 1) */}
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            const current = Number.parseInt(productQuantity) || 0;
                            if (current > 1) {
                              setProductQuantity((current - 1).toString());
                            }
                          }}
                        >
                          <Icon name="minus" size={16} color="#007AFF" />
                        </TouchableOpacity>

                        {/* Input pour saisir directement la quantité */}
                        <TextInput
                          style={styles.quantityInput}
                          value={productQuantity}
                          onChangeText={(text) => {
                            const value = Number.parseInt(text) || 0;
                            if (selectedProduct.stock <= 0) {
                              // Stock illimité ou non défini, accepte n'importe quelle quantité
                              setProductQuantity(text);
                            } else {
                              if (value <= selectedProduct.stock) {
                                // Quantité valide, dans les limites du stock
                                setProductQuantity(text);
                              } else {
                                // Quantité dépasse stock, limite et alerte
                                setProductQuantity(selectedProduct.stock.toString());
                                Alert.alert("Maximum Stock", `Only ${selectedProduct.stock} units available in stock.`);
                              }
                            }
                          }}
                          keyboardType="number-pad"
                        />

                        {/* Bouton + pour augmenter la quantité (pas au-delà du stock) */}
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            const current = Number.parseInt(productQuantity) || 0;
                            if (selectedProduct.stock <= 0) {
                              // Stock illimité, on augmente sans limite
                              setProductQuantity((current + 1).toString());
                            } else {
                              if (current < selectedProduct.stock) {
                                // On augmente si on est en dessous du stock
                                setProductQuantity((current + 1).toString());
                              } else {
                                // Sinon alerte stock max atteint
                                Alert.alert("Maximum Stock", `Only ${selectedProduct.stock} units available in stock.`);
                              }
                            }
                          }}
                        >
                          <Icon name="plus" size={16} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    </View>

                  )}
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setSelectedProduct(null)
                  setSelectedVariant(null)
                  resetVariantSelections()
                  setShowProductSelector(false)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, !selectedProduct && styles.modalAddButtonDisabled]}
                onPress={() => {
                  if (selectedProduct) {
                    addProductToSale()
                  }
                }}
                disabled={!selectedProduct}
              >
                <Text style={styles.modalAddButtonText}>Ajouter un produit</Text>

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

                <ScrollView style={styles.variantQuantityList}>
                  {selectedProduct.variants.map((variant) => (
                    <View key={variant.id} style={styles.variantQuantityItem}>
                      <View style={styles.variantQuantityInfo}>
                        <Text style={styles.variantQuantityName}>
                          {formatVariantDescription(variant, selectedProduct)}
                        </Text>
                        <Text style={styles.variantQuantityStock}>Stock : {variant.stockQty}</Text>
                      </View>

                      <View style={styles.variantQuantityControl}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            const current = variantQuantities[variant.id] || 0;
                            if (current > 0) {
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [variant.id]: current - 1,
                              }));
                            }
                          }}
                        >
                          <Icon name="minus" size={16} color="#007AFF" />
                        </TouchableOpacity>

                        <TextInput
                          style={styles.quantityInput}
                          value={(variantQuantities[variant.id] || 0).toString()}
                          onChangeText={(text) => {
                            const value = Number.parseInt(text) || 0;
                            if (variant.stockQty <= 0) {
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [variant.id]: value,
                              }));
                            } else {
                              if (value <= variant.stockQty) {
                                setVariantQuantities((prev) => ({
                                  ...prev,
                                  [variant.id]: value,
                                }));
                              } else {
                                setVariantQuantities((prev) => ({
                                  ...prev,
                                  [variant.id]: variant.stockQty,
                                }));
                                Alert.alert(
                                  "Stock maximal",
                                  `Seulement ${variant.stockQty} unités disponibles pour cette variante.`,
                                );
                              }
                            }
                          }}
                          keyboardType="number-pad"
                        />

                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => {
                            const current = variantQuantities[variant.id] || 0;
                            if (variant.stockQty <= 0) {
                              setVariantQuantities((prev) => ({
                                ...prev,
                                [variant.id]: current + 1,
                              }));
                            } else {
                              if (current < variant.stockQty) {
                                setVariantQuantities((prev) => ({
                                  ...prev,
                                  [variant.id]: current + 1,
                                }));
                              } else {
                                Alert.alert(
                                  "Stock maximal",
                                  `Seulement ${variant.stockQty} unités disponibles pour cette variante.`,
                                );
                              }
                            }
                          }}
                        >
                          <Icon name="plus" size={16} color="#007AFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {getTotalSelectedQuantity() > 0 && (
                  <View style={styles.variantQuantitySummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Quantité totale :</Text>
                      <Text style={styles.summaryValue}>{getTotalSelectedQuantity()}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        {priceType === "per-unit" ? "Prix par unité :" : "Prix total :"}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {Number.parseFloat(productSellingPrice || "0").toFixed(2)} DT
                      </Text>
                    </View>
                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                      <Text style={styles.summaryTotalLabel}>Montant total :</Text>
                      <Text style={styles.summaryTotalValue}>{calculateVariantPrice().totalPrice.toFixed(2)} DT</Text>
                    </View>
                  </View>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowVariantQuantityModal(false)}>
                <Text style={styles.modalCancelButtonText}>Fermer</Text>
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
                    {item.phone && <Text style={styles.clientListItemDetail}>{item.phone}</Text>}
                    {item.email && <Text style={styles.clientListItemDetail}>{item.email}</Text>}
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

            {discountType && (
              <View style={styles.discountValueContainer}>
                <Text style={styles.discountValueLabel}>
                  {discountType === "percentage" ? "Pourcentage :" : "Montant :"}
                </Text>
                <TextInput
                  style={styles.discountValueInput}
                  value={discountValue.toString()}
                  onChangeText={(text) => {
                    const value = Number.parseFloat(text) || 0
                    if (discountType === "percentage") {
                      setDiscountValue(Math.min(value, 100))
                    } else {
                      setDiscountValue(Math.min(value, calculateSubtotal()))
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
                <Text style={styles.discountValueUnit}>{discountType === "percentage" ? "%" : "DT"}</Text>
              </View>
            )}

            {discountType && (
              <View style={styles.discountPreview}>
                <View style={styles.discountPreviewRow}>
                  <Text style={styles.discountPreviewLabel}>Total initial :</Text>
                  <Text style={styles.discountPreviewValue}>DT {calculateSubtotal().toFixed(2)}</Text>
                </View>
                <View style={styles.discountPreviewRow}>
                  <Text style={styles.discountPreviewLabel}>Montant de la remise :</Text>
                  <Text style={styles.discountPreviewValue}>DT {calculateDiscountAmount().toFixed(2)}</Text>
                </View>
                <View style={[styles.discountPreviewRow, styles.discountPreviewTotal]}>
                  <Text style={styles.discountPreviewTotalLabel}>Total final :</Text>
                  <Text style={styles.discountPreviewTotalValue}>DT {calculateTotal().toFixed(2)}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              {discountType && (
                <TouchableOpacity style={styles.removeDiscountButton} onPress={handleRemoveDiscount}>
                  <Text style={styles.removeDiscountButtonText}>Supprimer la remise</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDiscountType(sale?.discountType || null)
                  setDiscountValue(sale?.discountValue || 0)
                  setShowDiscountModal(false)
                }}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalAddButton, (!discountType || discountValue <= 0) && styles.modalAddButtonDisabled]}
                onPress={() => handleApplyDiscount(discountType, discountValue)}
                disabled={!discountType || discountValue <= 0}
              >
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
  labelProduct: {
    flexDirection: "row"
  },
  productItemName: {
    fontSize: 16,
    fontWeight: "500",

  },
  productItemOption: {
    fontSize: 16,


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
    marginBottom: 16,
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
  variantListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  variantListItemSelected: {
    backgroundColor: "#f0f7ff",
  },
  variantListItemContent: {
    flex: 1,
  },
  variantListItemName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  variantListItemStock: {
    fontSize: 12,
    color: "#666",
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
  productQuantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  productQuantityLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  productPriceContainer: {
    // padding: 16,
    marginBottom : 15,
    paddingTop: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"

  },
  productPriceLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 35
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
    marginVertical: 16,
  },
  errorButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  addDiscountText: {
    color: "#007AFF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  discountValue: {
    color: "#FF3B30",
  },
  discountedTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  discountedTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  discountedTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
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
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  discountValueLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 12,
    width: 100,
  },
  discountValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  discountValueUnit: {
    fontSize: 16,
    color: "#666",
    width: 30,
  },
  discountPreview: {
    padding: 16,
  },
  discountPreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  discountPreviewLabel: {
    fontSize: 14,
    color: "#666",
  },
  discountPreviewValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  discountPreviewTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  discountPreviewTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  discountPreviewTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  removeDiscountButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 8,
  },
  removeDiscountButtonText: {
    color: "#FF3B30",
    fontSize: 16,
    fontWeight: "500",
  },
  productInfoContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  priceTypeContainer: {
    marginBottom: 16,
  },
  priceTypeLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  priceTypeSelector: {
    flexDirection: "row",
  },
  priceTypeOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    marginRight: 8,
    alignItems: "center",
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
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  manageVariantButtonText: {
    flex: 1,
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    marginLeft: 8,
  },
  priceSummary: {
    backgroundColor: "#f0f7ff",
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  priceSummaryText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
    textAlign: "center",
  },
  productQuantityControl: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  variantQuantityList: {
    maxHeight: 300,
  },
  variantQuantityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  variantQuantityInfo: {
    flex: 1,
    marginRight: 16,
  },
  variantQuantityName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  variantQuantityStock: {
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
  variantQuantitySummary: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
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


})

export default EditSaleScreen
