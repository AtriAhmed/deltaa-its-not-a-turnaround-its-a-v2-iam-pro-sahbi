"use client";

import { Stack, useLocalSearchParams } from "expo-router";
import { getBaseUrl } from "@/utils/api";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/Feather";
import axios from "axios";
import { useProtectedRoute } from "../../../../hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

interface ProductOption {
  id: string;
  name: string;
  trackStock: boolean
}
interface ProductOptionValues {
  id: string;
  product_id: string;
  product_option_value_id: string;
}

const OptionDetailScreen = () => {
  useProtectedRoute();
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();

  // State for the option name and productOptionValues
  const [optionName, setOptionName] = useState("");
  const [productOption, setProductOption] = useState<ProductOption>();

  const fetchProductOption = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/product-option/${id}`);
      setProductOption(res.data);
      setEditName(res.data.name);
      if (res.data.track_stock === 0) {
        setTrackStock(false);
      } else {
        setTrackStock(true);
      }
    } catch (error) {
      console.error("Échec du chargement des options produit :", error);
    }
  };


  const fetchProductOptionValues = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/product-opt-values/${id}`);
      setProductOptionValues(res.data);
    } catch (error) {
      console.error("Échec du chargement des valeurs d'options produit :", error);
    }
  };


  useEffect(() => {
    fetchProductOption();
    fetchProductOptionValues();
  }, []);

  const [newValue, setNewValue] = useState("");

  const [productOptionValues, setProductOptionValues] = useState<ProductOptionValues[]>([]);
  // State for edit modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editName, setEditName] = useState("");

  const [trackStock, setTrackStock] = useState(true);
  const handleAddValue = async () => {
    if (newValue.trim() && productOption) {
      try {
        const res = await axios.post(`${getBaseUrl()}/api/product-option-value`, {
          value: newValue,
          product_option_id: productOption.id,
        });

        fetchProductOption();
        setNewValue("");
        fetchProductOptionValues();
      } catch (error) {
        console.error("Échec de l'ajout de la valeur d'option produit :", error);
        // Optionnellement afficher une alerte ou un toast ici
      }
    }
  };


  // Function to delete a value
  const handleDeleteValue = (valueToDelete: ProductOptionValues) => {
    
    Alert.alert(
      "Supprimer la valeur",
      `Êtes-vous sûr de vouloir supprimer cette valeur ?`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await axios.delete(
                `${getBaseUrl()}/api/product-option-value/${valueToDelete.id}`
              );
              fetchProductOptionValues();
            } catch (error: any) {
              console.error("Échec de la suppression de la valeur d'option produit :", error);

              if (error.response && error.response.data?.message) {
                Alert.alert("Suppression impossible", error.response.data.message);
              } else {
                Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
              }
            }
          },
        },
      ]
    );
  };



  // Function to update option name
  const handleUpdateOptionName = async () => {
    if (editName.trim()) {
      setOptionName(editName.trim());

      const res = await axios.put(`${getBaseUrl()}/api/product-option/${productOption?.id}`, { name: editName, trackStock: trackStock });
      setProductOption(res.data);

      Alert.alert("Succès", "Catégorie mise à jour avec succès !");
      setModalVisible(false);
    } else {
      Alert.alert("Nom invalide", "Le nom de l'option ne peut pas être vide.");
    }
  };


  // Function to delete the option
  const handleDeleteOption = () => {


    Alert.alert(
      "Supprimer l'option",
      `Êtes-vous sûr de vouloir supprimer l'option "${optionName}" ? Cette action est irréversible.`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          onPress: async () => {
            try {
              await axios.delete(`${getBaseUrl()}/api/product-option/${id}`);
              router.push("/settings");
            } catch (error) {
              console.error("Échec de la suppression de la valeur d'option produit :", error);

              // إذا backend رجع response
              if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                (error as any).response &&
                (error as any).response.data?.error
              ) {
                Alert.alert("Suppression impossible", (error as any).response.data.error);
              } else {
                Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
              }
            }
          },
          style: "destructive",
        },
      ]
    );

  };

  // Render each value item
  const renderItem = ({ item }) => (
    <View style={styles.valueItem}>
      <Text style={styles.valueText}>{item.value}</Text>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteValue(item)}>
        <Icon name="trash-2" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );
  const [isInputFocused, setIsInputFocused] = useState(true)
  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/settings")}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{productOption && productOption.name}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setModalVisible(true)}>
            <Icon name="edit-2" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDeleteOption}>
            <Icon name="trash-2" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Section de saisie */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Ajouter une nouvelle valeur de {optionName.toLowerCase()} :</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newValue}
              onChangeText={setNewValue}
              placeholder={`Entrez une valeur de ${optionName.toLowerCase()}`}
              returnKeyType="done"
              onSubmitEditing={handleAddValue}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddValue} disabled={!newValue.trim()}>
              <Icon name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Liste des valeurs */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>
            {productOptionValues.length > 0
              ? `${optionName} valeurs (${productOptionValues.length})`
              : `Aucune valeur de ${optionName.toLowerCase()} ajoutée pour le moment`}
          </Text>

          <FlatList
            data={productOptionValues}
            renderItem={renderItem}
            keyExtractor={(item) => item}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>Ajoutez votre première valeur de {optionName.toLowerCase()} ci-dessus</Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Modal d'édition du nom de l'option */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => !isInputFocused && Keyboard.dismiss()}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Modifier le nom de l’option</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de l’option</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Entrez le nom de l’option"
                  autoFocus
                />
              </View>

              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Gérer le stock</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.toggleButton, trackStock === true && styles.toggleButtonActive]}
                    onPress={() => setTrackStock(true)}
                  >
                    <Text style={[styles.toggleButtonText, trackStock === true && styles.toggleButtonTextActive]}>Oui</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleButton, trackStock === false && styles.toggleButtonActive]}
                    onPress={() => setTrackStock(false)}
                  >
                    <Text style={[styles.toggleButtonText, trackStock === false && styles.toggleButtonTextActive]}>Non</Text>
                  </TouchableOpacity>
                </View>
              </View> */}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setEditName(optionName);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleUpdateOptionName}>
                  <Text style={styles.saveButtonText}>Mettre à jour</Text>
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
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  listSection: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  valueItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  valueText: {
    fontSize: 16,
  },
  deleteButton: {
    padding: 8,
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

  toggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },

  toggleButtonActive: {
    backgroundColor: '#4CD964', // or any accent color
    borderColor: '#4CD964',
  },

  toggleButtonText: {
    color: '#333',
    fontWeight: '500',
  },

  toggleButtonTextActive: {
    color: '#fff',
  },
});

export default OptionDetailScreen;
