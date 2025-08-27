"use client";

import { useProtectedRoute } from "../../../../hooks/useProtectedRoute";
import axios from "axios";
import { Stack, useRouter } from "expo-router";
import { getBaseUrl } from "@/utils/api";
import { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Modal, TouchableWithoutFeedback,   Alert, } from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { SafeAreaView } from "react-native-safe-area-context";

// Client type definition
interface Client {
  id: string;
  name: string;
  telephone: string;
  address: string;
  email: string;
  city: string;
}

const ClientScreen = () => {
  useProtectedRoute();
  const router = useRouter();
  // Sample clients data
  const [clients, setClients] = useState<Client[]>([]);

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/clients`);
      setClients(res.data);
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  };
  useEffect(() => {
    fetchClients();
  }, []);

  // State for search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<TextInput>(null);

  // State for delete confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  // Function to filter clients
  const getFilteredClients = () => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        (client.name && client.name.toLowerCase().includes(query)) ||
        (client.email && client.email.toLowerCase().includes(query)) ||
        (client.telephone && client.telephone.includes(query)) ||
        (client.city && client.city.toLowerCase().includes(query)) ||
        (client.address && client.address.toLowerCase().includes(query))
    );
  };

  // Function to confirm client deletion
  const confirmDeleteClient = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteConfirmModal(true);
  };

  // Function to delete a client
  const deleteClient = async () => {



    if (clientToDelete !== null) {
      try {
        await axios.delete(`${getBaseUrl()}/api/clients/${clientToDelete}`);
        setClients(clients.filter((client) => client.id !== clientToDelete));
        Alert.alert("Succès", "Client supprimée avec succès !");
        setClients(clients.filter((client) => client.id !== clientToDelete));
        setDeleteConfirmModal(false);
        setClientToDelete(null);
      } catch (error: any) {
        console.error("Erreur lors de la suppression du client:", error);

        if (error.response && error.response.data?.message) {
          Alert.alert("Suppression impossible", error.response.data.message);
        } else {
          Alert.alert("Erreur", "Une erreur est survenue lors de la suppression.");
        }
      }
    }
  };

  // Render each client item
  const renderClientItem = ({ item }: { item: Client }) => (
    <View style={styles.clientItem}>
      <View style={styles.clientHeader}>
        <Text style={styles.clientName}>{item.name}</Text>
        <View style={styles.clientActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/settings/clients/edit/${item.id}`)}>
            <Icon name="edit-2" size={18} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => confirmDeleteClient(item.id)}>
            <Icon name="trash-2" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.clientDetails}>
        <View style={styles.detailRow}>
          <Icon name="phone" size={16} color="#666" style={styles.detailIcon} />
          <Text style={styles.detailText}>{item.telephone}</Text>
        </View>

        {item.email && (
          <View style={styles.detailRow}>
            <Icon name="mail" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.email}</Text>
          </View>
        )}
        {item.address && (
          <View style={styles.detailRow}>
            <Icon name="map-pin" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.address}</Text>
          </View>
        )}
        {item.city && (
          <View style={styles.detailRow}>
            <Icon name="home" size={16} color="#666" style={styles.detailIcon} />
            <Text style={styles.detailText}>{item.city}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const filteredClients = getFilteredClients();

  return (
    <SafeAreaView style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        {showSearch ? (
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#999" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Rechercher des clients..."
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.push("/settings/")}>
              <Icon name="arrow-left" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Clients</Text>
            <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearch(true)}>
              <Icon name="search" size={22} color="#007AFF" />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {/* Liste des clients */}
        <FlatList
          data={filteredClients}
          renderItem={renderClientItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Text style={styles.emptyText}>
                {searchQuery ? "Aucun client ne correspond à votre recherche" : "Aucun client ajouté pour le moment"}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.emptyButton} onPress={() => router.push("/settings/clients/add/")}>
                  <Text style={styles.emptyButtonText}>Ajouter votre premier client</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Bouton Ajouter un client */}
        <TouchableOpacity style={styles.addButton} onPress={() => router.push("/settings/clients/add/")}>
          <Icon name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Modal de confirmation de suppression */}
      <Modal visible={deleteConfirmModal} transparent animationType="fade" onRequestClose={() => setDeleteConfirmModal(false)}>
        <TouchableWithoutFeedback onPress={() => setDeleteConfirmModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModal}>
                <Icon name="alert-triangle" size={40} color="#FF3B30" style={styles.deleteIcon} />
                <Text style={styles.deleteTitle}>Supprimer le client</Text>
                <Text style={styles.deleteMessage}>Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.</Text>
                <View style={styles.deleteActions}>
                  <TouchableOpacity style={styles.deleteCancelButton} onPress={() => setDeleteConfirmModal(false)}>
                    <Text style={styles.deleteCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteConfirmButton} onPress={deleteClient}>
                    <Text style={styles.deleteConfirmText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
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
  searchButton: {
    padding: 4,
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
  clientItem: {
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
  clientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  clientName: {
    fontSize: 18,
    fontWeight: "600",
  },
  clientActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  clientDetails: {
    padding: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#333",
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
});

export default ClientScreen;
