import { getBaseUrl } from "@/utils/api";
import axios from "axios";
import { Stack, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

interface Product {
  id: number;
  name: string;
  image: string;
}

export default function DeletedProductsScreen() {
  const [deletedProducts, setDeletedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${getBaseUrl()}/api/products-hidden`);

      setDeletedProducts(res.data);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = deletedProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestoreProduct = async (productId: number) => {
    Alert.alert(
      "Restore Product",
      "Are you sure you want to restore this product?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await axios.patch(
                `${getBaseUrl()}/api/products/${productId}/restore`
              );
              await fetchProducts();
              Alert.alert("Success", "Product restored successfully!");
            } catch (err) {
              Alert.alert("Error", "Failed to restore the product.");
            }
          },
        },
      ]
    );
  };

  const router = useRouter();
  const nav = useNavigation();

  const handleGoBack = () => {
    nav.getParent()?.setOptions({
      tabBarStyle: { display: "flex" },
    });
    router.push("/stock");
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productItem}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <Text style={styles.productName}>{item.name}</Text>
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={() => handleRestoreProduct(item.id)}
      >
        <Icon name="rotate-ccw" size={15} color="#007AFF" />
        <Text style={styles.restoreButtonText}>Restore</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Produits Archivés</Text>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="transparent" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchBar}
        placeholder="Rechercher des produits..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Veuillez patienter...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <Text style={styles.noProductsText}>Aucun produit archivé trouvé.</Text>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
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
  searchBar: {
    marginTop: 25,
    height: 45,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 10,
  },
  productItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#555",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f0ff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  restoreButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  noProductsText: {
    textAlign: "center",
    fontSize: 16,
    color: "#777",
    marginTop: 50,
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
});
