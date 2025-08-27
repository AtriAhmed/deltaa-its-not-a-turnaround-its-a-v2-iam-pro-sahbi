"use client";

import { Stack } from "expo-router";
import { getBaseUrl } from "@/utils/api";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { useRouter } from "expo-router";
import axios from "axios";
import ConfirmDeleteModal from "../../../../components/ConfirmDeleteMoal";
import { useProtectedRoute } from "../../../../hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

// Brand type definition
interface Brand {
  id: string;
  name: string;
}

const BrandScreen = () => {
  useProtectedRoute();
  // State for brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/brands`);
      setBrands(res.data);
    } catch (error) {
      console.error("Failed to load brands:", error);
    }
  };
  useEffect(() => {
    fetchBrands();
  }, []);

  // State for add/edit modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand>({ id: "", name: "" });

  const [errors, setErrors] = useState<string>("");
  // Function to add or update a brand
  const saveBrand = async () => {
    if (!currentBrand.name.trim()) {
      setErrors("Brand name cannot be empty.");
      return;
    }

    // Check for duplicate name (excluding current brand when editing)
    const isDuplicate = brands.some(
      (brand) => brand.name.toLowerCase() === currentBrand.name.trim().toLowerCase() && (!isEditing || brand.id !== currentBrand.id)
    );

    if (isDuplicate) {
      setErrors(`A brand with the name "${currentBrand.name.trim()}" already exists.`);
      return;
    }

    if (isEditing) {
      // Update existing brand

      const res = await axios.put(`${getBaseUrl()}/api/brands/${currentBrand.id}`, { name: currentBrand.name });
      setBrands((prev) => prev.map((b) => (b.id === currentBrand.id ? res.data : b)));
      Alert.alert("Success", "Brand updated successfully!");
    } else {
      const res = await axios.post(`${getBaseUrl()}/api/brands`, { name: currentBrand.name });
      setBrands([...brands, res.data]);
    }

    closeModal();
  };

  // Function to delete a brand
  const deleteBrand = async () => {
    if (brandToDelete !== null) {
      try {
        await axios.delete(`${getBaseUrl()}/api/brands/${brandToDelete.id}`);
        setBrands(brands.filter((brand) => brand.id !== brandToDelete.id));
        Alert.alert("Succès", "Marque supprimée avec succès !");
        setDeleteModalVisible(false);
      } catch (error: any) {
        console.error("Erreur lors de la suppression de la marque:", error);

        if (error.response && error.response.data?.message) {
          Alert.alert("Suppression impossible", error.response.data.message);
        } else {
          Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
        }
      }
    }
  };


  // Function to open modal for adding a new brand
  const addBrand = () => {
    setErrors("");
    setIsEditing(false);
    setCurrentBrand({ id: "", name: "" });
    setModalVisible(true);
  };

  // Function to open modal for editing a brand
  const editBrand = (brand: Brand) => {
    setErrors("");
    setIsEditing(true);
    setCurrentBrand({ ...brand });
    setModalVisible(true);
  };

  // Function to close modal and reset state
  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setCurrentBrand({ id: "", name: "" });
  };

  // Render each brand item
  const renderBrandItem = ({ item }: { item: Brand }) => (
    <View style={styles.brandItem}>
      <View style={styles.brandInfo}>
        <Text style={styles.brandName}>{item.name}</Text>
      </View>
      <View style={styles.brandActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => editBrand(item)}>
          <Icon name="edit-2" size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setDeleteModalVisible(true);
            setBrandToDelete(item);
          }}
        >
          <Icon name="trash-2" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );
  const router = useRouter();
  const [isInputFocused, setIsInputFocused] = useState(false);
  return (
    <SafeAreaView style={styles.container}>
      {/* Écran sans header natif (pour un design personnalisé) */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/settings")}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Brands</Text>
        <View style={styles.placeholder} /> {/* Espace vide pour équilibrer la mise en page */}
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Liste des marques */}
        <FlatList
          data={brands} // données des marques
          renderItem={renderBrandItem} // fonction pour afficher chaque élément
          keyExtractor={(item) => item.id} // clé unique pour chaque item
          contentContainerStyle={styles.listContent} // style de la liste
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>No brands added yet</Text>
            </View>
          }
        />

        {/* Bouton pour ajouter une nouvelle marque */}
        <TouchableOpacity style={styles.addButton} onPress={addBrand}>
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Modal de confirmation de suppression */}
      <ConfirmDeleteModal
        deleteConfirmModal={deleteModalVisible} // état visibilité modal
        setDeleteConfirmModal={setDeleteModalVisible} // fonction pour changer la visibilité
        confirmAction={deleteBrand} // fonction appelée à la confirmation
        modalTitle="Delete Brand"
        modalText={
          <Text>
            Are you sure you want to delete <Text style={{ fontWeight: "bold" }}>{brandToDelete?.name}</Text> Brand? This action cannot be undone.
          </Text>
        }
      />

      {/* Modal pour ajouter ou modifier une marque */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={() => !isInputFocused && Keyboard.dismiss()}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit Brand" : "Add Brand"}</Text>

              {/* Input nom de la marque */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Brand Name</Text>
                <TextInput
                  style={styles.input}
                  value={currentBrand.name}
                  onChangeText={(text) => setCurrentBrand({ ...currentBrand, name: text })}
                  placeholder="Enter brand name"
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
              </View>
              {errors && <Text style={styles.error}>{errors}</Text>}

              {/* Boutons Annuler / Sauvegarder */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveBrand}>
                  <Text style={styles.saveButtonText}>{isEditing ? "Update" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  placeholder: {
    width: 32, // To balance the header
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  brandItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  brandInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  brandName: {
    fontSize: 16,
    fontWeight: "500",
  },
  brandActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
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
    padding: 24,
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },

  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f2f2f2",
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "red",
    marginTop: -18,
    marginBottom: 18,
    marginLeft: 8,
  },
});

export default BrandScreen;
