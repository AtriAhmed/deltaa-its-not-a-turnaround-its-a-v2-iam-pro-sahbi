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
import { useProtectedRoute } from "../../../..//hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

// Category type definition
interface Category {
  id: string;
  name: string;
}

const CategoryScreen = () => {
  useProtectedRoute();
  // State for categories
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };
  useEffect(() => {
    fetchCategories();
  }, []);

  // State for add/edit modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category>({ id: "", name: "" });

  const [errors, setErrors] = useState<string>("");
  // Function to add or update a category
  const saveCategory = async () => {
    if (!currentCategory.name.trim()) {
      setErrors("Category name cannot be empty.");
      return;
    }

    // Check for duplicate name (excluding current category when editing)
    const isDuplicate = categories.some(
      (category) => category.name.toLowerCase() === currentCategory.name.trim().toLowerCase() && (!isEditing || category.id !== currentCategory.id)
    );

    if (isDuplicate) {
      setErrors(`A category with the name "${currentCategory.name.trim()}" already exists.`);
      return;
    }

    if (isEditing) {
      // Update existing category

      const res = await axios.put(`${getBaseUrl()}/api/categories/${currentCategory.id}`, { name: currentCategory.name });
      setCategories((prev) => prev.map((b) => (b.id === currentCategory.id ? res.data : b)));
      Alert.alert("Success", "Category updated successfully!");
    } else {
      const res = await axios.post(`${getBaseUrl()}/api/categories`, { name: currentCategory.name });
      setCategories([...categories, res.data]);
    }

    closeModal();
  };

  // Function to delete a category
  const deleteCategory = async () => {
      if (categoryToDelete !== null) {
        try {
          await axios.delete(`${getBaseUrl()}/api/categories/${categoryToDelete.id}`);
          setCategories(categories.filter((category) => category.id !== categoryToDelete.id));
          Alert.alert("Succès", "Catégorie supprimée avec succès !");
          setDeleteModalVisible(false);
        } catch (error: any) {
          console.error("Erreur lors de la suppression de la catégorie:", error);

          if (error.response && error.response.data?.message) {
            console.log("Suppression impossible", error.response.data.message);
          } else {
            console.log("Erreur", "Une erreur est survenue lors de la suppression.");
          }
        }
      }
  };


  // Function to open modal for adding a new category
  const addCategory = () => {
    setErrors("");
    setIsEditing(false);
    setCurrentCategory({ id: "", name: "" });
    setModalVisible(true);
  };

  // Function to open modal for editing a category
  const editCategory = (category: Category) => {
    setErrors("");
    setIsEditing(true);
    setCurrentCategory({ ...category });
    setModalVisible(true);
  };

  // Function to close modal and reset state
  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setCurrentCategory({ id: "", name: "" });
  };

  // Render each category item
  const renderCategoryItem = ({ item }: { item: Category }) => (
    <View style={styles.categoryItem}>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => editCategory(item)}>
          <Icon name="edit-2" size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setDeleteModalVisible(true);
            setCategoryToDelete(item);
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
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/settings")}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Catégories</Text>
        <View style={styles.placeholder} />
      </View>


      {/* Content */}
      <View style={styles.content}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucune catégorie ajoutée pour le moment</Text>
            </View>
          }
        />

        <TouchableOpacity style={styles.addButton} onPress={addCategory}>
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>


      <ConfirmDeleteModal
        deleteConfirmModal={deleteModalVisible}
        setDeleteConfirmModal={setDeleteModalVisible}
        confirmAction={deleteCategory}
        modalTitle="Supprimer la catégorie"
        modalText={
          <Text>
            Êtes-vous sûr de vouloir supprimer la catégorie <Text style={{ fontWeight: "bold" }}>{categoryToDelete?.name}</Text> ? Cette action est irréversible.
          </Text>
        }
      />


      {/* Add/Edit Category Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={() => !isInputFocused && Keyboard.dismiss()}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? "Modifier la catégorie" : "Ajouter une catégorie"}</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de la catégorie</Text>
                <TextInput
                  style={styles.input}
                  value={currentCategory.name}
                  onChangeText={(text) => setCurrentCategory({ ...currentCategory, name: text })}
                  placeholder="Entrez le nom de la catégorie"
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
              </View>
              {errors && <Text style={styles.error}>{errors}</Text>}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveCategory}>
                  <Text style={styles.saveButtonText}>{isEditing ? "Mettre à jour" : "Enregistrer"}</Text>
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
  categoryItem: {
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
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  categoryName: {
    fontSize: 16,
    fontWeight: "500",
  },
  categoryActions: {
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

export default CategoryScreen;
