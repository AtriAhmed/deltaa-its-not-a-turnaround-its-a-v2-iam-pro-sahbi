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
import ConfirmDeleteModal from "../../../..//components/ConfirmDeleteMoal";
import { useProtectedRoute } from "../../../..//hooks/useProtectedRoute";
import { SafeAreaView } from "react-native-safe-area-context";

// DeliveryCompany type definition
interface DeliveryCompany {
  id: string;
  name: string;
}

const DeliveryCompanyScreen = () => {
  useProtectedRoute();
  // State for deliveryCompanies
  const [deliveryCompanies, setDeliveryCompanies] = useState<DeliveryCompany[]>([]);
  const [deliveryCompanyToDelete, setDeliveryCompanyToDelete] = useState<DeliveryCompany | null>(null);

  const fetchDeliveryCompanies = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/delivery-companies`);
      setDeliveryCompanies(res.data);
    } catch (error) {
      console.error("Échec du chargement des sociétés de livraison :", error);
    }
  };

  useEffect(() => {
    fetchDeliveryCompanies();
  }, []);

  // State for add/edit modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeliveryCompany, setCurrentDeliveryCompany] = useState<DeliveryCompany>({ id: "", name: "" });

  const [errors, setErrors] = useState<string>("");
  // Function to add or update a deliveryCompany
  const saveDeliveryCompany = async () => {
    if (!currentDeliveryCompany.name.trim()) {
      setErrors("Le nom de la société de livraison ne peut pas être vide.");
      return;
    }

    // Vérifier le nom en double (exclure la société en cours d'édition)
    const isDuplicate = deliveryCompanies.some(
      (deliveryCompany) =>
        deliveryCompany.name.toLowerCase() === currentDeliveryCompany.name.trim().toLowerCase() &&
        (!isEditing || deliveryCompany.id !== currentDeliveryCompany.id)
    );

    if (isDuplicate) {
      setErrors(`Une société de livraison portant le nom "${currentDeliveryCompany.name.trim()}" existe déjà.`);
      return;
    }

    if (isEditing) {
      // Mettre à jour la société de livraison existante
      const res = await axios.put(`${getBaseUrl()}/api/delivery-companies/${currentDeliveryCompany.id}`, { name: currentDeliveryCompany.name });
      setDeliveryCompanies((prev) => prev.map((b) => (b.id === currentDeliveryCompany.id ? res.data : b)));
      Alert.alert("Succès", "Société de livraison mise à jour avec succès !");
    } else {
      const res = await axios.post(`${getBaseUrl()}/api/delivery-companies`, { name: currentDeliveryCompany.name });
      setDeliveryCompanies([...deliveryCompanies, res.data]);
    }

    closeModal();
  };


  // Function to delete a deliveryCompany
  const deleteDeliveryCompany = async () => {
    if (deliveryCompanyToDelete !== null) {
      await axios.delete(`${getBaseUrl()}/api/delivery-companies/${deliveryCompanyToDelete.id}`);
      setDeliveryCompanies(deliveryCompanies.filter((deliveryCompany) => deliveryCompany.id !== deliveryCompanyToDelete.id));
      Alert.alert("Success", "DeliveryCompany deleted successfully!");
      setDeleteModalVisible(false);
      // Alert.alert("Delete DeliveryCompany", "Are you sure you want to delete this deliveryCompany? This action cannot be undone.", [
      //     {
      //         text: "Cancel",
      //         style: "cancel",
      //     },
      //     {
      //         text: "Delete",
      //         onPress: async () => {

      //             try {
      //                 await axios.delete(`https://delta-back.ahmedatri.com/api/delivery-companies/${deliveryCompanyToDelete.id}`);
      //                 setDeliveryCompanies(deliveryCompanies.filter((deliveryCompany) => deliveryCompany.id !== deliveryCompanyToDelete.id))
      //                 Alert.alert('Success', 'DeliveryCompany deleted successfully!');
      //             } catch (error) {
      //                 console.error('Error deleting deliveryCompany:', error);
      //             }
      //         },
      //         style: "destructive",
      //     },
      // ])
    }
  };

  // Function to open modal for adding a new deliveryCompany
  const addDeliveryCompany = () => {
    setErrors("");
    setIsEditing(false);
    setCurrentDeliveryCompany({ id: "", name: "" });
    setModalVisible(true);
  };

  // Function to open modal for editing a deliveryCompany
  const editDeliveryCompany = (deliveryCompany: DeliveryCompany) => {
    setErrors("");
    setIsEditing(true);
    setCurrentDeliveryCompany({ ...deliveryCompany });
    setModalVisible(true);
  };

  // Function to close modal and reset state
  const closeModal = () => {
    setModalVisible(false);
    setIsEditing(false);
    setCurrentDeliveryCompany({ id: "", name: "" });
  };

  // Render each deliveryCompany item
  const renderDeliveryCompanyItem = ({ item }: { item: DeliveryCompany }) => (
    <View style={styles.deliveryCompanyItem}>
      <View style={styles.deliveryCompanyInfo}>
        <Text style={styles.deliveryCompanyName}>{item.name}</Text>
      </View>
      <View style={styles.deliveryCompanyActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => editDeliveryCompany(item)}>
          <Icon name="edit-2" size={18} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setDeleteModalVisible(true);
            setDeliveryCompanyToDelete(item);
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
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/settings")}>
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Sociétés de Livraison</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {/* Liste des sociétés de livraison */}
        <FlatList
          data={deliveryCompanies}
          renderItem={renderDeliveryCompanyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>Aucune société de livraison ajoutée pour le moment</Text>
            </View>
          }
        />

        {/* Bouton Ajouter une société de livraison */}
        <TouchableOpacity style={styles.addButton} onPress={addDeliveryCompany}>
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ConfirmDeleteModal
        deleteConfirmModal={deleteModalVisible}
        setDeleteConfirmModal={setDeleteModalVisible}
        confirmAction={deleteDeliveryCompany}
        modalTitle="Supprimer la société de livraison"
        modalText={
          <Text>
            Êtes-vous sûr de vouloir supprimer la société de livraison <Text style={{ fontWeight: "bold" }}>{deliveryCompanyToDelete?.name}</Text> ? Cette action est irréversible.
          </Text>
        }
      />

      {/* Modal Ajouter/Modifier société de livraison */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <TouchableWithoutFeedback onPress={() => !isInputFocused && Keyboard.dismiss()}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{isEditing ? "Modifier la société de livraison" : "Ajouter une société de livraison"}</Text>

              {/* Input nom société de livraison */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de la société de livraison</Text>
                <TextInput
                  style={styles.input}
                  value={currentDeliveryCompany.name}
                  onChangeText={(text) => setCurrentDeliveryCompany({ ...currentDeliveryCompany, name: text })}
                  placeholder="Entrez le nom de la société de livraison"
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                />
              </View>
              {errors && <Text style={styles.error}>{errors}</Text>}
              {/* Boutons modal */}
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={saveDeliveryCompany}>
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
  deliveryCompanyItem: {
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
  deliveryCompanyInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  deliveryCompanyName: {
    fontSize: 16,
    fontWeight: "500",
  },
  deliveryCompanyActions: {
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

export default DeliveryCompanyScreen;
