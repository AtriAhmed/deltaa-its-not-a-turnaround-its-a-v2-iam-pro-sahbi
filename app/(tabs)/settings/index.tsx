"use client";

import { getBaseUrl } from "@/utils/api";
import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/Feather";
import { useProtectedRoute } from "../../../hooks/useProtectedRoute";
import { useAuthContext } from "../../../contexts/AuthProvider";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { red } from "react-native-reanimated/lib/typescript/Colors";

interface ProductOption {
  id: string;
  name: string;
  track_stock: string
}

const SettingsScreen = () => {
  useProtectedRoute();
  const { user, setUser } = useAuthContext();
  const router = useRouter();

  // State for product options
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);

  // State for profit division settings
  const [investmentPercentage, setInvestmentPercentage] = useState("20");
  const [partnersPercentage, setPartnersPercentage] = useState("80");
  const [profitDivisionModalVisible, setProfitDivisionModalVisible] = useState(false);

  const fetchProductOptions = async () => {
    try {
      const res = await axios.get(`${getBaseUrl()}/api/product-option`);
      setProductOptions(res.data);
      console.log(res.data)
    } catch (error) {
      console.error("Échec du chargement des catégories :", error);

    }
  };

  const loadProfitDivisionSettings = async () => {
    try {
      const response = await axios.get(`${getBaseUrl()}/api/profit-settings`);
      const { investment_percentage, partner_percentage } = response.data;

      setInvestmentPercentage(investment_percentage);
      setPartnersPercentage(partner_percentage);

      console.log(partnersPercentage);
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres de répartition des bénéfices :", error);
      setInvestmentPercentage("20");
      setPartnersPercentage("80");
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {


    try {
      setIsLoading(true);
      fetchProductOptions();
      loadProfitDivisionSettings();
    } catch (error) {
      console.error('Error :', error)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProductOptions();
      loadProfitDivisionSettings();
    }, [])
  );

  // State for add modal
  const [modalVisible, setModalVisible] = useState(false);
  const [optionName, setOptionName] = useState("");

  const [trackStock, setTrackStock] = useState(true);


  const handleAddOption = async () => {
    if (optionName.trim()) {

      if (productOptions.some((option) => option.name.toLowerCase() === optionName.trim().toLowerCase())) {
        Alert.alert("Option dupliquée", `"${optionName.trim()}" existe déjà.`);
        return;
      }

      const res = await axios.post(`${getBaseUrl()}/api/product-option`, { name: optionName.trim(), trackStock: trackStock });
      setProductOptions([...productOptions, res.data]);


      setOptionName("");
      setModalVisible(false);
    }
  };


  const saveProfitDivisionSettings = async () => {
    try {
      const investmentPct = Number(investmentPercentage);
      const partnersPct = Number(partnersPercentage);

      if (isNaN(investmentPct)) {
        Alert.alert("Entrée invalide", "Le pourcentage d'investissement doit être un nombre valide");
        return;
      }

      if (isNaN(partnersPct)) {
        Alert.alert("Entrée invalide", "Le pourcentage des partenaires doit être un nombre valide");
        return;
      }

      if (investmentPct + partnersPct !== 100) {
        Alert.alert("Pourcentages invalides", "La somme des pourcentages d'investissement et de partenaires doit être égale à 100%");
        return;
      }

      const response = await axios.put(`${getBaseUrl()}/api/profit-settings`, {
        investment_percentage: investmentPct,
        partner_percentage: partnersPct,
      });

      Alert.alert("Succès", "Paramètres de répartition des bénéfices mis à jour avec succès");
      setProfitDivisionModalVisible(false);

      await loadProfitDivisionSettings();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres de répartition des bénéfices :", error);

      Alert.alert("Erreur", "Échec de la sauvegarde des paramètres de répartition des bénéfices");
    }
  };


  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      setUser(null);
      router.replace("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion :", error);
      Alert.alert("Erreur de déconnexion", "Un problème est survenu lors de la déconnexion. Veuillez réessayer.");
    }
  };

  const [isInputFocused, setIsInputFocused] = useState(true)

  if (isLoading) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Veuillez patienter...</Text>
      </View>
    )
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header section */}
        <View style={styles.header}>
          <Text style={styles.title}>{user?.name}</Text>
          <Text style={styles.subtitle}>Your Account → {user?.name}</Text>
        </View>

        <View style={styles.separator} />

        {/* Content section */}
        <View style={styles.content}>
          {/* Profit Division Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Répartition des bénéfices</Text>

            <View style={styles.card}>
              <View style={styles.profitDivisionSummary}>
                <View style={styles.profitDivisionItem}>
                  <Text style={styles.profitDivisionLabel}>Investissement</Text>
                  <Text style={styles.profitDivisionValue}>{investmentPercentage}%</Text>
                </View>
                <View style={styles.profitDivisionItem}>
                  <Text style={styles.profitDivisionLabel}>Partenaires</Text>
                  <Text style={styles.profitDivisionValue}>{partnersPercentage}%</Text>
                </View>
              </View>

              <View style={styles.percentageBar}>
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${Number(investmentPercentage) || 0}%`,
                      backgroundColor: "#FFD700",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${Number(partnersPercentage) || 0}%`,
                      backgroundColor: "#FF9500",
                    },
                  ]}
                />
              </View>

              <TouchableOpacity style={styles.button} onPress={() => setProfitDivisionModalVisible(true)}>
                <Icon name="edit-2" size={16} color="#fff" />
                <Text style={styles.buttonText}>Modifier la répartition des bénéfices</Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Product options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options de produit</Text>

            <View style={styles.card}>
              {productOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.item}
                  onPress={() => router.push(`/settings/product-option/${option.id}`)}
                >
                  <View style={styles.itemLeft}>
                    <Icon name="package" size={20} color="#666" />
                    <View style={styles.productOptionInformation}>
                      <Text style={styles.itemText}>{option.name}</Text>
                      {/* <View style={styles.trackStock}>
                        <Text style={styles.trackStockLabel}>Suivi du stock:</Text>
                        <Text>{option.track_stock == '1' ? 'oui' : 'non'}</Text>
                      </View> */}
                    </View>
                  </View>
                  <Icon name="chevron-right" size={16} color="#666" />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                <Icon name="plus" size={16} color="#fff" />
                <Text style={styles.buttonText}>Ajouter une option de produit</Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Brand section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Panneau de gestion</Text>

            <View style={styles.card}>
              <TouchableOpacity style={styles.item} onPress={() => router.push("/settings/brand")}>
                <View style={styles.itemLeft}>
                  <Icon name="briefcase" size={20} color="#666" />
                  <Text style={styles.itemText}>Gérer les marques</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => router.push("/settings/category")}>
                <View style={styles.itemLeft}>
                  <Icon name="folder" size={20} color="#666" />
                  <Text style={styles.itemText}>Gérer les catégories</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => router.push("/settings/clients")}>
                <View style={styles.itemLeft}>
                  <Icon name="user" size={20} color="#666" />
                  <Text style={styles.itemText}>Gérer les clients</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={() => router.push("/settings/delivery-company")}>
                <View style={styles.itemLeft}>
                  <Icon name="truck" size={20} color="#666" />
                  <Text style={styles.itemText}>Gérer les sociétés de livraison</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>


          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compte</Text>

            <View style={styles.card}>
              <TouchableOpacity style={styles.item} onPress={() => router.push("/settings/category")}>
                <View style={styles.itemLeft}>
                  <Icon name="user" size={20} color="#666" />
                  <Text style={styles.itemText}>Modifier le profil</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.item} onPress={handleLogout}>
                <View style={styles.itemLeft}>
                  <Icon name="log-out" size={20} color="#666" />
                  <Text style={styles.itemText}>Déconnexion</Text>
                </View>
                <Icon name="chevron-right" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>


      {/* Add Product Option Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => !isInputFocused && Keyboard.dismiss()}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Ajouter une Option de Produit</Text>

              {/* Nom de l'option */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nom de l'option</Text>
                <TextInput
                  style={styles.input}
                  value={optionName}
                  onChangeText={setOptionName}
                  placeholder="Entrez le nom de l'option"
                  autoFocus
                />
              </View>

              {/* Suivi du stock */}
              {/* <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Suivi du stock</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      trackStock === true && styles.toggleButtonActive,
                    ]}
                    onPress={() => setTrackStock(true)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        trackStock === true && styles.toggleButtonTextActive,
                      ]}
                    >
                      Oui
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      trackStock === false && styles.toggleButtonActive,
                    ]}
                    onPress={() => setTrackStock(false)}
                  >
                    <Text
                      style={[
                        styles.toggleButtonText,
                        trackStock === false && styles.toggleButtonTextActive,
                      ]}
                    >
                      Non
                    </Text>
                  </TouchableOpacity>
                </View>
              </View> */}

              {/* Boutons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setOptionName("");
                    setTrackStock(true);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleAddOption}>
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>


      {/* Profit Division Modal */}
      <Modal animationType="slide" transparent={true} visible={profitDivisionModalVisible} onRequestClose={() => setProfitDivisionModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier la Répartition des Profits</Text>
            <Text style={styles.modalSubtitle}>Définissez comment les profits sont répartis entre l'investissement et les partenaires. Le total doit être égal à 100%.</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Investissement (%)</Text>
              <TextInput
                style={styles.input}
                value={investmentPercentage}
                onChangeText={setInvestmentPercentage}
                maxLength={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Partenaires (%)</Text>
              <TextInput
                style={styles.input}
                value={partnersPercentage}
                onChangeText={setPartnersPercentage}
                placeholder="80"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>

            <View style={styles.percentageBarContainer}>
              <View style={styles.percentageBar}>
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${Number(investmentPercentage) || 0}%`,
                      backgroundColor: "#FFD700",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.percentageFill,
                    {
                      width: `${Number(partnersPercentage) || 0}%`,
                      backgroundColor: "#FF9500",
                    },
                  ]}
                />
              </View>
              <View style={styles.percentageLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#FFD700" }]} />
                  <Text style={styles.legendText}>Investissement</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: "#FF9500" }]} />
                  <Text style={styles.legendText}>Partenaires</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  loadProfitDivisionSettings(); // Réinitialiser aux valeurs sauvegardées
                  setProfitDivisionModalVisible(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveProfitDivisionSettings}
              >
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 16,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemText: {
    marginLeft: 12,
    fontSize: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 8,
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
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
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

  // Profit Division styles
  profitDivisionSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  profitDivisionItem: {
    alignItems: "center",
  },
  profitDivisionLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  profitDivisionValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  percentageBar: {
    height: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 16,
  },
  percentageFill: {
    height: "100%",
  },
  percentageBarContainer: {
    marginBottom: 20,
  },
  percentageLegend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 14,
    color: "#666",
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
  productOptionInformation: {
    flexDirection: 'column',

  },
  trackStock: {
    flexDirection: "row",
    marginLeft: 12,
    fontSize: 16,
  },
  trackStockLabel: {
    color: 'red',
    marginRight: 5,
    fontWeight: "bold",
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

export default SettingsScreen;
