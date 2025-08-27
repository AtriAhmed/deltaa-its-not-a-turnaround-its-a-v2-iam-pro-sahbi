"use client";

import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/Feather";

const OptionDetailScreen = ({ route, navigation }) => {
  // Get the option name from navigation params
  const { optionName } = route.params;

  // State for the new value input and list of values
  const [newValue, setNewValue] = useState("");
  const [values, setValues] = useState([]);

  // Function to add a new value
  const handleAddValue = () => {
    if (newValue.trim()) {
      // Check if value already exists
      if (values.includes(newValue.trim())) {
        Alert.alert("Duplicate Value", `"${newValue.trim()}" already exists.`);
        return;
      }

      // Add the new value to the list
      setValues([...values, newValue.trim()]);
      setNewValue(""); // Clear the input
    }
  };

  // Function to delete a value
  const handleDeleteValue = (valueToDelete) => {
    Alert.alert(
      "Delete Value",
      `Are you sure you want to delete "${valueToDelete}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => {
            setValues(values.filter((value) => value !== valueToDelete));
          },
          style: "destructive",
        },
      ]
    );
  };

  // Render each value item
  const renderItem = ({ item }) => (
    <View style={styles.valueItem}>
      <Text style={styles.valueText}>{item}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteValue(item)}
      >
        <Icon name="trash-2" size={18} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>{optionName}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Input section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Add a new {optionName.toLowerCase()} value:
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={newValue}
              onChangeText={setNewValue}
              placeholder={`Enter a ${optionName.toLowerCase()} value`}
              returnKeyType="done"
              onSubmitEditing={handleAddValue}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddValue}
              disabled={!newValue.trim()}
            >
              <Icon name="plus" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Values list */}
        <View style={styles.listSection}>
          <Text style={styles.listTitle}>
            {values.length > 0
              ? `${optionName} Values (${values.length})`
              : `No ${optionName.toLowerCase()} values added yet`}
          </Text>

          <FlatList
            data={values}
            renderItem={renderItem}
            keyExtractor={(item) => item}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>
                  Add your first {optionName.toLowerCase()} value above
                </Text>
              </View>
            }
          />
        </View>
      </View>
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
});

export default OptionDetailScreen;
