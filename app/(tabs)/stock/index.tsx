"use client";

import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { getBaseUrl } from "@/utils/api";
import axios from "axios";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

// Product variant type definition
interface ProductVariant {
  id: string;
  optionValues: { [optionId: string]: string }; // Maps optionId to selected value
  sku: string;
  stockQty: number;
}

// Product option type definition
interface ProductOption {
  optionId: string;
  optionName: string;
  values: string[];
}

// Product type definition
interface Product {
  id: string;
  name: string;
  image: string | null;
  category: string;
  brand: {
    id: string;
    name: string;
  };
  price: number;
  stock?: number; // Add this line
  options: ProductOption[];
  variants: ProductVariant[];
}

// Filter type definition
interface FilterOptions {
  category: string | null;
  brand: string | null;
  stockLevel: "all" | "low" | "out" | null;
  productOptions: { optionName: string; value: string }[];
}

const StockScreen = ({ }) => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  // Sample products data with variants
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${getBaseUrl()}/api/products`);
      setProducts(res.data);
    } catch (error) {
      console.error("Échec du chargement des produits :", error);
      Alert.alert(
        "Erreur",
        "Échec du chargement des produits. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const [optionFilters, setOptionFilters] = useState([]);

  const getOptionsWithValues = async () => {
    try {
      const response = await axios.get(`${getBaseUrl()}/api/product-options`);
      setOptionFilters(response.data);
    } catch (error) {
      console.error("Failed to fetch product options:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    getOptionsWithValues();
  }, []);

  useFocusEffect(
    useCallback(() => {
    fetchProducts();
    getOptionsWithValues();
    }, [])
  );
  // State for search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  // State for filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    category: null,
    brand: null,
    stockLevel: null,
    productOptions: [],
  });

  // State for variant stock modal
  const [variantStockModal, setVariantStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(
    null
  );
  const [newStockQty, setNewStockQty] = useState("");

  // Add this after the existing state declarations
  const [editingGlobalStock, setEditingGlobalStock] = useState(false);
  const [newGlobalStock, setNewGlobalStock] = useState("");

  // State for delete confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  // Get unique categories and brands for filters
  const categories = Array.from(
    new Set(products.map((product) => product.category))
  );
  const brands = Array.from(
    new Set(products.map((product) => product.brand.name))
  );

  // Replace the existing getTotalStock function
  const getTotalStock = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce(
        (total, variant) => total + variant.stockQty,
        0
      );
    }
    return product.stock || 0;
    0;
  };

  // Function to check if a product has low stock
  const hasLowStock = (product: Product) => {
    return getTotalStock(product) <= 10 && getTotalStock(product) > 0;
  };

  // Function to check if a product is out of stock
  const isOutOfStock = (product: Product) => {
    return getTotalStock(product) === 0;
  };

  // Function to filter products
  const getFilteredProducts = () => {
    return products.filter((product) => {
      // Search filter
      if (
        searchQuery &&
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !product.brand.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !product.category.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Category filter
      if (filters.category && product.category !== filters.category) {
        return false;
      }

      // Brand filter
      if (filters.brand && product.brand.name !== filters.brand) {
        return false;
      }

      // Stock level filter
      if (filters.stockLevel) {
        if (filters.stockLevel === "out" && !isOutOfStock(product)) {
          return false;
        }
        if (filters.stockLevel === "low" && !hasLowStock(product)) {
          return false;
        }
      }

      // Product options filter
      if (filters.productOptions.length > 0) {
        if (!product.variants || product.variants.length === 0) return false;

        const hasMatchingVariant = product.variants.some((variant) => {
          if (variant.stockQty <= 0) return false;

          const matchAll = filters.productOptions.every((option) => {
            const pattern = new RegExp(
              `${option.optionName.toLowerCase()}:\\s*${option.value}`,
              "i"
            );
            return pattern.test(variant.sku);
          });

          return matchAll;
        });

        if (!hasMatchingVariant) return false;
      }

      // If it passes all filters
      return true;
    });
  };

  // Function to reset filters
  const resetFilters = () => {
    setFilters({
      category: null,
      brand: null,
      stockLevel: null,
      productOptions: [],
    });
  };

  // Function to open variant stock modal
  const openVariantStockModal = (product: Product) => {
    setSelectedProduct(product);
    setVariantStockModal(true);
  };

  // Function to open stock update modal for a specific variant
  const openStockUpdateModal = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setNewStockQty(variant.stockQty.toString());
  };

  const updateVariantStock = async () => {
    if (!selectedProduct || !editingVariant) return;

    const qty = Number.parseInt(newStockQty);
    if (isNaN(qty) || qty < 0) {
      Alert.alert("Error", "Please enter a valid stock quantity.");
      return;
    }

    try {
      // ✅ 1. Send update to backend
      await axios.put(
        `${getBaseUrl()}/api/product-variants/${editingVariant.id}/stock`,
        {
          stock_qty: qty,
        }
      );

      // ✅ 2. Update local products state
      const updatedProducts = products.map((product) => {
        if (product.id === selectedProduct.id) {
          return {
            ...product,
            variants: product.variants.map((variant) => {
              if (variant.id === editingVariant.id) {
                return { ...variant, stockQty: qty };
              }
              return variant;
            }),
          };
        }
        return product;
      });

      setProducts(updatedProducts);

      // ✅ 3. Also update selectedProduct to trigger UI re-render
      const updatedProduct = updatedProducts.find(
        (p) => p.id === selectedProduct.id
      );
      if (updatedProduct) {
        setSelectedProduct(updatedProduct);
      }

      setEditingVariant(null);
      Alert.alert("Success", "Stock updated successfully.");
    } catch (error) {
      console.error("Failed to update stock", error);
      Alert.alert("Error", "Failed to update stock. Please try again.");
    }
  };

  // Add this function after updateVariantStock function
  const updateGlobalStock = async () => {
    if (!selectedProduct) return;

    const qty = Number.parseInt(newGlobalStock);
    if (isNaN(qty) || qty < 0) {
      Alert.alert("Error", "Please enter a valid stock quantity.");
      return;
    }

    try {
      // ✅ Send request to backend
      await axios.put(
        `${getBaseUrl()}/api/products/${selectedProduct.id}/stock`,
        {
          stock: qty,
        }
      );

      // ✅ Update products list locally
      const updatedProducts = products.map((product) => {
        if (product.id === selectedProduct.id) {
          return {
            ...product,
            stock: qty,
          };
        }
        return product;
      });

      setProducts(updatedProducts);

      // ✅ Update selected product to force re-render
      const updatedProduct = updatedProducts.find(
        (p) => p.id === selectedProduct.id
      );
      if (updatedProduct) {
        setSelectedProduct(updatedProduct);
      }

      setEditingGlobalStock(false);
      Alert.alert("Success", "Stock updated successfully.");
    } catch (error) {
      console.error("Failed to update stock", error);
      Alert.alert("Error", "Failed to update stock. Please try again.");
    }
  };

  // Function to confirm product deletion
  const confirmDeleteProduct = (productId: string) => {
    setProductToDelete(productId);
    setDeleteConfirmModal(true);
  };

  // Function to delete a product
  const deleteProduct = async () => {
    if (!productToDelete) return;




    try {
      await axios.delete(`${getBaseUrl()}/api/products/${productToDelete}`).then(() => {
        setProducts(products.filter((product) => product.id !== productToDelete));
        setDeleteConfirmModal(false);
        setProductToDelete(null);
      });
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
  };

  // Function to navigate to add product screen
  const navigateToAddProduct = () => {
    router.push(`/stock/add-product`);
  };

  // Function to navigate to edit product screen
  const navigateToEditProduct = (product: Product) => {
    router.push(`/stock/edit-product/${product.id}`);
  };

  // Render each product item
  const renderProductItem = ({ item }: { item: Product }) => {
    const totalStock = getTotalStock(item);

    return (
      <View style={styles.productItem}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Icon name="image" size={24} color="#ccc" />
              </View>
            )}
            <View style={styles.productDetails}>
              <Text style={styles.productName}>{item.name}</Text>
              <View style={styles.productMeta}>
                <View style={styles.productCategory}>
                  <Text>{item.category}</Text>
                </View>
                <View>
                  <Text style={styles.productBrand}>{item.brand.name}</Text>
                </View>
              </View>
              <Text style={styles.productPrice}>
                DT {item.price.toFixed(3)}
              </Text>
            </View>
          </View>
          <View style={styles.stockInfo}>
            <Text style={styles.stockLabel}>Total Stock</Text>
            <Text
              style={[
                styles.stockQty,
                totalStock === 0 && styles.stockOut,
                totalStock > 0 && totalStock <= 10 && styles.stockLow,
              ]}
            >
              {totalStock}
            </Text>
            <TouchableOpacity
              style={styles.stockUpdateButton}
              onPress={() => openVariantStockModal(item)}
            >
              <Icon name="edit-2" size={14} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {item.options.length > 0 && (
          <View style={styles.optionsContainer}>
            {item.options.map((option) => (
              <View key={option.optionId} style={styles.optionItem}>
                <Text style={styles.optionName}>{option.optionName}:</Text>
                <View style={styles.optionValues}>
                  {option.values.map((value, index) => (
                    <View key={index} style={styles.optionValueChip}>
                      <Text style={styles.optionValueText}>{value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigateToEditProduct(item)}
          >
            <Icon name="edit-2" size={18} color="#007AFF" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => confirmDeleteProduct(item.id)}
          >
            <Icon name="trash-2" size={18} color="#FF3B30" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredProducts = getFilteredProducts();
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

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
              placeholder="Search products..."
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
            <Text style={styles.title}>Stock Management</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowSearch(true)}
              >
                <Icon name="search" size={22} color="#007AFF" />
              </TouchableOpacity>
              {/* New button to navigate to deleted products */}
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push("/stock/deleted-products")}
              >
                <Icon name="archive" size={22} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.headerButton, styles.filterButton]}
                onPress={() => setShowFilters(true)}
              >
                <Icon name="filter" size={22} color="#007AFF" />
                {activeFiltersCount > 1 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {activeFiltersCount - 1}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Products list */}
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>
                {searchQuery || activeFiltersCount > 0
                  ? "No products match your search or filters"
                  : "No products in stock"}
              </Text>
              {searchQuery || activeFiltersCount > 0 ? (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={resetFilters}
                >
                  <Text style={styles.emptyButtonText}>Clear Filters</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={navigateToAddProduct}
                >
                  <Text style={styles.emptyButtonText}>
                    Add Your First Product
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Add product button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/stock/add-product/")}
        >
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.filterModal}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filter Products</Text>
                  <TouchableOpacity onPress={() => setShowFilters(false)}>
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.filterContent}>
                  {/* Category Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Category</Text>
                    <View style={styles.filterOptions}>
                      {categories.map((category) => (
                        <TouchableOpacity
                          key={category}
                          style={[
                            styles.filterOption,
                            filters.category === category &&
                            styles.filterOptionSelected,
                          ]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              category:
                                filters.category === category ? null : category,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.category === category &&
                              styles.filterOptionTextSelected,
                            ]}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Brand Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Brand</Text>
                    <View style={styles.filterOptions}>
                      {brands.map((brand) => (
                        <TouchableOpacity
                          key={brand}
                          style={[
                            styles.filterOption,
                            filters.brand === brand &&
                            styles.filterOptionSelected,
                          ]}
                          onPress={() =>
                            setFilters({
                              ...filters,
                              brand: filters.brand === brand ? null : brand,
                            })
                          }
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              filters.brand === brand &&
                              styles.filterOptionTextSelected,
                            ]}
                          >
                            {brand}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Stock Level Filter */}
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Stock Level</Text>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          filters.stockLevel === "low" &&
                          styles.filterOptionSelected,
                        ]}
                        onPress={() =>
                          setFilters({
                            ...filters,
                            stockLevel:
                              filters.stockLevel === "low" ? null : "low",
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            filters.stockLevel === "low" &&
                            styles.filterOptionTextSelected,
                          ]}
                        >
                          Low Stock (≤ 10)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          filters.stockLevel === "out" &&
                          styles.filterOptionSelected,
                        ]}
                        onPress={() =>
                          setFilters({
                            ...filters,
                            stockLevel:
                              filters.stockLevel === "out" ? null : "out",
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            filters.stockLevel === "out" &&
                            styles.filterOptionTextSelected,
                          ]}
                        >
                          Out of Stock
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Product Options Filter */}
                  {optionFilters.map((option) => (
                    <View key={option.id} style={styles.filterSection}>
                      <Text style={styles.filterSectionTitle}>
                        {option.name}
                      </Text>
                      <View style={styles.filterOptions}>
                        {option.values.map((value) => {
                          const isSelected = filters.productOptions.some(
                            (opt) =>
                              opt.optionName === option.name &&
                              opt.value === value.value
                          );
                          return (
                            <TouchableOpacity
                              key={value.id}
                              style={[
                                styles.filterOption,
                                isSelected && styles.filterOptionSelected,
                              ]}
                              onPress={() => {
                                const optionObj = {
                                  optionName: option.name,
                                  value: value.value,
                                };

                                const isSelected = filters.productOptions.some(
                                  (opt) =>
                                    opt.optionName === option.name &&
                                    opt.value === value.value
                                );

                                const updatedValues = isSelected
                                  ? filters.productOptions.filter(
                                    (opt) =>
                                      !(
                                        opt.optionName === option.name &&
                                        opt.value === value.value
                                      )
                                  )
                                  : [...filters.productOptions, optionObj];

                                setFilters({
                                  ...filters,
                                  productOptions: updatedValues,
                                });
                              }}
                            >
                              <Text
                                style={[
                                  styles.filterOptionText,
                                  isSelected && styles.filterOptionTextSelected,
                                ]}
                              >
                                {value.value}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={styles.filterResetButton}
                    onPress={resetFilters}
                  >
                    <Text style={styles.filterResetText}>Reset Filters</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.filterApplyButton}
                    onPress={() => setShowFilters(false)}
                  >
                    <Text style={styles.filterApplyText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Variant Stock Modal */}
      <Modal
        visible={variantStockModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setVariantStockModal(false);
          setSelectedProduct(null);
          setEditingVariant(null);
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            setVariantStockModal(false);
            setSelectedProduct(null);
            setEditingVariant(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.variantStockModal}>
                <View style={styles.variantStockHeader}>
                  <Text style={styles.variantStockTitle}>
                    Manage Variant Stock
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setVariantStockModal(false);
                      setSelectedProduct(null);
                      setEditingVariant(null);
                    }}
                  >
                    <Icon name="x" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {selectedProduct && (
                  <>
                    <Text style={styles.variantStockProductName}>
                      {selectedProduct.name}
                    </Text>
                    <Text style={styles.variantStockTotalLabel}>
                      Total Stock:{" "}
                      <Text style={styles.variantStockTotal}>
                        {getTotalStock(selectedProduct)}
                      </Text>
                    </Text>

                    {selectedProduct.variants &&
                      selectedProduct.variants.length > 0 ? (
                      // Variant-based stock management
                      <ScrollView style={styles.variantList}>
                        {selectedProduct.variants.map((variant) => (
                          <View key={variant.id} style={styles.variantItem}>
                            {editingVariant?.id === variant.id ? (
                              // Editing mode
                              <View style={styles.variantEditContainer}>
                                <Text style={styles.variantName}>
                                  {variant.sku}
                                </Text>
                                <View style={styles.variantEditControls}>
                                  <TextInput
                                    style={styles.variantStockInput}
                                    value={newStockQty}
                                    onChangeText={setNewStockQty}
                                    keyboardType="number-pad"
                                    autoFocus
                                  />
                                  <View style={styles.variantEditButtons}>
                                    <TouchableOpacity
                                      style={styles.variantCancelButton}
                                      onPress={() => setEditingVariant(null)}
                                    >
                                      <Icon name="x" size={16} color="#666" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.variantSaveButton}
                                      onPress={updateVariantStock}
                                    >
                                      <Icon
                                        name="check"
                                        size={16}
                                        color="#fff"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            ) : (
                              // Display mode
                              <View style={styles.variantDisplayContainer}>
                                <Text style={styles.variantName}>
                                  {variant.sku}
                                </Text>
                                <View style={styles.variantStockContainer}>
                                  <Text
                                    style={[
                                      styles.variantStockQty,
                                      variant.stockQty === 0 && styles.stockOut,
                                      variant.stockQty > 0 &&
                                      variant.stockQty <= 5 &&
                                      styles.stockLow,
                                    ]}
                                  >
                                    {variant.stockQty}
                                  </Text>
                                  <TouchableOpacity
                                    style={styles.variantEditButton}
                                    onPress={() =>
                                      openStockUpdateModal(variant)
                                    }
                                  >
                                    <Icon
                                      name="edit-2"
                                      size={16}
                                      color="#007AFF"
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </ScrollView>
                    ) : (
                      // Global stock management
                      <View style={styles.globalStockContainer}>
                        <Text style={styles.globalStockLabel}>
                          Product Stock
                        </Text>
                        {editingGlobalStock ? (
                          <View style={styles.globalStockEditContainer}>
                            <TextInput
                              style={styles.globalStockInput}
                              value={newGlobalStock}
                              onChangeText={setNewGlobalStock}
                              keyboardType="number-pad"
                              autoFocus
                            />
                            <View style={styles.variantEditButtons}>
                              <TouchableOpacity
                                style={styles.variantCancelButton}
                                onPress={() => setEditingGlobalStock(false)}
                              >
                                <Icon name="x" size={16} color="#666" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.variantSaveButton}
                                onPress={updateGlobalStock}
                              >
                                <Icon name="check" size={16} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.globalStockDisplayContainer}>
                            <Text
                              style={[
                                styles.globalStockQty,
                                (selectedProduct.stock || 0) === 0 &&
                                styles.stockOut,
                                (selectedProduct.stock || 0) > 0 &&
                                (selectedProduct.stock || 0) <= 10 &&
                                styles.stockLow,
                              ]}
                            >
                              {selectedProduct.stock || 0}
                            </Text>
                            <TouchableOpacity
                              style={styles.variantEditButton}
                              onPress={() => {
                                setEditingGlobalStock(true);
                                setNewGlobalStock(
                                  (selectedProduct.stock || 0).toString()
                                );
                              }}
                            >
                              <Icon name="edit-2" size={16} color="#007AFF" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.variantStockCloseButton}
                      onPress={() => {
                        setVariantStockModal(false);
                        setSelectedProduct(null);
                        setEditingVariant(null);
                        setEditingGlobalStock(false);
                      }}
                    >
                      <Text style={styles.variantStockCloseText}>Close</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDeleteConfirmModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModal}>
                <Icon
                  name="alert-triangle"
                  size={40}
                  color="#FF3B30"
                  style={styles.deleteIcon}
                />
                <Text style={styles.deleteTitle}>Delete Product</Text>
                <Text style={styles.deleteMessage}>
                  Are you sure you want to delete this product? This action
                  cannot be undone.
                </Text>
                <View style={styles.deleteActions}>
                  <TouchableOpacity
                    style={styles.deleteCancelButton}
                    onPress={() => setDeleteConfirmModal(false)}
                  >
                    <Text style={styles.deleteCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteConfirmButton}
                    onPress={deleteProduct}
                  >
                    <Text style={styles.deleteConfirmText}>Delete</Text>
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
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // Extra padding for the FAB
  },
  productItem: {
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
  productHeader: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productInfo: {
    flexDirection: "row",
    flex: 1,
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
  productDetails: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: "column",
    marginBottom: 4,
  },

  productCategory: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start", // ✅ makes the width fit the content
  },
  productBrand: {
    fontSize: 14,
    color: "#666",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  stockInfo: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
    position: "relative",
  },
  stockLabel: {
    fontSize: 12,
    color: "#666",
  },
  stockQty: {
    fontSize: 18,
    fontWeight: "bold",
  },
  stockLow: {
    color: "#FF9500", // Orange for low stock
  },
  stockOut: {
    color: "#FF3B30", // Red for out of stock
  },
  stockUpdateButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  optionsContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 0,
  },
  optionItem: {
    marginBottom: 8,
  },
  optionName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  optionValues: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionValueChip: {
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  optionValueText: {
    fontSize: 12,
  },
  productActions: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
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
  // Variant stock modal styles
  variantStockModal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    padding: 0,
  },
  variantStockHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  variantStockTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  variantStockProductName: {
    fontSize: 16,
    fontWeight: "500",
    padding: 16,
    paddingBottom: 0,
  },
  variantStockTotalLabel: {
    fontSize: 14,
    color: "#666",
    padding: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  variantStockTotal: {
    fontWeight: "bold",
  },
  variantList: {
    maxHeight: 300,
    padding: 16,
    paddingTop: 0,
  },
  variantItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingVertical: 12,
  },
  variantDisplayContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variantEditContainer: {
    marginBottom: 8,
  },
  variantName: {
    fontSize: 14,
    flex: 1,
  },
  variantStockContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  variantStockQty: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  variantEditButton: {
    padding: 4,
  },
  variantEditControls: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  variantStockInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 8,
    marginRight: 8,
  },
  variantEditButtons: {
    flexDirection: "row",
  },
  variantCancelButton: {
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  variantSaveButton: {
    backgroundColor: "#007AFF",
    padding: 8,
    borderRadius: 4,
  },
  variantStockCloseButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    margin: 16,
  },
  variantStockCloseText: {
    color: "#666",
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
  globalStockContainer: {
    padding: 16,
    alignItems: "center",
  },
  globalStockLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 16,
    color: "#333",
  },
  globalStockDisplayContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  globalStockQty: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 12,
  },
  globalStockEditContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  globalStockInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    fontSize: 18,
    textAlign: "center",
    width: 100,
    marginRight: 12,
  },
});

export default StockScreen;
