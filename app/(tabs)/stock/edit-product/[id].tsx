"use client";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useState, useEffect, useLayoutEffect } from "react";
import { getBaseUrl } from "@/utils/api";
import axios from "axios";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import Icon from "react-native-vector-icons/Feather";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

// Type definitions
interface OptionValue {
  id: string;
  value: string;
  selected: boolean;
}

interface Option {
  id: string;
  name: string;
  track_stock: boolean;
  values: OptionValue[];
}

interface Brand {
  id: string;
  name: string;
  image: string | null;
}

interface ProductOption {
  optionId: string;
  optionName: string;
  values: string[];
}

interface Category {
  id: string;
  name: string;
}

interface ProductVariant {
  id: string;
  optionValues: { [optionId: string]: string };
  stockQty: number;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  category: string;
  brand: {
    id: string;
    name: string;
  } | null;
  price: number;
  stock?: number;
  trackStock?: boolean;
  options: ProductOption[];
  variants: ProductVariant[];
}

const EditProductScreen = () => {
  useProtectedRoute();
  const router = useRouter();
  const navigation = useNavigation();

  // State for form fields - Initialize with existing product data
  const [productName, setProductName] = useState("");
  const [productImage, setProductImage] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [price, setPrice] = useState("");
  const [globalStock, setGlobalStock] = useState("0");
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showOptionSelector, setShowOptionSelector] = useState(false);
  const [currentOption, setCurrentOption] = useState<Option | null>(null);

  // State for variants - Initialize with existing variants
  const [showVariantManager, setShowVariantManager] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantStockQty, setVariantStockQty] = useState("");

  // Available data
  const [availableCategories, setAvailableCategories] = useState<Category[]>(
    []
  );
  const [availableOptions, setAvailableOptions] = useState<Option[]>([]);
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Selected options - Initialize with existing options
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);

  // Hide tab bar
  const nav = useNavigation();

  useLayoutEffect(() => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });

    return () => {
      nav.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [nav]);

  // Fetch available data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${getBaseUrl()}/api/add-product-data`);
      setAvailableCategories(res.data.categories);
      setAvailableBrands(res.data.brands);
      setAvailableOptions(res.data.productOptions);
    } catch (error) {
      console.error("Failed to load form data:", error);
      Alert.alert("Error", "Failed to load form data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get the product to edit from route params
  const { id } = useLocalSearchParams<{ id: string }>();

  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const fetchProduct = async () => {
    setIsLoading(true);
    try {
      // In a real app, you would fetch from your API
      const res = await axios.get(`${getBaseUrl()}/api/products/${id}`);
      setProductToEdit(res.data);
    } catch (error) {
      console.error("Failed to load sale:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  useEffect(() => {
    if (productToEdit) {
      setProductName(productToEdit.name || "");
      setProductImage(productToEdit.image || null);
      // Handle category - API returns string, but we need object
      if (typeof productToEdit.category === "string") {
        // We'll set this in the separate useEffect when categories are loaded
      } else if (
        productToEdit.category &&
        typeof productToEdit.category === "object"
      ) {
        setCategory({
          id: productToEdit.category.id,
          name: productToEdit.category.name,
        });
      }
      setSelectedBrand(
        productToEdit.brand
          ? {
            id: productToEdit.brand.id,
            name: productToEdit.brand.name,
            image: null,
          }
          : null
      );
      setPrice(productToEdit.price?.toString() || "");
      setGlobalStock(productToEdit.stock?.toString() || "0");
      // Set variants directly from API response
      setVariants(productToEdit.variants || []);
    }
  }, [productToEdit]);

  // Initialize selected options when available options are loaded
  useEffect(() => {
    console.log(availableOptions);
    console.log(productToEdit?.options);
    console.log("product to edit", JSON.stringify(productToEdit, null, 2));
    if (availableOptions.length > 0 && productToEdit?.options) {
      const initialSelectedOptions: Option[] = [];

      productToEdit.options.forEach((productOption) => {
        const matchingOption = availableOptions.find(
          (option) => option.id == productOption.optionId
        );

        if (matchingOption) {
          const optionCopy = {
            ...matchingOption,
            values: matchingOption.values?.map((value) => ({
              ...value,
              selected: productOption.values.includes(value.value),
            })),
          };

          initialSelectedOptions.push(optionCopy);
        }
      });

      setSelectedOptions(initialSelectedOptions);
    }
  }, [availableOptions, productToEdit?.options]);

  // Set category when available categories are loaded
  useEffect(() => {
    if (availableCategories.length > 0 && productToEdit?.category) {
      // Handle case where category is a string (from API)
      const categoryId =
        typeof productToEdit.category === "string"
          ? productToEdit.category
          : productToEdit.category.id;

      const matchingCategory = availableCategories.find(
        (cat) => cat.id === categoryId
      );
      if (matchingCategory) {
        setCategory(matchingCategory);
      }
    }
  }, [availableCategories, productToEdit?.category]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Please grant media library permission to select an image."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProductImage(result.assets[0].uri);
    }
  };

  const toggleOptionSelection = (option: Option) => {
    const isSelected = selectedOptions.some(
      (selectedOption) => selectedOption.id === option.id
    );

    if (isSelected) {
      setSelectedOptions(
        selectedOptions.filter(
          (selectedOption) => selectedOption.id !== option.id
        )
      );
      regenerateVariants(
        selectedOptions.filter(
          (selectedOption) => selectedOption.id !== option.id
        )
      );
    } else {
      const newSelectedOptions = [
        ...selectedOptions,
        {
          ...option,
          values: option.values.map((v) => ({ ...v, selected: false })),
        },
      ];
      setSelectedOptions(newSelectedOptions);
      regenerateVariants(newSelectedOptions);
    }
  };

  const openOptionValueSelector = (option: Option) => {
    setCurrentOption(option);
    setShowOptionSelector(true);
  };

  const toggleValueSelection = (valueId: string) => {
    if (!currentOption) return;

    const updatedOption = {
      ...currentOption,
      values: currentOption.values.map((value) =>
        value.id === valueId ? { ...value, selected: !value.selected } : value
      ),
    };

    setCurrentOption(updatedOption);
  };

  const saveOptionValues = () => {
    if (!currentOption) return;

    const updatedOptions = selectedOptions.map((option) =>
      option.id === currentOption.id ? currentOption : option
    );

    setSelectedOptions(updatedOptions);
    setShowOptionSelector(false);
    regenerateVariants(updatedOptions);
    setCurrentOption(null);
  };

  const regenerateVariants = (options: Option[]) => {
    const validOptions = options.filter(
      (option) =>
        option.track_stock && option.values.some((value) => value.selected)
    );

    if (validOptions.length === 0) {
      setVariants([]);
      return;
    }

    const optionValues = validOptions.map((option) => ({
      optionId: option.id,
      values: option.values.filter((v) => v.selected).map((v) => v.value),
    }));

    const generateCombinations = (
      index = 0,
      current: { [key: string]: string } = {}
    ) => {
      if (index >= optionValues.length) {
        return [current];
      }

      const option = optionValues[index];
      const combinations: { [key: string]: string }[] = [];

      option.values.forEach((value) => {
        const newCombination = { ...current, [option.optionId]: value };
        combinations.push(...generateCombinations(index + 1, newCombination));
      });

      return combinations;
    };

    const combinations = generateCombinations();

    const newVariants = combinations.map((combination) => {
      // Try to find an existing variant with the same combination
      const existingVariant = variants.find((variant) => {
        const keys = Object.keys(combination);
        return keys.every(
          (key) => variant.optionValues[key] === combination[key]
        );
      });

      return {
        id:
          existingVariant?.id ||
          Date.now().toString() + Math.random().toString(36).substr(2, 5),
        optionValues: combination,
        stockQty: existingVariant?.stockQty || 0,
      };
    });

    setVariants(newVariants);
  };

  const formatVariantName = (variant: ProductVariant) => {
    return Object.keys(variant.optionValues)
      .map((optionId) => {
        const option = selectedOptions.find((opt) => opt.id == optionId);
        return `${option?.name}: ${variant.optionValues[optionId]}`;
      })
      .join(", ");
  };

  const updateVariantStock = () => {
    if (!editingVariantId) return;

    const qty = Number.parseInt(variantStockQty);
    if (isNaN(qty) || qty < 0) {
      Alert.alert("Error", "Please enter a valid stock quantity.");
      return;
    }

    setVariants(
      variants.map((variant) =>
        variant.id === editingVariantId
          ? { ...variant, stockQty: qty }
          : variant
      )
    );

    setEditingVariantId(null);
    setVariantStockQty("");
  };

  const getTotalStock = () => {
    return variants.reduce((total, variant) => total + variant.stockQty, 0);
  };

  const needsVariantManagement = () => {
    return (
      selectedOptions.length > 0 &&
      selectedOptions.some((option) => option.track_stock)
    );
  };

  const updateProduct = async () => {
    // Validate form (keep all your existing validation code)
    if (!productName.trim()) {
      Alert.alert("Error", "Please enter a product name.");
      return;
    }

    if (!category) {
      Alert.alert("Error", "Please select a category.");
      return;
    }

    if (!selectedBrand) {
      Alert.alert("Error", "Please select a brand.");
      return;
    }

    if (
      !price ||
      isNaN(Number.parseFloat(price)) ||
      Number.parseFloat(price) <= 0
    ) {
      Alert.alert("Error", "Please enter a valid price.");
      return;
    }

    if (!needsVariantManagement()) {
      const stockQty = Number.parseInt(globalStock);
      if (isNaN(stockQty) || stockQty < 0) {
        Alert.alert("Error", "Please enter a valid stock quantity.");
        return;
      }
    }

    const optionWithNoValues = selectedOptions.find(
      (option) => !option.values.some((value) => value.selected)
    );
    if (optionWithNoValues) {
      Alert.alert(
        "Error",
        `Please select at least one value for ${optionWithNoValues.name}.`
      );
      return;
    }

    // Format data
    const options = selectedOptions.map((option) => ({
      optionId: option.id,
      optionName: option.name,
      values: option.values
        .filter((value) => value.selected)
        .map((value) => value.value),
    }));

    const formattedVariants = selectedOptions.some(
      (option) => option.track_stock
    )
      ? variants.map((variant) => ({
        stockQty: variant.stockQty,
        optionValues: variant.optionValues,
      }))
      : [];

    // Create FormData
    const formData = new FormData();
    formData.append("_method", "PUT");

    // Append basic fields
    formData.append("name", productName.trim());
    formData.append("categoryId", category.id);
    formData.append("brandId", selectedBrand.id);
    formData.append("price", Number.parseFloat(price).toString());
    formData.append(
      "stock",
      (needsVariantManagement() ? 0 : Number.parseInt(globalStock)).toString()
    );

    // Append options array
    options.forEach((option, index) => {
      formData.append(`options[${index}][optionId]`, option.optionId);
      formData.append(`options[${index}][optionName]`, option.optionName);
      option.values.forEach((value, valueIndex) => {
        formData.append(`options[${index}][values][${valueIndex}]`, value);
      });
    });

    // Append variants array
    formattedVariants.forEach((variant, index) => {
      formData.append(
        `variants[${index}][stockQty]`,
        variant.stockQty.toString()
      );
      Object.entries(variant.optionValues).forEach(([key, value]) => {
        formData.append(`variants[${index}][optionValues][${key}]`, value);
      });
    });

    if (productImage) {
      let filename = `product_${Date.now()}.jpg`;
      let type = "image/jpeg";

      // Handle different image types
      if (productImage.startsWith("data:image")) {
        const format = productImage.split(";")[0].split("/")[1];
        filename = `product_${Date.now()}.${format}`;
        type = `image/${format}`;
      } else if (productImage.startsWith("file://")) {
        filename = productImage.split("/").pop() || filename;
        const ext = filename.split(".").pop();
        type = `image/${ext}`;
      }

      formData.append("image", {
        uri: productImage,
        name: filename,
        type,
      } as any);
    }

    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        transformRequest: () => {
          return formData;
        },
      };
      const response = await axios.post(
        `${getBaseUrl()}/api/products/${productToEdit?.id}`,
        formData,
        config
      );

      console.log("Success:", response.data);

      Alert.alert("Product Updated", "Product has been updated successfully.", [
        {
          text: "OK",
          onPress: () => router.push("/stock"),
        },
      ]);
    } catch (error: any) {
      console.error("Request failed:", error);

      if (error.response) {
        // Server responded with error status
        console.log("API error:", error.response.data);
        Alert.alert(
          "Error",
          error.response.data.message || "Failed to update product."
        );
      } else if (error.request) {
        // Request was made but no response received
        Alert.alert(
          "Error",
          "No response from server. Please check your connection."
        );
      } else {
        // Something else happened
        Alert.alert("Error", "An unexpected error occurred.");
      }
    }
  };

  const handleGoBack = () => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "flex" },
    });
    router.push("/stock");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Icon name="arrow-left" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Product</Text>
          <TouchableOpacity style={styles.saveButton} onPress={updateProduct}>
            <Text style={styles.saveButtonText}>Update</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Product Image */}
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {productImage ? (
              <Image
                source={{ uri: productImage }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="image" size={40} color="#ccc" />
                <Text style={styles.imagePlaceholderText}>
                  Tap to add image
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Product Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Nom du produit</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="Enter product name"
            />
          </View>

          {/* Category Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Catégorie</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowCategorySelector(!showCategorySelector)}
            >
              <Text
                style={
                  category ? styles.selectorText : styles.selectorPlaceholder
                }
              >
                {category ? category.name : "Select a category"}
              </Text>
              <Icon
                name={showCategorySelector ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showCategorySelector && (
              <View style={styles.selectorDropdown}>
                <ScrollView nestedScrollEnabled={true}>
                  {availableCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.selectorItem,
                        category?.id === cat.id && styles.selectorItemSelected,
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategorySelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.selectorItemText,
                          category?.id === cat.id &&
                          styles.selectorItemTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {category?.id === cat.id && (
                        <Icon name="check" size={18} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Brand Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Marque</Text>
            <TouchableOpacity
              style={styles.selectorButton}
              onPress={() => setShowBrandSelector(!showBrandSelector)}
            >
              <Text
                style={
                  selectedBrand
                    ? styles.selectorText
                    : styles.selectorPlaceholder
                }
              >
                {selectedBrand ? selectedBrand.name : "Select a brand"}
              </Text>
              <Icon
                name={showBrandSelector ? "chevron-up" : "chevron-down"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showBrandSelector && (
              <View style={styles.selectorDropdown}>
                {availableBrands.map((brand) => (
                  <TouchableOpacity
                    key={brand.id}
                    style={[
                      styles.selectorItem,
                      selectedBrand?.id === brand.id &&
                      styles.selectorItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedBrand(brand);
                      setShowBrandSelector(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectorItemText,
                        selectedBrand?.id === brand.id &&
                        styles.selectorItemTextSelected,
                      ]}
                    >
                      {brand.name}
                    </Text>
                    {selectedBrand?.id === brand.id && (
                      <Icon name="check" size={18} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Coût de revien</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
          </View>

          {/* Global Stock - Show when no variant management needed */}
          {!needsVariantManagement() && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Quantité du stock</Text>
              <TextInput
                style={styles.input}
                value={globalStock}
                onChangeText={setGlobalStock}
                placeholder="0"
                keyboardType="number-pad"
              />
            </View>
          )}

          {/* Product Options */}
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionTitle}>Options du produit</Text>
            <Text style={styles.sectionSubtitle}>
              Sélectionnez les options et leurs valeurs pour ce produit
            </Text>


            {availableOptions.map((option) => (
              <View key={option.id} style={styles.optionRow}>
                <View style={styles.optionCheckbox}>
                  <Switch
                    value={selectedOptions.some(
                      (selectedOption) => selectedOption.id === option.id
                    )}
                    onValueChange={() => toggleOptionSelection(option)}
                    trackColor={{ false: "#e0e0e0", true: "#b3d9ff" }}
                    thumbColor={
                      selectedOptions.some(
                        (selectedOption) => selectedOption.id === option.id
                      )
                        ? "#007AFF"
                        : "#f4f3f4"
                    }
                  />
                </View>
                <View style={styles.optionInfo}>
                  <View style={styles.optionNameContainer}>
                    <Text style={styles.optionName}>{option.name}</Text>
                    <View
                      style={[
                        styles.trackStockBadge,
                        option.track_stock ? styles.tracked : styles.notTracked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.trackStockBadgeText,
                          option.track_stock
                            ? styles.trackedText
                            : styles.notTrackedText,
                        ]}
                      >
                        {/* {option.track_stock ? "Stock Tracked" : "Not Tracked"} */}
                      </Text>
                    </View>
                  </View>
                  {selectedOptions.some(
                    (selectedOption) => selectedOption.id === option.id
                  ) && (
                      <TouchableOpacity
                        style={styles.optionValuesButton}
                        onPress={() => {
                          const selectedOption = selectedOptions.find(
                            (o) => o.id === option.id
                          );
                          if (selectedOption) {
                            openOptionValueSelector(selectedOption);
                          }
                        }}
                      >
                        <Text style={styles.optionValuesText}>
                          {selectedOptions
                            .find((o) => o.id === option.id)
                            ?.values.filter((v) => v.selected)
                            .map((v) => v.value)
                            .join(", ") || "Select values"}
                        </Text>
                        <Icon name="chevron-right" size={18} color="#007AFF" />
                      </TouchableOpacity>
                    )}
                </View>
              </View>
            ))}
          </View>

          {/* Variants and Stock Management */}
          {selectedOptions.length > 0 &&
            selectedOptions.some((option) => option.track_stock) &&
            selectedOptions
              .filter((option) => option.track_stock)
              .every((option) =>
                option.values.some((value) => value.selected)
              ) && (
              <View style={styles.variantsContainer}>
                <View style={styles.variantHeader}>
                  <Text style={styles.sectionTitle}>Product Variants</Text>
                  <Text style={styles.variantCount}>
                    Total Stock:{" "}
                    <Text style={styles.variantCountValue}>
                      {getTotalStock()}
                    </Text>
                  </Text>
                </View>

                <Text style={styles.sectionSubtitle}>
                  Manage stock quantities for each product variant (only for
                  stock-tracked options)
                </Text>

                <TouchableOpacity
                  style={styles.manageVariantsButton}
                  onPress={() => setShowVariantManager(true)}
                >
                  <Icon
                    name="layers"
                    size={16}
                    color="#fff"
                    style={styles.variantButtonIcon}
                  />
                  <Text style={styles.manageVariantsButtonText}>
                    Manage Variant Stock
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Option Values Selector Modal */}
      {showOptionSelector && currentOption && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {currentOption.name} Values
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowOptionSelector(false)}
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {currentOption.values.map((value) => (
                <TouchableOpacity
                  key={value.id}
                  style={[
                    styles.valueItem,
                    value.selected && styles.valueItemSelected,
                  ]}
                  onPress={() => toggleValueSelection(value.id)}
                >
                  <Text
                    style={[
                      styles.valueItemText,
                      value.selected && styles.valueItemTextSelected,
                    ]}
                  >
                    {value.value}
                  </Text>
                  {value.selected && (
                    <Icon name="check" size={18} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowOptionSelector(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveOptionValues}
              >
                <Text style={styles.modalSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Variant Manager Modal */}
      <Modal
        visible={showVariantManager}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowVariantManager(false);
          setEditingVariantId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.variantManagerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Variant Stock</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowVariantManager(false);
                  setEditingVariantId(null);
                }}
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.variantManagerSubtitle}>
              Set stock quantities for each product variant
            </Text>

            <FlatList
              data={variants}
              keyExtractor={(item) => item.id}
              style={styles.variantList}
              renderItem={({ item }) => (
                <View style={styles.variantItem}>
                  <Text style={styles.variantName}>
                    {formatVariantName(item)}
                  </Text>

                  {editingVariantId === item.id ? (
                    <View style={styles.variantStockEditContainer}>
                      <TextInput
                        style={styles.variantStockInput}
                        value={variantStockQty}
                        onChangeText={setVariantStockQty}
                        keyboardType="number-pad"
                        autoFocus
                      />
                      <View style={styles.variantStockEditButtons}>
                        <TouchableOpacity
                          style={styles.variantStockCancelButton}
                          onPress={() => setEditingVariantId(null)}
                        >
                          <Icon name="x" size={16} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.variantStockSaveButton}
                          onPress={updateVariantStock}
                        >
                          <Icon name="check" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.variantStockContainer}>
                      <Text style={styles.variantStockQty}>
                        {item.stockQty}
                      </Text>
                      <TouchableOpacity
                        style={styles.variantStockEditButton}
                        onPress={() => {
                          setEditingVariantId(item.id);
                          setVariantStockQty(item.stockQty.toString());
                        }}
                      >
                        <Icon name="edit-2" size={16} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyVariantList}>
                  <Text style={styles.emptyVariantText}>
                    No variants available. Select option values to generate
                    variants.
                  </Text>
                </View>
              }
            />

            <TouchableOpacity
              style={styles.variantManagerDoneButton}
              onPress={() => {
                setShowVariantManager(false);
                setEditingVariantId(null);
              }}
            >
              <Text style={styles.variantManagerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Please wait...</Text>
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
  scrollContent: {
    padding: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  selectorText: {
    fontSize: 16,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: "#999",
  },
  selectorDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fff",
    maxHeight: 200,
  },
  selectorItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectorItemSelected: {
    backgroundColor: "#f0f7ff",
  },
  selectorItemText: {
    fontSize: 16,
  },
  selectorItemTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  optionCheckbox: {
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionValuesButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
  },
  optionValuesText: {
    fontSize: 14,
    color: "#007AFF",
  },
  variantsContainer: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  variantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  variantCount: {
    fontSize: 14,
    color: "#666",
  },
  variantCountValue: {
    fontWeight: "bold",
    color: "#007AFF",
  },
  manageVariantsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  variantButtonIcon: {
    marginRight: 8,
  },
  manageVariantsButtonText: {
    color: "#fff",
    fontWeight: "600",
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
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 300,
  },
  valueItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  valueItemSelected: {
    backgroundColor: "#f0f7ff",
  },
  valueItemText: {
    fontSize: 16,
  },
  valueItemTextSelected: {
    color: "#007AFF",
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 16,
  },
  modalSaveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  variantManagerModal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  variantManagerSubtitle: {
    fontSize: 14,
    color: "#666",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  variantList: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  variantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  variantName: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  variantStockContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  variantStockQty: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
    minWidth: 30,
    textAlign: "center",
  },
  variantStockEditButton: {
    padding: 4,
  },
  variantStockEditContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  variantStockInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 4,
    width: 60,
    textAlign: "center",
    marginRight: 8,
  },
  variantStockEditButtons: {
    flexDirection: "row",
  },
  variantStockCancelButton: {
    backgroundColor: "#f0f0f0",
    padding: 6,
    borderRadius: 4,
    marginRight: 4,
  },
  variantStockSaveButton: {
    backgroundColor: "#007AFF",
    padding: 6,
    borderRadius: 4,
  },
  emptyVariantList: {
    padding: 16,
    alignItems: "center",
  },
  emptyVariantText: {
    color: "#999",
    textAlign: "center",
  },
  variantManagerDoneButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    alignItems: "center",
    margin: 16,
    borderRadius: 8,
  },
  variantManagerDoneText: {
    color: "#666",
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
  optionNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  trackStockBadge: {
    backgroundColor: "#e8f5e8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  trackStockBadgeText: {
    fontSize: 10,
    color: "#2d5a2d",
    fontWeight: "500",
  },
  tracked: {
    backgroundColor: "#e0f2e9",
  },
  notTracked: {
    backgroundColor: "#fce4e4",
  },
  trackedText: {
    color: "#2d5a2d",
  },
  notTrackedText: {
    color: "#a94442",
  },
});

export default EditProductScreen;
