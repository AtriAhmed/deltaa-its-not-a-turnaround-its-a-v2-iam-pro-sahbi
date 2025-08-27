"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Icon from "react-native-vector-icons/Feather";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { getBaseUrl } from "@/utils/api";
import { useFocusEffect } from "@react-navigation/native";

interface CashTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  time: string;
}

const CaisseScreen = () => {
  useProtectedRoute();
  const router = useRouter();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [cashBalance, setCashBalance] = useState(0);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);

  // Modal states
  const [addTransactionModalVisible, setAddTransactionModalVisible] =
    useState(false);
  const [editTransactionModalVisible, setEditTransactionModalVisible] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<CashTransaction | null>(null);
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    "income"
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date());

  // Date filter states - Start with showing all dates
  const [showAllDates, setShowAllDates] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date());

  // Format date for display
  const formatDateForDisplay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return "Aujourd'hui";
    } else if (compareDate.getTime() === yesterday.getTime()) {
      return "Hier";
    } else if (compareDate.getTime() === tomorrow.getTime()) {
      return "Demain";
    } else {
      return date.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
  };

  // Convert date to string format for storage and comparison
  const dateToString = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  // Convert string to date object
  const stringToDate = (dateString: string) => {
    return new Date(dateString);
  };

  const [isLoading, setIsLoading] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${getBaseUrl()}/api/cash-transactions`);
      const fetchedTransactions = response.data;
      setTransactions(fetchedTransactions);
      calculateTotals(fetchedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // Calculate totals
  const calculateTotals = (transactionList: CashTransaction[]) => {
    const today = dateToString(new Date());

    let balance = 0;
    let todayInc = 0;
    let todayExp = 0;

    transactionList.forEach((transaction) => {
      const amount = Number(transaction.amount); // Ensure it's a number

      if (transaction.type === "income") {
        balance += amount;
        if (transaction.date === today) {
          todayInc += amount;
        }
      } else {
        balance -= amount;
        if (transaction.date === today) {
          todayExp += amount;
        }
      }
    });

    setCashBalance(balance);
    setTodayIncome(todayInc);
    setTodayExpenses(todayExp);
  };

  // Save data
  const saveData = async (transactionList: CashTransaction[]) => {
    try {
      await AsyncStorage.setItem(
        "cashTransactions",
        JSON.stringify(transactionList)
      );
    } catch (error) {
      console.error("Error saving cash data:", error);
    }
  };

  const saveDataToBackend = async (newTransaction: CashTransaction) => {
    try {
      const response = await axios.post(
        `${getBaseUrl()}/api/cash-transactions`,
        newTransaction
      );
      return response.data;
    } catch (error) {
      console.error("Error saving transaction:", error);
      throw error;
    }
  };

  const updateDataToBackend = async (updatedTransaction: CashTransaction) => {
    try {
      // force time format H:i:s
      let time = updatedTransaction.time;
      if (time && time.length === 5) {
        time = time + ":00"; // "12:36" → "12:36:00"
      }

      const payload = { ...updatedTransaction, time };

      const response = await axios.put(
        `${getBaseUrl()}/api/cash-transactions/${updatedTransaction.id}`,
        payload
      );
      return response.data;
    } catch (error) {
      console.error("Error updating transaction:", error);
      throw error;
    }
  };


  // Add transaction
  const addTransaction = async () => {
    if (!amount.trim() || !description.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const amountValue = Number.parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide.");
      return;
    }

    const newTransaction: CashTransaction = {
      id: "", // will be returned by backend
      type: transactionType,
      amount: amountValue,
      description: description.trim(),
      date: dateToString(transactionDate),
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };

    try {
      const savedTransaction = await saveDataToBackend(newTransaction);
      const updatedTransactions = [savedTransaction, ...transactions];
      setTransactions(updatedTransactions);
      calculateTotals(updatedTransactions);

      // Reset form
      setAmount("");
      setDescription("");
      setTransactionDate(new Date());
      setAddTransactionModalVisible(false);

      Alert.alert("Succès", "Transaction ajoutée avec succès!");
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue lors de l'ajout.");
    }
  };

  // Edit transaction
  const openEditModal = (transaction: CashTransaction) => {
    setEditingTransaction(transaction);
    setTransactionType(transaction.type);
    setAmount(transaction.amount.toString());
    setDescription(transaction.description);
    setTransactionDate(stringToDate(transaction.date));
    setEditTransactionModalVisible(true);
  };

  const updateTransaction = async () => {
    if (!editingTransaction) return;

    if (!amount.trim() || !description.trim()) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const amountValue = Number.parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide.");
      return;
    }

    const updatedTransaction: CashTransaction = {
      ...editingTransaction,
      type: transactionType,
      amount: amountValue,
      description: description.trim(),
      date: dateToString(transactionDate),
    };

    try {
      const savedTransaction = await updateDataToBackend(updatedTransaction);
      const updatedTransactions = transactions.map((t) =>
        t.id === editingTransaction.id ? savedTransaction : t
      );
      setTransactions(updatedTransactions);
      calculateTotals(updatedTransactions);

      // Reset form
      setAmount("");
      setDescription("");
      setTransactionDate(new Date());
      setEditingTransaction(null);
      setEditTransactionModalVisible(false);

      Alert.alert("Succès", "Transaction modifiée avec succès!");
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la modification.");
    }
  };

  // Delete transaction
  const deleteTransaction = async (transactionId: string) => {

    
    Alert.alert("Supprimer la transaction", "Etes-vous sûr?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.delete(
              `${getBaseUrl()}/api/cash-transactions/${transactionId}`
            );
            const updatedTransactions = transactions.filter(
              (t) => t.id !== transactionId
            );
            setTransactions(updatedTransactions);
            calculateTotals(updatedTransactions);
          } catch (error) {
            console.error("Error deleting transaction:", error);
          }
        },
      },
    ]);
  };

  // Filter states
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all"
  );

  // Filter transactions - Modified to show all dates by default
  const getFilteredTransactions = () => {
    return transactions.filter((transaction) => {
      const matchesType =
        filterType === "all" || transaction.type === filterType;
      const matchesDate =
        showAllDates || transaction.date === dateToString(filterDate);
      return matchesType && matchesDate;
    });
  };

  // Handle date filter change
  const handleDateFilterChange = (text: string) => {
    const newDate = new Date(text);
    if (!isNaN(newDate.getTime())) {
      setFilterDate(newDate);
      setShowAllDates(false); // Disable "show all" when a specific date is selected
    }
  };

  // Reset to show all dates
  const showAllTransactions = () => {
    setShowAllDates(true);
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const filteredTransactions = getFilteredTransactions();
  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
          />
        }
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caisse</Text>
          <TouchableOpacity onPress={() => setAddTransactionModalVisible(true)}>
            <Icon name="plus" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Résumé de la caisse */}
        <View style={styles.summaryContainer}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde de caisse</Text>
            <Text
              style={[
                styles.balanceAmount,
                { color: cashBalance >= 0 ? "#4CD964" : "#FF3B30" },
              ]}
            >
              {cashBalance.toLocaleString()} DT
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Icon name="trending-up" size={20} color="#4CD964" />
              <Text style={styles.summaryLabel}>Revenus du jour</Text>
              <Text style={styles.summaryAmount}>
                {todayIncome.toLocaleString()} DT
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="trending-down" size={20} color="#FF3B30" />
              <Text style={styles.summaryLabel}>Dépenses du jour</Text>
              <Text style={styles.summaryAmount}>
                {todayExpenses.toLocaleString()} DT
              </Text>
            </View>
          </View>
        </View>

        {/* Filtres */}
        <View style={styles.filtersContainer}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === "all" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("all")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "all" && styles.filterButtonTextActive,
                  ]}
                >
                  Tout
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === "income" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("income")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "income" && styles.filterButtonTextActive,
                  ]}
                >
                  Revenus
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === "expense" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("expense")}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "expense" && styles.filterButtonTextActive,
                  ]}
                >
                  Dépenses
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Date Filter */}
          <View style={styles.dateFilterContainer}>
            <View style={styles.dateFilterHeader}>
              <Text style={styles.inputLabel}>Filtrer par date</Text>
              <TouchableOpacity
                style={[
                  styles.showAllButton,
                  showAllDates && styles.showAllButtonActive,
                ]}
                onPress={showAllTransactions}
              >
                <Text
                  style={[
                    styles.showAllButtonText,
                    showAllDates && styles.showAllButtonTextActive,
                  ]}
                >
                  Toutes les dates
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[
                styles.dateInput,
                showAllDates && styles.dateInputDisabled,
              ]}
              value={showAllDates ? "" : filterDate.toISOString().split("T")[0]}
              onChangeText={handleDateFilterChange}
              placeholder="YYYY-MM-DD"
            // editable={!showAllDates}
            />
          </View>
        </View>

        {/* Liste des transactions */}
        <View style={styles.transactionsContainer}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionCount}>
              {filteredTransactions.length} transaction
              {filteredTransactions.length !== 1 ? "s" : ""}
              {showAllDates ? "" : ` pour ${formatDateForDisplay(filterDate)}`}
            </Text>
          </View>

          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={50} color="#ccc" />
              <Text style={styles.emptyStateText}>
                Aucune transaction trouvée
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {showAllDates
                  ? "Ajoutez votre première transaction pour commencer"
                  : `Aucune transaction pour ${formatDateForDisplay(
                    filterDate
                  )}`}
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          transaction.type === "income" ? "#4CD964" : "#FF3B30",
                      },
                    ]}
                  >
                    <Icon
                      name={
                        transaction.type === "income"
                          ? "arrow-down-left"
                          : "arrow-up-right"
                      }
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {formatDateForDisplay(stringToDate(transaction.date))}
                    </Text>
                    <Text style={styles.transactionTime}>
                      {transaction.time}
                    </Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          transaction.type === "income" ? "#4CD964" : "#FF3B30",
                      },
                    ]}
                  >
                    {transaction.type === "income" ? "+" : "-"}
                    {transaction.amount.toLocaleString()} DT
                  </Text>
                  <View style={styles.transactionActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openEditModal(transaction)}
                    >
                      <Icon name="edit-2" size={16} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteTransaction(transaction.id)}
                    >
                      <Icon name="trash-2" size={16} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal d'ajout de transaction */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addTransactionModalVisible}
        onRequestClose={() => setAddTransactionModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => !isInputFocused && Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Ajouter une transaction</Text>

                {/* Type de transaction */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === "income" && styles.typeButtonActive,
                    ]}
                    onPress={() => setTransactionType("income")}
                  >
                    <Icon
                      name="arrow-down-left"
                      size={16}
                      color={transactionType === "income" ? "#fff" : "#4CD964"}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === "income" &&
                        styles.typeButtonTextActive,
                      ]}
                    >
                      Revenu
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === "expense" && styles.typeButtonActive,
                    ]}
                    onPress={() => setTransactionType("expense")}
                  >
                    <Icon
                      name="arrow-up-right"
                      size={16}
                      color={transactionType === "expense" ? "#fff" : "#FF3B30"}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === "expense" &&
                        styles.typeButtonTextActive,
                      ]}
                    >
                      Dépense
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Montant */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Montant (DT)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Entrez une description"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                {/* Date */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionDate.toISOString().split("T")[0]}
                    onChangeText={(text) => {
                      const newDate = new Date(text);
                      if (!isNaN(newDate.getTime())) {
                        setTransactionDate(newDate);
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setAmount("");
                      setDescription("");
                      setTransactionDate(new Date());
                      setAddTransactionModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={addTransaction}
                  >
                    <Text style={styles.saveButtonText}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de modification de transaction */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editTransactionModalVisible}
        onRequestClose={() => setEditTransactionModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => !isInputFocused && Keyboard.dismiss()}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Modifier la transaction</Text>

                {/* Type de transaction */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === "income" && styles.typeButtonActive,
                    ]}
                    onPress={() => setTransactionType("income")}
                  >
                    <Icon
                      name="arrow-down-left"
                      size={16}
                      color={transactionType === "income" ? "#fff" : "#4CD964"}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === "income" &&
                        styles.typeButtonTextActive,
                      ]}
                    >
                      Revenu
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      transactionType === "expense" && styles.typeButtonActive,
                    ]}
                    onPress={() => setTransactionType("expense")}
                  >
                    <Icon
                      name="arrow-up-right"
                      size={16}
                      color={transactionType === "expense" ? "#fff" : "#FF3B30"}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        transactionType === "expense" &&
                        styles.typeButtonTextActive,
                      ]}
                    >
                      Dépense
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Montant */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Montant (DT)</Text>
                  <TextInput
                    style={styles.input}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                {/* Description */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={styles.input}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Entrez une description"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                {/* Date */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionDate.toISOString().split("T")[0]}
                    onChangeText={(text) => {
                      const newDate = new Date(text);
                      if (!isNaN(newDate.getTime())) {
                        setTransactionDate(newDate);
                      }
                    }}
                    placeholder="YYYY-MM-DD"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setAmount("");
                      setDescription("");
                      setTransactionDate(new Date());
                      setEditingTransaction(null);
                      setEditTransactionModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={updateTransaction}
                  >
                    <Text style={styles.saveButtonText}>Modifier</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  balanceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "bold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  dateFilterContainer: {
    marginBottom: 8,
  },
  dateFilterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  showAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  showAllButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  showAllButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  showAllButtonTextActive: {
    color: "#fff",
  },
  transactionsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  transactionHeader: {
    marginBottom: 12,
  },
  transactionCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  transactionTime: {
    fontSize: 12,
    color: "#999",
  },
  transactionRight: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  editButton: {
    padding: 4,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  typeSelector: {
    flexDirection: "row",
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginHorizontal: 4,
  },
  typeButtonActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  typeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#666",
  },
  typeButtonTextActive: {
    color: "#fff",
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
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
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
  dateInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  dateInputDisabled: {
    backgroundColor: "#f5f5f5",
    color: "#999",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center", // or 'flex-start' if you want the form to stick to top
    padding: 20,
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

export default CaisseScreen;
